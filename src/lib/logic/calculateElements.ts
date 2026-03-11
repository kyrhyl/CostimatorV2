/**
 * STRUCTURAL ELEMENTS CALCULATION SERVICE
 * Generates takeoff lines for structural elements (beams, columns, slabs, foundations)
 * Processes element instances and generates concrete, rebar, and formwork quantities
 */

import type {
  IElementInstance,
  IElementTemplate,
  ILevel,
  IGridLine,
  IProjectSettings,
} from '@/models/Project';
import type { TakeoffLine, Trade } from '@/types';
import {
  calculateBeamConcrete,
  calculateSlabConcrete,
  calculateColumnConcrete,
  type ConcreteOutput,
} from '@/lib/math/concrete';
import {
  calculateBeamFormwork,
  calculateSlabFormwork,
  calculateRectangularColumnFormwork,
  calculateCircularColumnFormwork,
  type FormworkOutput,
} from '@/lib/math/formwork';
import {
  calculateBeamMainBars,
  calculateBeamStirrupsWeight,
  calculateSlabMainBars,
  calculateColumnMainBars,
  calculateColumnTiesWeight,
  getDPWHRebarItem,
  getRebarGrade,
} from '@/lib/math/rebar';
// Note: uuidv4 removed - using predictable IDs instead

export interface ElementsCalculationInput {
  elementInstances: IElementInstance[];
  elementTemplates: IElementTemplate[];
  levels: ILevel[];
  gridX: IGridLine[];
  gridY: IGridLine[];
  settings?: IProjectSettings;
}

export interface ElementsCalculationResult {
  takeoffLines: TakeoffLine[];
  errors: string[];
  summary: {
    totalConcreteVolume: number;
    totalRebarWeight: number;
    totalFormworkArea: number;
    elementCount: number;
    beamCount: number;
    columnCount: number;
    slabCount: number;
    foundationCount: number;
  };
}

/**
 * Main calculation function for structural elements
 */
