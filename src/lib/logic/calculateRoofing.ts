/**
 * ROOFING CALCULATION SERVICE
 * Orchestrates roofing takeoff calculations (DB → Math → Results)
 * 
 * Architecture: LOGIC LAYER
 * - Fetches data from project
 * - Calls pure math functions
 * - Returns structured results with errors
 */

import type { ProjectModel, TakeoffLine, RoofPlane, RoofType, GridLine } from '@/types';
import { computeRoofPlaneGeometry, computeRoofCoverTakeoff } from '@/lib/math/roofing';
import { calculateRoofFraming, type FramingParameters, roofingMaterials } from '@/lib/math/roofing/framing';
import { generateTruss } from '@/lib/math/roofing/truss';
import { v4 as uuidv4 } from 'uuid';

export interface RoofingCalculationResult {
  takeoffLines: TakeoffLine[];
  errors: string[];
  summary: {
    totalRoofArea_m2: number;
    roofPlaneCount: number;
    roofLineCount: number;
    totalTrussWeight_kg?: number;
    totalPurlinWeight_kg?: number;
    totalBracingWeight_kg?: number;
  };
}

/**
 * Calculate all roofing takeoff lines for a project
 */
export async function calculateRoofing(
  project: ProjectModel
): Promise<RoofingCalculationResult> {
  const takeoffLines: TakeoffLine[] = [];
  const errors: string[] = [];
  let totalRoofArea_m2 = 0;
  let totalTrussWeight_kg = 0;
  let totalPurlinWeight_kg = 0;
  let totalBracingWeight_kg = 0;

  // ===================================
  // PART 1: ROOF COVERING (roofPlanes)
  // ===================================

  // Validate prerequisites
  if (!project.roofPlanes || project.roofPlanes.length === 0) {
    // No roof planes, but check if truss design exists
    if (!project.trussDesign) {
      return {
        takeoffLines: [],
        errors: [],
        summary: { totalRoofArea_m2: 0, roofPlaneCount: 0, roofLineCount: 0 },
      };
    }
  }

  if (project.roofPlanes && project.roofPlanes.length > 0) {
    if (!project.roofTypes || project.roofTypes.length === 0) {
      errors.push('No roof types defined');
    } else {
      const gridX = project.gridX || [];
      const gridY = project.gridY || [];

      // Process each roof plane
      for (const roofPlane of project.roofPlanes) {
        try {
          // Find associated roof type
          const roofType = project.roofTypes.find(rt => rt.id === roofPlane.roofTypeId);
          if (!roofType) {
            errors.push(`Roof plane "${roofPlane.name}": roof type not found (${roofPlane.roofTypeId})`);
            continue;
          }

          // Compute geometry (plan area, slope factor, slope area)
          const geometry = computeRoofPlaneGeometry(roofPlane, gridX, gridY);

          // Update roof plane computed values (in-memory only, not saved to DB here)
          roofPlane.computed = geometry;

          totalRoofArea_m2 += geometry.slopeArea_m2;

          // Generate takeoff line for roof covering
          const takeoffLine = computeRoofCoverTakeoff(roofPlane, roofType);
          takeoffLines.push(takeoffLine);

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push(`Roof plane "${roofPlane.name}": ${errorMsg}`);
        }
      }
    }
  }

  // ===================================
  // PART 2: ROOF STRUCTURAL SYSTEM (trusses, purlins, bracing)
  // ===================================

  if (project.trussDesign) {
    try {
      const trussDesign = project.trussDesign;
      const mappings = trussDesign.dpwhItemMappings || {};

      // Calculate truss weight
      if (trussDesign.trussParams && trussDesign.buildingLength_mm) {
        const trussResult = generateTruss(trussDesign.trussParams as any); // Type cast for plateThickness
        const trussCount = Math.ceil(trussDesign.buildingLength_mm / trussDesign.trussParams.spacing_mm) + 1;
        const totalTrussWeight = trussResult.summary.totalWeight_kg * trussCount;
        totalTrussWeight_kg = totalTrussWeight;

        // Generate truss takeoff line
        const trussMapping = mappings.trussSteel || {
          dpwhItemNumberRaw: '1047 (8) a',
          description: 'Structural Steel Trusses',
          unit: 'Kilogram'
        };

        const formulaText = `${trussCount} trusses × ${Math.round(trussResult.summary.totalWeight_kg * 100) / 100} kg = ${Math.round(totalTrussWeight * 100) / 100} kg`;

        takeoffLines.push({
          id: uuidv4(),
          sourceElementId: 'truss_system',
          trade: 'Roofing',
          resourceKey: `truss-${trussDesign.trussParams.type}`,
          quantity: Math.round(totalTrussWeight * 100) / 100,
          unit: 'kg',
          formulaText,
          inputsSnapshot: {
            trussCount,
            weightPerTruss_kg: trussResult.summary.totalWeight_kg,
            span_mm: trussResult.geometry.span_mm,
            spacing_mm: trussDesign.trussParams.spacing_mm,
          },
          tags: [
            `dpwh:${trussMapping.dpwhItemNumberRaw}`,
            `component:truss`,
            `trussType:${trussDesign.trussParams.type}`,
            `trussCount:${trussCount}`,
            `span:${trussResult.geometry.span_mm}mm`
          ],
          assumptions: [
            `Truss type: ${trussDesign.trussParams.type}`,
            `Span: ${trussResult.geometry.span_mm} mm`,
            `Spacing: ${trussDesign.trussParams.spacing_mm} mm`,
            `Quantity: ${trussCount} trusses`,
            `Weight per truss: ${Math.round(trussResult.summary.totalWeight_kg * 100) / 100} kg`,
            `Top chord: ${trussDesign.trussParams.topChordMaterial.section}`,
            `Bottom chord: ${trussDesign.trussParams.bottomChordMaterial.section}`,
            `Web: ${trussDesign.trussParams.webMaterial.section}`
          ],
        });
      }

      // Calculate framing (purlins, bracing, accessories)
      if (trussDesign.framingParams && trussDesign.trussParams && trussDesign.buildingLength_mm) {
        // Find roofing material definition
        const roofingMaterialType = trussDesign.framingParams.roofingMaterial?.type || 'GI_Sheet_26';
        const roofingMaterial = roofingMaterials.find(m => m.type === roofingMaterialType) || roofingMaterials[0];

        const framingParams: FramingParameters = {
          trussSpan_mm: trussDesign.trussParams.span_mm,
          trussSpacing_mm: trussDesign.trussParams.spacing_mm,
          buildingLength_mm: trussDesign.buildingLength_mm,
          trussQuantity: Math.ceil(trussDesign.buildingLength_mm / trussDesign.trussParams.spacing_mm) + 1,
          roofingMaterial,
          purlinSpacing_mm: trussDesign.framingParams.purlinSpacing_mm,
          purlinSpec: trussDesign.framingParams.purlinSpec,
          bracing: trussDesign.framingParams.bracing,
          includeRidgeCap: trussDesign.framingParams.includeRidgeCap ?? true,
          includeEaveGirt: trussDesign.framingParams.includeEaveGirt ?? true,
        };

        const framingResult = calculateRoofFraming(framingParams);
        totalPurlinWeight_kg = framingResult.purlins.totalWeight_kg;
        totalBracingWeight_kg = framingResult.bracing.totalWeight_kg;

        // Generate purlin takeoff line
        const purlinMapping = mappings.purlinSteel || {
          dpwhItemNumberRaw: '1047 (8) b',
          description: 'Structural Steel Purlins',
          unit: 'Kilogram'
        };

        const purlinFormula = `${Math.round(framingResult.purlins.totalLength_m * 10) / 10} m × ${framingParams.purlinSpec.weight_kg_per_m} kg/m = ${Math.round(framingResult.purlins.totalWeight_kg * 100) / 100} kg`;

        takeoffLines.push({
          id: uuidv4(),
          sourceElementId: 'purlin_system',
          trade: 'Roofing',
          resourceKey: `purlin-${framingParams.purlinSpec.section}`,
          quantity: Math.round(framingResult.purlins.totalWeight_kg * 100) / 100,
          unit: 'kg',
          formulaText: purlinFormula,
          inputsSnapshot: {
            totalLength_m: framingResult.purlins.totalLength_m,
            weight_kg_per_m: framingParams.purlinSpec.weight_kg_per_m,
            linesPerSide: framingResult.purlins.linesPerSide,
            spacing_mm: framingParams.purlinSpacing_mm,
          },
          tags: [
            `dpwh:${purlinMapping.dpwhItemNumberRaw}`,
            `component:purlin`,
            `section:${framingParams.purlinSpec.section}`,
            `spacing:${framingParams.purlinSpacing_mm}mm`
          ],
          assumptions: [
            `Purlin section: ${framingParams.purlinSpec.section}`,
            `Purlin spacing: ${framingParams.purlinSpacing_mm} mm`,
            `Total length: ${Math.round(framingResult.purlins.totalLength_m * 10) / 10} m`,
            `Weight per meter: ${framingParams.purlinSpec.weight_kg_per_m} kg/m`,
            `Lines per side: ${framingResult.purlins.linesPerSide}`
          ],
        });

        // Generate bracing takeoff lines
        const bracingFormula = `${Math.round(framingResult.bracing.totalLength_m * 10) / 10} m × ${framingParams.bracing.material.weight_kg_per_m} kg/m = ${Math.round(framingResult.bracing.totalWeight_kg * 100) / 100} kg`;

        // Bracing steel weight
        takeoffLines.push({
          id: uuidv4(),
          sourceElementId: 'bracing_system',
          trade: 'Roofing',
          resourceKey: `bracing-${framingParams.bracing.type}`,
          quantity: Math.round(framingResult.bracing.totalWeight_kg * 100) / 100,
          unit: 'kg',
          formulaText: bracingFormula,
          inputsSnapshot: {
            totalLength_m: framingResult.bracing.totalLength_m,
            weight_kg_per_m: framingParams.bracing.material.weight_kg_per_m,
            bayCount: framingResult.bracing.bayCount,
          },
          tags: [
            `dpwh:1047 (5) a`, // Bolts and Rods for bracing weight
            `component:bracing`,
            `bracingType:${framingParams.bracing.type}`,
            `bays:${framingResult.bracing.bayCount}`
          ],
          assumptions: [
            `Bracing type: ${framingParams.bracing.type}`,
            `Bracing interval: ${framingParams.bracing.interval_mm} mm`,
            `Bay count: ${framingResult.bracing.bayCount}`,
            `Total length: ${Math.round(framingResult.bracing.totalLength_m * 10) / 10} m`,
            `Section: ${framingParams.bracing.material.section}`
          ],
        });

        // Turnbuckles
        if (framingResult.bracing.turnbuckleCount > 0) {
          const bracingMapping = mappings.bracingSteel || {
            dpwhItemNumberRaw: '1047 (4) b',
            description: 'Metal Structure Accessories Turnbuckle',
            unit: 'Each'
          };

          takeoffLines.push({
            id: uuidv4(),
            sourceElementId: 'turnbuckle_system',
            trade: 'Roofing',
            resourceKey: 'turnbuckles',
            quantity: framingResult.bracing.turnbuckleCount,
            unit: 'pcs',
            formulaText: `${framingResult.bracing.bayCount} bays × ${framingParams.bracing.type === 'X-Brace' ? '2' : '1'} = ${framingResult.bracing.turnbuckleCount} pcs`,
            inputsSnapshot: {
              bayCount: framingResult.bracing.bayCount,
              multiplier: framingParams.bracing.type === 'X-Brace' ? 2 : 1,
            },
            tags: [
              `dpwh:${bracingMapping.dpwhItemNumberRaw}`,
              `component:turnbuckle`,
              `bays:${framingResult.bracing.bayCount}`
            ],
            assumptions: [
              `Quantity: ${framingResult.bracing.turnbuckleCount} pieces`,
              `For ${framingParams.bracing.type} bracing`
            ],
          });
        }

        // Ridge cap
        if (framingResult.accessories.ridgeCap_m > 0) {
          const ridgeMapping = mappings.ridgeCap || {
            dpwhItemNumberRaw: '1013 (2) a',
            description: 'Fabricated Metal Roofing Accessory Ridge/Hip Rolls',
            unit: 'Linear Meter'
          };

          takeoffLines.push({
            id: uuidv4(),
            sourceElementId: 'ridge_cap',
            trade: 'Roofing',
            resourceKey: 'ridge-cap',
            quantity: Math.round(framingResult.accessories.ridgeCap_m * 100) / 100,
            unit: 'lm',
            formulaText: `Building length = ${Math.round(framingResult.accessories.ridgeCap_m * 100) / 100} m`,
            inputsSnapshot: {
              buildingLength_mm: trussDesign.buildingLength_mm,
            },
            tags: [
              `dpwh:${ridgeMapping.dpwhItemNumberRaw}`,
              `component:ridgeCap`
            ],
            assumptions: [
              `Length: ${Math.round(framingResult.accessories.ridgeCap_m * 100) / 100} m`
            ],
          });
        }

        // Fasteners and accessories
        if (framingResult.accessories.boltsAndNuts > 0) {
          const boltsMapping = mappings.boltsAndRods || {
            dpwhItemNumberRaw: '1047 (5) a',
            description: 'Metal Structure Accessories Bolts and Rods',
            unit: 'Kilogram'
          };

          // Estimate 0.05 kg per bolt assembly
          const boltsWeight_kg = framingResult.accessories.boltsAndNuts * 0.05;

          takeoffLines.push({
            id: uuidv4(),
            sourceElementId: 'purlin_bolts',
            trade: 'Roofing',
            resourceKey: 'purlin-bolts',
            quantity: Math.round(boltsWeight_kg * 100) / 100,
            unit: 'kg',
            formulaText: `${framingResult.accessories.boltsAndNuts} bolts × 0.05 kg = ${Math.round(boltsWeight_kg * 100) / 100} kg`,
            inputsSnapshot: {
              boltCount: framingResult.accessories.boltsAndNuts,
              weightPerBolt_kg: 0.05,
            },
            tags: [
              `dpwh:${boltsMapping.dpwhItemNumberRaw}`,
              `component:bolts`,
              `count:${framingResult.accessories.boltsAndNuts}`
            ],
            assumptions: [
              `Total bolts: ${framingResult.accessories.boltsAndNuts} pieces`,
              `Estimated weight: 0.05 kg per bolt assembly`
            ],
          });
        }

      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Truss design calculation failed: ${errorMsg}`);
    }
  }

  return {
    takeoffLines,
    errors,
    summary: {
      totalRoofArea_m2,
      roofPlaneCount: project.roofPlanes?.length || 0,
      roofLineCount: takeoffLines.length,
      totalTrussWeight_kg,
      totalPurlinWeight_kg,
      totalBracingWeight_kg,
    },
  };
}