export function calculateStructuralElements(
  input: ElementsCalculationInput
): ElementsCalculationResult {
  const {
    elementInstances,
    elementTemplates,
    levels,
    gridX,
    gridY,
    settings,
  } = input;

  const takeoffLines: TakeoffLine[] = [];
  const errors: string[] = [];

  let totalConcreteVolume = 0;
  let totalRebarWeight = 0;
  let totalFormworkArea = 0;
  let beamCount = 0;
  let columnCount = 0;
  let slabCount = 0;
  let foundationCount = 0;

  // Helper: Get template by ID
  const getTemplate = (templateId: string): IElementTemplate | null => {
    return elementTemplates.find((t) => t.id === templateId) || null;
  };

  // Helper: Get level by ID
  const getLevel = (levelId: string): ILevel | null => {
    return levels.find((l) => l.label === levelId) || null;
  };

  // Helper: Get next level above
  const getNextLevel = (currentLabel: string): ILevel | null => {
    const currentLevel = getLevel(currentLabel);
    if (!currentLevel) return null;
    
    const sortedLevels = [...levels].sort((a, b) => a.elevation - b.elevation);
    const currentIndex = sortedLevels.findIndex((l) => l.label === currentLabel);
    
    return currentIndex >= 0 && currentIndex < sortedLevels.length - 1
      ? sortedLevels[currentIndex + 1]
      : null;
  };

  // Helper: Get grid offset by label
  const getGridOffset = (label: string, axis: 'x' | 'y'): number | null => {
    const grid = axis === 'x' ? gridX : gridY;
    const gridLine = grid.find((g) => g.label === label);
    return gridLine ? gridLine.offset : null;
  };

  // Helper: Try to calculate beam length from grid references
  // Grid ref format: ["A-C", "1"] means span from A to C on X-axis, at Y-grid 1
  //                  ["A", "1-3"] means span from 1 to 3 on Y-axis, at X-grid A
  const calculateBeamLength = (gridRef: string[] | undefined): number | null => {
    if (!gridRef || gridRef.length < 2) return null;
    
    const [ref1, ref2] = gridRef;
    let length = 0;
    
    // Check if ref1 contains a span (has hyphen)
    if (ref1.includes('-')) {
      // Span along X-axis (e.g., "A-C")
      const [start, end] = ref1.split('-');
      const x1 = getGridOffset(start, 'x');
      const x2 = getGridOffset(end, 'x');
      if (x1 !== null && x2 !== null) {
        length = Math.abs(x2 - x1);
      }
    } else if (ref2.includes('-')) {
      // Span along Y-axis (e.g., "1-3")
      const [start, end] = ref2.split('-');
      const y1 = getGridOffset(start, 'y');
      const y2 = getGridOffset(end, 'y');
      if (y1 !== null && y2 !== null) {
        length = Math.abs(y2 - y1);
      }
    }
    
    return length > 0 ? length : null;
  };

  // Helper: Safely get property value from template properties (which might be a Map or plain object)
  const getProp = (props: IElementTemplate['properties'], key: string, defaultValue: number): number => {
    if (typeof props.get === 'function') {
      return (props.get(key) as number) || defaultValue;
    }
    return (props as any)[key] || defaultValue;
  };

  // Helper: Round quantity to specified decimal places
  function roundQuantity(value: number, decimals: number): number {
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
  }

  const withDpwhTag = (tags: string[], dpwhItem?: string) =>
    dpwhItem ? [...tags, `dpwh:${dpwhItem}`] : tags;

  // Process each element instance
  for (const instance of elementInstances) {
    try {
      const template = getTemplate(instance.templateId);
      if (!template) {
        errors.push(
          `Template not found for instance ${instance.id}: ${instance.templateId}`
        );
        continue;
      }

      const level = getLevel(instance.placement.levelId);
      if (!level) {
        errors.push(
          `Level not found for instance ${instance.id}: ${instance.placement.levelId}`
        );
        continue;
      }

      // Calculate based on element type
      switch (template.type) {
        case 'beam':
          processBeam(instance, template, level);
          beamCount++;
          break;
        case 'column':
          processColumn(instance, template, level);
          columnCount++;
          break;
        case 'slab':
          processSlab(instance, template, level);
          slabCount++;
          break;
        case 'foundation':
          processFoundation(instance, template, level);
          foundationCount++;
          break;
        default:
          errors.push(
            `Unknown element type: ${template.type} for instance ${instance.id}`
          );
      }
    } catch (err) {
      errors.push(
        `Error processing instance ${instance.id}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return {
    takeoffLines,
    errors,
    summary: {
      totalConcreteVolume,
      totalRebarWeight,
      totalFormworkArea,
      elementCount: elementInstances.length,
      beamCount,
      columnCount,
      slabCount,
      foundationCount,
    },
  };

  // ===================================
  // BEAM PROCESSING
  // ===================================
  function processBeam(
    instance: IElementInstance,
    template: IElementTemplate,
    level: ILevel
  ) {
    const props = template.properties;
    const custom = instance.placement.customGeometry;

    // Get dimensions - Use helper for safe property access
    const width = getProp(props, 'width', 0.3);
    const height = getProp(props, 'height', 0.5);

    // Calculate length from grid reference or custom/template properties
    let length: number | undefined;
    
    // Try custom geometry first
    if (custom?.get) {
      length = custom.get('length') as number | undefined;
    }
    
    // Try template properties if not in custom
    if (!length) {
      const propLength = getProp(props, 'length', 0);
      if (propLength > 0) length = propLength;
    }
    
    // Calculate from grid reference if still undefined
    if (!length && instance.placement.gridRef) {
      const gridLength = calculateBeamLength(instance.placement.gridRef);
      if (gridLength) length = gridLength;
    }
    
    if (!length) {
      const gridRefInfo = instance.placement.gridRef 
        ? `[${instance.placement.gridRef.join(', ')}]`
        : 'none';
      const availableGridX = gridX.map(g => g.label).join(', ');
      const availableGridY = gridY.map(g => g.label).join(', ');
      
      errors.push(
        `Beam ${instance.id} (Template: ${template.name}): Cannot determine length. ` +
        `Grid ref: ${gridRefInfo}. ` +
        `Available X-grid: [${availableGridX}]. ` +
        `Available Y-grid: [${availableGridY}]. ` +
        `Suggestion: Add 'length' property to template or provide valid grid references.`
      );
      return;
    }

    const wasteSettings = settings?.waste || {};
    const roundingSettings = settings?.rounding || {};
    const concreteWaste = wasteSettings.concrete || 0.05;
    const rebarWaste = wasteSettings.rebar || 0.03;
    const formworkWaste = wasteSettings.formwork || 0.02;

    // Generate tags
    const tags = [
      `type:beam`,
      `level:${level.label}`,
      `template:${template.name}`,
      ...(instance.tags || []),
    ];

    // 1. CONCRETE CALCULATION
    try {
      const concreteResult = calculateBeamConcrete({
        width,
        height,
        length,
        waste: concreteWaste,
      });

      totalConcreteVolume += concreteResult.volumeWithWaste;

      const dpwhConcreteItem = template.dpwhItemNumber || '900';

      takeoffLines.push({
        id: `tof_${instance.id}_concrete`,
        sourceElementId: instance.id,
        trade: 'Concrete' as Trade,
        resourceKey: template.dpwhItemNumber || 'concrete-class-a',
        quantity: roundQuantity(
          concreteResult.volumeWithWaste,
          roundingSettings.concrete || 3
        ),
        unit: 'm³',
        formulaText: concreteResult.formulaText,
        inputsSnapshot: concreteResult.inputs,
        assumptions: [`Waste: ${(concreteWaste * 100).toFixed(0)}%`],
        tags: withDpwhTag(tags, dpwhConcreteItem),
        calculatedAt: new Date(),
      });
    } catch (err) {
      errors.push(
        `Beam ${instance.id} concrete calculation error: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // 2. FORMWORK CALCULATION - NO WASTE applied (matches BuildingEstimate)
    try {
      const formworkResult = calculateBeamFormwork(width, height, length);

      totalFormworkArea += formworkResult.area;

      const dpwhFormworkItem = template.dpwhItemNumber || '900';

      takeoffLines.push({
        id: `tof_${instance.id}_formwork`,
        sourceElementId: instance.id,
        trade: 'Formwork' as Trade,
        resourceKey: 'formwork-beam',
        quantity: roundQuantity(
          formworkResult.area,
          roundingSettings.formwork || 2
        ),
        unit: 'm²',
        formulaText: formworkResult.formulaText,
        inputsSnapshot: formworkResult.inputs,
        assumptions: ['Contact area: bottom + 2 sides'],
        tags: withDpwhTag(tags, dpwhFormworkItem),
        calculatedAt: new Date(),
      });
    } catch (err) {
      errors.push(
        `Beam ${instance.id} formwork calculation error: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // 3. REBAR CALCULATION
    if (template.rebarConfig) {
      try {
        processBeamRebar(instance, template, length, tags, rebarWaste, roundingSettings);
      } catch (err) {
        errors.push(
          `Beam ${instance.id} rebar calculation error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  function processBeamRebar(
    instance: IElementInstance,
    template: IElementTemplate,
    length: number,
    tags: string[],
    rebarWaste: number,
    roundingSettings: Record<string, number>
  ) {
    const rebarConfig = template.rebarConfig!;
    const props = template.properties;

    // Main bars: (barDiameter, barCount, beamLength, waste)
    if (rebarConfig.mainBars?.diameter && rebarConfig.mainBars?.count) {
      const mainBarsResult = calculateBeamMainBars(
        rebarConfig.mainBars.diameter,
        rebarConfig.mainBars.count,
        length,
        rebarWaste
      );

      totalRebarWeight += mainBarsResult.weight;

      const grade = getRebarGrade(rebarConfig.mainBars.diameter);
      const dpwhItem = rebarConfig.dpwhRebarItem || getDPWHRebarItem(rebarConfig.mainBars.diameter);

      takeoffLines.push({
        id: `tof_${instance.id}_rebar_main`,
        sourceElementId: instance.id,
        trade: 'Rebar' as Trade,
        resourceKey: `rebar-${rebarConfig.mainBars.diameter}mm-grade${grade}-main`,
        quantity: roundQuantity(
          mainBarsResult.weight,
          roundingSettings.rebar || 2
        ),
        unit: 'kg',
        formulaText: mainBarsResult.formulaText,
        inputsSnapshot: mainBarsResult.inputs,
        assumptions: [
          `Waste: ${(rebarWaste * 100).toFixed(0)}%`,
          `DPWH Item: ${dpwhItem}`,
          `Grade ${grade}`,
        ],
        tags: withDpwhTag(
          [...tags, `rebar:main`, `diameter:${rebarConfig.mainBars.diameter}mm`],
          dpwhItem
        ),
        calculatedAt: new Date(),
      });
    }

    // Stirrups: (stirrupDiameter, stirrupSpacing, beamLength, beamWidth, beamHeight, waste)
    if (rebarConfig.stirrups?.diameter && rebarConfig.stirrups?.spacing) {
      const width = getProp(props, 'width', 0.3);
      const height = getProp(props, 'height', 0.5);

      const stirrupsResult = calculateBeamStirrupsWeight(
        rebarConfig.stirrups.diameter,
        rebarConfig.stirrups.spacing,
        length,
        width,
        height,
        rebarWaste
      );

      totalRebarWeight += stirrupsResult.weight;

      const grade = getRebarGrade(rebarConfig.stirrups.diameter);
      const dpwhItem = getDPWHRebarItem(rebarConfig.stirrups.diameter);

      takeoffLines.push({
        id: `tof_${instance.id}_rebar_stirrups`,
        sourceElementId: instance.id,
        trade: 'Rebar' as Trade,
        resourceKey: `rebar-${rebarConfig.stirrups.diameter}mm-grade${grade}-stirrups`,
        quantity: roundQuantity(
          stirrupsResult.weight,
          roundingSettings.rebar || 2
        ),
        unit: 'kg',
        formulaText: stirrupsResult.formulaText,
        inputsSnapshot: stirrupsResult.inputs,
        assumptions: [
          `Waste: ${(rebarWaste * 100).toFixed(0)}%`,
          `DPWH Item: ${dpwhItem}`,
          `Grade ${grade}`,
          `Spacing: ${rebarConfig.stirrups.spacing}m`,
        ],
        tags: withDpwhTag(
          [...tags, `rebar:stirrups`, `diameter:${rebarConfig.stirrups.diameter}mm`],
          dpwhItem
        ),
        calculatedAt: new Date(),
      });
    }
  }

  // ===================================
  // COLUMN PROCESSING
  // ===================================
  function processColumn(
    instance: IElementInstance,
    template: IElementTemplate,
    level: ILevel
  ) {
    const props = template.properties;
    const custom = instance.placement.customGeometry;

    // Get shape
    const shapeValue = props.get('shape');
    const shape = (typeof shapeValue === 'string' ? shapeValue : 'rectangular') as 'rectangular' | 'circular';

    // Calculate height (distance between levels) - Match BuildingEstimate logic
    let height: number;
    let endLevel: ILevel | null;
    
    if (instance.placement.endLevelId) {
      // Use specified end level
      endLevel = getLevel(instance.placement.endLevelId);
      if (!endLevel) {
        errors.push(`Column ${instance.id}: End level '${instance.placement.endLevelId}' not found`);
        return;
      }
      
      // Validate end level is above start level
      if (endLevel.elevation <= level.elevation) {
        errors.push(`Column ${instance.id}: end level '${endLevel.label}' (${endLevel.elevation}m) must be above start level '${level.label}' (${level.elevation}m)`);
        return;
      }
      
      height = endLevel.elevation - level.elevation;
    } else {
      // Auto-detect next level above
      endLevel = getNextLevel(instance.placement.levelId);
      if (!endLevel) {
        // Skip columns on top level with a warning (not an error)
        errors.push(`Column ${instance.id} at level '${instance.placement.levelId}' skipped - no level above (top floor column)`);
        return;
      }
      
      height = endLevel.elevation - level.elevation;
    }
    
    if (height <= 0) {
      errors.push(`Column ${instance.id}: Invalid height (${height}m)`);
      return;
    }

    const wasteSettings = settings?.waste || {};
    const roundingSettings = settings?.rounding || {};
    const concreteWaste = wasteSettings.concrete || 0.05;
    const rebarWaste = wasteSettings.rebar || 0.03;
    const formworkWaste = wasteSettings.formwork || 0.02;

    const tags = [
      `type:column`,
      `level:${level.label}`,
      `template:${template.name}`,
      `shape:${shape}`,
      ...(instance.tags || []),
    ];

    // 1. CONCRETE CALCULATION
    try {
      let concreteResult: ConcreteOutput;

      if (shape === 'circular') {
        const diameter = getProp(props, 'diameter', 0.4);
        concreteResult = calculateColumnConcrete({
          shape: 'circular',
          diameter,
          length: height,
          waste: concreteWaste,
        });
      } else {
        const width = getProp(props, 'width', 0.3);
        const depth = getProp(props, 'depth', 0.3);
        concreteResult = calculateColumnConcrete({
          shape: 'rectangular',
          width,
          height: depth,
          length: height,
          waste: concreteWaste,
        });
      }

      totalConcreteVolume += concreteResult.volumeWithWaste;

      const dpwhConcreteItem = template.dpwhItemNumber || '900';

      takeoffLines.push({
        id: `tof_${instance.id}_concrete`,
        sourceElementId: instance.id,
        trade: 'Concrete' as Trade,
        resourceKey: template.dpwhItemNumber || 'concrete-class-a',
        quantity: roundQuantity(
          concreteResult.volumeWithWaste,
          roundingSettings.concrete || 3
        ),
        unit: 'm³',
        formulaText: concreteResult.formulaText,
        inputsSnapshot: concreteResult.inputs,
        assumptions: [
          `Waste: ${(concreteWaste * 100).toFixed(0)}%`,
          `Height: ${level.label} to ${endLevel.label} (${height.toFixed(2)}m)`,
        ],
        tags: withDpwhTag(tags, dpwhConcreteItem),
        calculatedAt: new Date(),
      });
    } catch (err) {
      errors.push(
        `Column ${instance.id} concrete calculation error: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // 2. FORMWORK CALCULATION - NO WASTE applied (matches BuildingEstimate)
    try {
      let formworkResult: FormworkOutput;
      let diameter: number | undefined;

      if (shape === 'circular') {
        diameter = getProp(props, 'diameter', 0.4);
        formworkResult = calculateCircularColumnFormwork(diameter, height);
      } else {
        const width = getProp(props, 'width', 0.3);
        const depth = getProp(props, 'depth', 0.3);
        formworkResult = calculateRectangularColumnFormwork(width, depth, height);
      }

      totalFormworkArea += formworkResult.area;

      const dpwhFormworkItem = template.dpwhItemNumber || '900';

      takeoffLines.push({
        id: `tof_${instance.id}_formwork`,
        sourceElementId: instance.id,
        trade: 'Formwork' as Trade,
        resourceKey: 'formwork-column',
        quantity: roundQuantity(
          formworkResult.area,
          roundingSettings.formwork || 2
        ),
        unit: 'm²',
        formulaText: formworkResult.formulaText,
        inputsSnapshot: formworkResult.inputs,
        assumptions: [diameter ? 'Cylindrical surface' : 'All 4 sides'],
        tags: withDpwhTag(tags, dpwhFormworkItem),
        calculatedAt: new Date(),
      });
    } catch (err) {
      errors.push(
        `Column ${instance.id} formwork calculation error: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // 3. REBAR CALCULATION
    if (template.rebarConfig) {
      try {
        processColumnRebar(instance, template, height, shape, tags, rebarWaste, roundingSettings);
      } catch (err) {
        errors.push(
          `Column ${instance.id} rebar calculation error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  function processColumnRebar(
    instance: IElementInstance,
    template: IElementTemplate,
    height: number,
    shape: 'rectangular' | 'circular',
    tags: string[],
    rebarWaste: number,
    roundingSettings: Record<string, number>
  ) {
    const rebarConfig = template.rebarConfig!;
    const props = template.properties;

    // Main bars: (barDiameter, barCount, columnHeight, waste)
    if (rebarConfig.mainBars?.diameter && rebarConfig.mainBars?.count) {
      const mainBarsResult = calculateColumnMainBars(
        rebarConfig.mainBars.diameter,
        rebarConfig.mainBars.count,
        height,
        rebarWaste
      );

      totalRebarWeight += mainBarsResult.weight;

      const grade = getRebarGrade(rebarConfig.mainBars.diameter);
      const dpwhItem = rebarConfig.dpwhRebarItem || getDPWHRebarItem(rebarConfig.mainBars.diameter);

      takeoffLines.push({
        id: `tof_${instance.id}_rebar_main`,
        sourceElementId: instance.id,
        trade: 'Rebar' as Trade,
        resourceKey: `rebar-${rebarConfig.mainBars.diameter}mm-grade${grade}-main`,
        quantity: roundQuantity(
          mainBarsResult.weight,
          roundingSettings.rebar || 2
        ),
        unit: 'kg',
        formulaText: mainBarsResult.formulaText,
        inputsSnapshot: mainBarsResult.inputs,
        assumptions: [
          `Waste: ${(rebarWaste * 100).toFixed(0)}%`,
          `DPWH Item: ${dpwhItem}`,
          `Grade ${grade}`,
        ],
        tags: withDpwhTag(
          [...tags, `rebar:main`, `diameter:${rebarConfig.mainBars.diameter}mm`],
          dpwhItem
        ),
        calculatedAt: new Date(),
      });
    }

    // Ties/Stirrups: (tieDiameter, tieSpacing, columnHeight, columnWidth, columnDepth, waste)
    if (rebarConfig.stirrups?.diameter && rebarConfig.stirrups?.spacing) {
      const width = getProp(props, 'width', 0) || getProp(props, 'diameter', 0.3);
      const depth = shape === 'rectangular' ? getProp(props, 'depth', 0.3) : width;

      const tiesResult = calculateColumnTiesWeight(
        rebarConfig.stirrups.diameter,
        rebarConfig.stirrups.spacing,
        height,
        width,
        depth,
        rebarWaste
      );

      totalRebarWeight += tiesResult.weight;

      const grade = getRebarGrade(rebarConfig.stirrups.diameter);
      const dpwhItem = getDPWHRebarItem(rebarConfig.stirrups.diameter);

      takeoffLines.push({
        id: `tof_${instance.id}_rebar_ties`,
        sourceElementId: instance.id,
        trade: 'Rebar' as Trade,
        resourceKey: `rebar-${rebarConfig.stirrups.diameter}mm-grade${grade}-ties`,
        quantity: roundQuantity(
          tiesResult.weight,
          roundingSettings.rebar || 2
        ),
        unit: 'kg',
        formulaText: tiesResult.formulaText,
        inputsSnapshot: tiesResult.inputs,
        assumptions: [
          `Waste: ${(rebarWaste * 100).toFixed(0)}%`,
          `DPWH Item: ${dpwhItem}`,
          `Grade ${grade}`,
          `Spacing: ${rebarConfig.stirrups.spacing}m`,
        ],
        tags: withDpwhTag(
          [...tags, `rebar:ties`, `diameter:${rebarConfig.stirrups.diameter}mm`],
          dpwhItem
        ),
        calculatedAt: new Date(),
      });
    }
  }

  // ===================================
  // SLAB PROCESSING
  // ===================================
  function processSlab(
    instance: IElementInstance,
    template: IElementTemplate,
    level: ILevel
  ) {
    const props = template.properties;
    const custom = instance.placement.customGeometry;

    // Get dimensions
    const thickness = getProp(props, 'thickness', 0.1);

    // Calculate dimensions from grid reference or custom - STORE xLength and yLength
    let area: number | undefined;
    let xLength: number | undefined;
    let yLength: number | undefined;
    
    if (instance.placement.gridRef && instance.placement.gridRef.length >= 2) {
      // Slab grid reference format: ["A-C", "1-3"] - both should have spans
      const [xRef, yRef] = instance.placement.gridRef;
      
      if (xRef.includes('-') && yRef.includes('-')) {
        const [xStart, xEnd] = xRef.split('-');
        const [yStart, yEnd] = yRef.split('-');
        
        const x1 = getGridOffset(xStart, 'x');
        const x2 = getGridOffset(xEnd, 'x');
        const y1 = getGridOffset(yStart, 'y');
        const y2 = getGridOffset(yEnd, 'y');
        
        if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
          xLength = Math.abs(x2 - x1);
          yLength = Math.abs(y2 - y1);
          area = xLength * yLength;
        }
      }
    }
    
    // Fallback to custom or props
    if (!area) {
      const areaFromProps = getProp(props, 'area', 0);
      if (areaFromProps > 0) area = areaFromProps;
    }

    if (!area) {
      const gridRefInfo = instance.placement.gridRef 
        ? `[${instance.placement.gridRef.join(', ')}]`
        : 'none';
      errors.push(
        `Slab ${instance.id} (Template: ${template.name}): Cannot determine area. ` +
        `Grid ref: ${gridRefInfo}. ` +
        `Expected format: ["A-C", "1-3"] for a slab spanning from A to C and 1 to 3.`
      );
      return;
    }

    const wasteSettings = settings?.waste || {};
    const roundingSettings = settings?.rounding || {};
    const concreteWaste = wasteSettings.concrete || 0.05;
    const rebarWaste = wasteSettings.rebar || 0.03;

    const tags = [
      `type:slab`,
      `level:${level.label}`,
      `template:${template.name}`,
      ...(instance.tags || []),
    ];

    // 1. CONCRETE CALCULATION
    try {
      const concreteResult = calculateSlabConcrete({
        thickness,
        area,
        waste: concreteWaste,
      });

      totalConcreteVolume += concreteResult.volumeWithWaste;

      const dpwhConcreteItem = template.dpwhItemNumber || '900';

      takeoffLines.push({
        id: `tof_${instance.id}_concrete`,
        sourceElementId: instance.id,
        trade: 'Concrete' as Trade,
        resourceKey: template.dpwhItemNumber || 'concrete-class-a',
        quantity: roundQuantity(
          concreteResult.volumeWithWaste,
          roundingSettings.concrete || 3
        ),
        unit: 'm³',
        formulaText: concreteResult.formulaText,
        inputsSnapshot: concreteResult.inputs,
        assumptions: [`Waste: ${(concreteWaste * 100).toFixed(0)}%`],
        tags: withDpwhTag(tags, dpwhConcreteItem),
        calculatedAt: new Date(),
      });
    } catch (err) {
      errors.push(
        `Slab ${instance.id} concrete calculation error: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // 2. FORMWORK CALCULATION - NO WASTE applied (matches BuildingEstimate)
    try {
      const formworkResult = calculateSlabFormwork(area);

      totalFormworkArea += formworkResult.area;

      const dpwhFormworkItem = template.dpwhItemNumber || '900';

      takeoffLines.push({
        id: `tof_${instance.id}_formwork`,
        sourceElementId: instance.id,
        trade: 'Formwork' as Trade,
        resourceKey: 'formwork-slab',
        quantity: roundQuantity(
          formworkResult.area,
          roundingSettings.formwork || 2
        ),
        unit: 'm²',
        formulaText: formworkResult.formulaText,
        inputsSnapshot: formworkResult.inputs,
        assumptions: ['Soffit formwork (bottom surface)'],
        tags: withDpwhTag(tags, dpwhFormworkItem),
        calculatedAt: new Date(),
      });
    } catch (err) {
      errors.push(
        `Slab ${instance.id} formwork calculation error: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // 3. REBAR CALCULATION
    if (template.rebarConfig) {
      try {
        processSlabRebar(instance, template, area, xLength, yLength, tags, rebarWaste, roundingSettings);
      } catch (err) {
        errors.push(
          `Slab ${instance.id} rebar calculation error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  function processSlabRebar(
    instance: IElementInstance,
    template: IElementTemplate,
    area: number,
    xLength: number | undefined,
    yLength: number | undefined,
    tags: string[],
    rebarWaste: number,
    roundingSettings: Record<string, number>
  ) {
    const rebarConfig = template.rebarConfig!;

    // Fallback to square assumption if dimensions not available
    if (!xLength || !yLength) {
      xLength = Math.sqrt(area);
      yLength = xLength;
    }

    // Main bars (typically in longer direction): (barDiameter, spacing, spanLength, spanCount, waste)
    if (rebarConfig.mainBars?.diameter) {
      // Use spacing or calculate from count (BuildingEstimate pattern)
      const spacing = rebarConfig.mainBars.count 
        ? yLength / (rebarConfig.mainBars.count - 1)
        : (rebarConfig.mainBars.spacing || 0.15); // default 150mm spacing

      const mainBarsResult = calculateSlabMainBars(
        rebarConfig.mainBars.diameter,
        spacing,
        xLength, // bar length
        1, // single span for this panel
        rebarWaste
      );

      totalRebarWeight += mainBarsResult.weight;

      const grade = getRebarGrade(rebarConfig.mainBars.diameter);
      const dpwhItem = rebarConfig.dpwhRebarItem || getDPWHRebarItem(rebarConfig.mainBars.diameter);

      takeoffLines.push({
        id: `tof_${instance.id}_rebar_main`,
        sourceElementId: instance.id,
        trade: 'Rebar' as Trade,
        resourceKey: `rebar-${rebarConfig.mainBars.diameter}mm-grade${grade}-main`,
        quantity: roundQuantity(
          mainBarsResult.weight,
          roundingSettings.rebar || 2
        ),
        unit: 'kg',
        formulaText: mainBarsResult.formulaText,
        inputsSnapshot: mainBarsResult.inputs,
        assumptions: [
          `Waste: ${(rebarWaste * 100).toFixed(0)}%`,
          `DPWH Item: ${dpwhItem}`,
          `Grade ${grade}`,
        ],
        tags: withDpwhTag(
          [...tags, `rebar:main`, `diameter:${rebarConfig.mainBars.diameter}mm`],
          dpwhItem
        ),
        calculatedAt: new Date(),
      });
    }

    // Secondary bars (perpendicular direction) - BuildingEstimate includes this
    if (rebarConfig.secondaryBars?.diameter) {
      const spacing = rebarConfig.secondaryBars.spacing || 0.15; // default 150mm spacing

      const secondaryBarsResult = calculateSlabMainBars(
        rebarConfig.secondaryBars.diameter,
        spacing,
        yLength, // bar length in perpendicular direction
        1,
        rebarWaste
      );

      totalRebarWeight += secondaryBarsResult.weight;

      const grade = getRebarGrade(rebarConfig.secondaryBars.diameter);
      const dpwhItem = getDPWHRebarItem(rebarConfig.secondaryBars.diameter);

      takeoffLines.push({
        id: `tof_${instance.id}_rebar_secondary`,
        sourceElementId: instance.id,
        trade: 'Rebar' as Trade,
        resourceKey: `rebar-${rebarConfig.secondaryBars.diameter}mm-grade${grade}-secondary`,
        quantity: roundQuantity(
          secondaryBarsResult.weight,
          roundingSettings.rebar || 2
        ),
        unit: 'kg',
        formulaText: secondaryBarsResult.formulaText,
        inputsSnapshot: secondaryBarsResult.inputs,
        assumptions: [
          `Waste: ${(rebarWaste * 100).toFixed(0)}%`,
          `DPWH Item: ${dpwhItem}`,
          `Grade ${grade}`,
        ],
        tags: withDpwhTag(
          [...tags, `rebar:secondary`, `diameter:${rebarConfig.secondaryBars.diameter}mm`],
          dpwhItem
        ),
        calculatedAt: new Date(),
      });
    }
  }

  // ===================================
  // FOUNDATION PROCESSING
  // ===================================
  function processFoundation(
    instance: IElementInstance,
    template: IElementTemplate,
    level: ILevel
  ) {
    const props = template.properties;
    const custom = instance.placement.customGeometry;

    // Get dimensions (assume rectangular footing)
    const length = getProp(props, 'length', 1.5);
    const width = getProp(props, 'width', 1.5);
    const depth = getProp(props, 'depth', 0.5);

    const wasteSettings = settings?.waste || {};
    const roundingSettings = settings?.rounding || {};
    const concreteWaste = wasteSettings.concrete || 0.05;

    const tags = [
      `type:foundation`,
      `level:${level.label}`,
      `template:${template.name}`,
      ...(instance.tags || []),
    ];

    // 1. CONCRETE CALCULATION (simple volume)
    try {
      const volume = length * width * depth;
      const volumeWithWaste = volume * (1 + concreteWaste);

      totalConcreteVolume += volumeWithWaste;

      const dpwhConcreteItem = template.dpwhItemNumber || '900';

      takeoffLines.push({
        id: `tof_${instance.id}_concrete`,
        sourceElementId: instance.id,
        trade: 'Concrete' as Trade,
        resourceKey: template.dpwhItemNumber || 'concrete-class-a',
        quantity: roundQuantity(
          volumeWithWaste,
          roundingSettings.concrete || 3
        ),
        unit: 'm³',
        formulaText: `V = L × W × D = ${length} × ${width} × ${depth} = ${volume.toFixed(3)} m³ (+ ${(concreteWaste * 100).toFixed(0)}% waste = ${volumeWithWaste.toFixed(3)} m³)`,
        inputsSnapshot: { length, width, depth, waste: concreteWaste },
        assumptions: [`Waste: ${(concreteWaste * 100).toFixed(0)}%`],
        tags: withDpwhTag(tags, dpwhConcreteItem),
        calculatedAt: new Date(),
      });
    } catch (err) {
      errors.push(
        `Foundation ${instance.id} concrete calculation error: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // 2. FORMWORK CALCULATION (perimeter × depth) - NO WASTE applied (matches BuildingEstimate)
    try {
      const perimeter = 2 * (length + width);
      const area = perimeter * depth;

      totalFormworkArea += area;

      const dpwhFormworkItem = template.dpwhItemNumber || '900';

      takeoffLines.push({
        id: `tof_${instance.id}_formwork`,
        sourceElementId: instance.id,
        trade: 'Formwork' as Trade,
        resourceKey: 'formwork-foundation',
        quantity: roundQuantity(
          area,
          roundingSettings.formwork || 2
        ),
        unit: 'm²',
        formulaText: `A = Perimeter × Depth = ${perimeter.toFixed(2)} × ${depth} = ${area.toFixed(2)} m²`,
        inputsSnapshot: { length, width, depth, perimeter },
        assumptions: ['All 4 vertical sides (bottom in contact with soil)'],
        tags: withDpwhTag(tags, dpwhFormworkItem),
        calculatedAt: new Date(),
      });
    } catch (err) {
      errors.push(
        `Foundation ${instance.id} formwork calculation error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}
