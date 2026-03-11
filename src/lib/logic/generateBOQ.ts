import dpwhCatalogData from '@/data/dpwh-catalog.json';
import type { TakeoffLine, BOQLine, DPWHCatalogItem } from '@/types';
import type { IProject } from '@/models/Project';

const dpwhCatalog = dpwhCatalogData.items as DPWHCatalogItem[];

export interface BOQGenerationResult {
  boqLines: BOQLine[];
  summary: {
    totalLines: number;
    totalQuantity: number;
    trades: {
      Concrete: number;
      Rebar: number;
      Formwork: number;
      Finishes: number;
      Roofing: number;
      ScheduleItems: number;
    };
  };
  warnings: string[];
  errors: string[];
}

/**
 * Generate Bill of Quantities (BOQ) from takeoff lines
 * Groups takeoff lines by DPWH item number and aggregates quantities
 * 
 * @param takeoffLines - Array of takeoff lines from calculation
 * @param project - Project document containing element templates
 * @returns BOQ generation result with lines, summary, warnings, and errors
 */
export function generateBOQFromTakeoffLines(
  takeoffLines: TakeoffLine[],
  project: IProject
): BOQGenerationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const boqLines: BOQLine[] = [];

  if (!Array.isArray(takeoffLines) || takeoffLines.length === 0) {
    warnings.push('No takeoff lines to process');
    return {
      boqLines: [],
      summary: {
        totalLines: 0,
        totalQuantity: 0,
        trades: {
          Concrete: 0,
          Rebar: 0,
          Formwork: 0,
          Finishes: 0,
          Roofing: 0,
          ScheduleItems: 0,
        },
      },
      warnings,
      errors,
    };
  }

  // Filter takeoff lines by trade
  const concreteTakeoffLines = takeoffLines.filter(line => line.trade === 'Concrete');
  const rebarTakeoffLines = takeoffLines.filter(line => line.trade === 'Rebar');
  const formworkTakeoffLines = takeoffLines.filter(line => line.trade === 'Formwork');
  const finishesTakeoffLines = takeoffLines.filter(line => line.trade === 'Finishes');
  const roofingTakeoffLines = takeoffLines.filter(line => line.trade === 'Roofing');
  const scheduleItemsTakeoffLines = takeoffLines.filter(
    line => line.trade !== 'Concrete' && line.trade !== 'Rebar' && 
            line.trade !== 'Formwork' && line.trade !== 'Finishes' && line.trade !== 'Roofing'
  );

  // Get catalog items
  const concreteCatalogItems = dpwhCatalog.filter(item => item.trade === 'Concrete');
  const rebarCatalogItems = dpwhCatalog.filter(item => item.trade === 'Rebar');
  const formworkCatalogItems = dpwhCatalog.filter(item => item.trade === 'Formwork');

  const defaultConcreteItem = concreteCatalogItems.find(
    item => item.itemNumber === '900 (1) a'
  );
  const defaultRebarItem = rebarCatalogItems.find(
    item => item.itemNumber === '902 (1) a2'
  );
  const defaultFormworkItem = formworkCatalogItems.find(
    item => item.itemNumber === '903 (1)'
  );

  if (!defaultConcreteItem) {
    errors.push('Default concrete item not found in DPWH catalog');
  }
  if (!defaultRebarItem) {
    errors.push('Default rebar item not found in DPWH catalog');
  }
  if (!defaultFormworkItem) {
    warnings.push('Default formwork item not found in DPWH catalog - formwork will be skipped');
  }

  // Process Concrete
  if (defaultConcreteItem && concreteTakeoffLines.length > 0) {
    const concreteLines = processConcreteLines(
      concreteTakeoffLines,
      project,
      concreteCatalogItems,
      defaultConcreteItem,
      warnings,
      errors
    );
    boqLines.push(...concreteLines);
  }

  // Process Rebar
  if (defaultRebarItem && rebarTakeoffLines.length > 0) {
    const rebarLines = processRebarLines(
      rebarTakeoffLines,
      rebarCatalogItems,
      defaultRebarItem,
      errors
    );
    boqLines.push(...rebarLines);
  }

  // Process Formwork
  if (defaultFormworkItem && formworkTakeoffLines.length > 0) {
    const formworkLines = processFormworkLines(
      formworkTakeoffLines,
      formworkCatalogItems,
      defaultFormworkItem,
      errors
    );
    boqLines.push(...formworkLines);
  }

  // Process Finishes
  if (finishesTakeoffLines.length > 0) {
    const finishesLines = processFinishesLines(
      finishesTakeoffLines,
      warnings,
      errors
    );
    boqLines.push(...finishesLines);
  }

  // Process Roofing
  if (roofingTakeoffLines.length > 0) {
    const roofingLines = processRoofingLines(
      roofingTakeoffLines,
      warnings
    );
    boqLines.push(...roofingLines);
  }

  // Process Schedule Items
  if (scheduleItemsTakeoffLines.length > 0) {
    const scheduleLines = processScheduleItemsLines(
      scheduleItemsTakeoffLines,
      warnings
    );
    boqLines.push(...scheduleLines);
  }

  // Calculate summary
  const summary = calculateSummary(boqLines);

  return {
    boqLines,
    summary,
    warnings,
    errors,
  };
}

// ===================================
// CONCRETE PROCESSING
// ===================================
function processConcreteLines(
  lines: TakeoffLine[],
  project: IProject,
  catalogItems: DPWHCatalogItem[],
  defaultItem: DPWHCatalogItem,
  warnings: string[],
  errors: string[]
): BOQLine[] {
  const groupedByItem: Record<string, TakeoffLine[]> = {};
  
  for (const line of lines) {
    const templateTag = line.tags.find(tag => tag.startsWith('template:'));
    const templateId = project.elementTemplates?.find((t: any) => 
      t.name === templateTag?.replace('template:', '')
    )?.id;
    
    const template = templateId 
      ? project.elementTemplates?.find((t: any) => t.id === templateId)
      : null;
    
    const dpwhItemNumber = template?.dpwhItemNumber || defaultItem.itemNumber;
    
    if (!template?.dpwhItemNumber) {
      const warningMsg = `Template "${template?.name || 'Unknown'}" has no DPWH item assigned, using default (${defaultItem.itemNumber})`;
      if (!warnings.includes(warningMsg)) {
        warnings.push(warningMsg);
      }
    }
    
    if (!groupedByItem[dpwhItemNumber]) {
      groupedByItem[dpwhItemNumber] = [];
    }
    
    groupedByItem[dpwhItemNumber].push(line);
  }

  const boqLines: BOQLine[] = [];

  for (const [dpwhItemNumber, groupLines] of Object.entries(groupedByItem)) {
    const catalogItem = catalogItems.find(item => item.itemNumber === dpwhItemNumber);
    
    if (!catalogItem) {
      errors.push(`DPWH item ${dpwhItemNumber} not found in catalog`);
      continue;
    }
    
    const totalQuantity = groupLines.reduce((sum, line) => sum + line.quantity, 0);
    const sourceTakeoffLineIds = groupLines.map(line => line.id);
    
    const allTags = new Set<string>();
    groupLines.forEach(line => line.tags.forEach(tag => allTags.add(tag)));
    
    const elementTypeCounts: Record<string, number> = {};
    groupLines.forEach(line => {
      const typeTag = line.tags.find(tag => tag.startsWith('type:'));
      const type = typeTag?.replace('type:', '') || 'unknown';
      elementTypeCounts[type] = (elementTypeCounts[type] || 0) + 1;
    });

    const boqLine: BOQLine = {
      id: `boq_${dpwhItemNumber.replace(/[^a-zA-Z0-9]/g, '_')}`,
      dpwhItemNumberRaw: catalogItem.itemNumber,
      description: catalogItem.description,
      unit: 'm³',
      quantity: Math.round(totalQuantity * 1000) / 1000,
      sourceTakeoffLineIds,
      tags: [
        `dpwh:${catalogItem.itemNumber}`,
        `trade:Concrete`,
        `elements:${Object.entries(elementTypeCounts).map(([type, count]) => `${count} ${type}`).join(', ')}`,
        ...Array.from(allTags).filter(tag => !tag.startsWith('type:')),
      ],
    };

    boqLines.push(boqLine);
  }

  return boqLines;
}

// ===================================
// REBAR PROCESSING
// ===================================
function processRebarLines(
  lines: TakeoffLine[],
  catalogItems: DPWHCatalogItem[],
  defaultItem: DPWHCatalogItem,
  errors: string[]
): BOQLine[] {
  const groupedByItem: Record<string, TakeoffLine[]> = {};
  
  for (const line of lines) {
    const dpwhItemAssumption = line.assumptions.find(a => a.includes('DPWH Item:'));
    const dpwhItemMatch = dpwhItemAssumption?.match(/DPWH Item: ([^,]+)/);
    const dpwhItemNumber = dpwhItemMatch ? dpwhItemMatch[1].trim() : defaultItem.itemNumber;
    
    if (!groupedByItem[dpwhItemNumber]) {
      groupedByItem[dpwhItemNumber] = [];
    }
    
    groupedByItem[dpwhItemNumber].push(line);
  }

  const boqLines: BOQLine[] = [];

  for (const [dpwhItemNumber, groupLines] of Object.entries(groupedByItem)) {
    const catalogItem = catalogItems.find(item => item.itemNumber === dpwhItemNumber);
    
    if (!catalogItem) {
      errors.push(`Rebar DPWH item ${dpwhItemNumber} not found in catalog`);
      continue;
    }
    
    const totalQuantity = groupLines.reduce((sum, line) => sum + line.quantity, 0);
    const sourceTakeoffLineIds = groupLines.map(line => line.id);
    
    const allTags = new Set<string>();
    groupLines.forEach(line => line.tags.forEach(tag => allTags.add(tag)));
    
    const elementTypeCounts: Record<string, number> = {};
    const rebarTypeCounts: Record<string, number> = {};
    groupLines.forEach(line => {
      const typeTag = line.tags.find(tag => tag.startsWith('type:'));
      const type = typeTag?.replace('type:', '') || 'unknown';
      elementTypeCounts[type] = (elementTypeCounts[type] || 0) + 1;
      
      const rebarTypeTag = line.tags.find(tag => tag.startsWith('rebar:'));
      const rebarType = rebarTypeTag?.replace('rebar:', '') || 'main';
      rebarTypeCounts[rebarType] = (rebarTypeCounts[rebarType] || 0) + 1;
    });

    const boqLine: BOQLine = {
      id: `boq_${dpwhItemNumber.replace(/[^a-zA-Z0-9]/g, '_')}`,
      dpwhItemNumberRaw: catalogItem.itemNumber,
      description: catalogItem.description,
      unit: 'kg',
      quantity: Math.round(totalQuantity * 100) / 100,
      sourceTakeoffLineIds,
      tags: [
        `dpwh:${catalogItem.itemNumber}`,
        `trade:Rebar`,
        `elements:${Object.entries(elementTypeCounts).map(([type, count]) => `${count} ${type}`).join(', ')}`,
        `rebar-types:${Object.entries(rebarTypeCounts).map(([type, count]) => `${count} ${type}`).join(', ')}`,
        ...Array.from(allTags).filter(tag => !tag.startsWith('type:') && !tag.startsWith('rebar:')),
      ],
    };

    boqLines.push(boqLine);
  }

  return boqLines;
}

// ===================================
// FORMWORK PROCESSING
// ===================================
function processFormworkLines(
  lines: TakeoffLine[],
  catalogItems: DPWHCatalogItem[],
  defaultItem: DPWHCatalogItem,
  errors: string[]
): BOQLine[] {
  const groupedByItem: Record<string, TakeoffLine[]> = {};
  
  for (const line of lines) {
    const dpwhItemNumber = defaultItem.itemNumber;
    
    if (!groupedByItem[dpwhItemNumber]) {
      groupedByItem[dpwhItemNumber] = [];
    }
    
    groupedByItem[dpwhItemNumber].push(line);
  }

  const boqLines: BOQLine[] = [];

  for (const [dpwhItemNumber, groupLines] of Object.entries(groupedByItem)) {
    const catalogItem = catalogItems.find(item => item.itemNumber === dpwhItemNumber);
    
    if (!catalogItem) {
      errors.push(`Formwork DPWH item ${dpwhItemNumber} not found in catalog`);
      continue;
    }
    
    const totalQuantity = groupLines.reduce((sum, line) => sum + line.quantity, 0);
    const sourceTakeoffLineIds = groupLines.map(line => line.id);
    
    const allTags = new Set<string>();
    groupLines.forEach(line => line.tags.forEach(tag => allTags.add(tag)));
    
    const elementTypeCounts: Record<string, number> = {};
    groupLines.forEach(line => {
      const typeTag = line.tags.find(tag => tag.startsWith('type:'));
      const type = typeTag?.replace('type:', '') || 'unknown';
      elementTypeCounts[type] = (elementTypeCounts[type] || 0) + 1;
    });

    const boqLine: BOQLine = {
      id: `boq_${dpwhItemNumber.replace(/[^a-zA-Z0-9]/g, '_')}`,
      dpwhItemNumberRaw: catalogItem.itemNumber,
      description: catalogItem.description,
      unit: 'm²',
      quantity: Math.round(totalQuantity * 100) / 100,
      sourceTakeoffLineIds,
      tags: [
        `dpwh:${catalogItem.itemNumber}`,
        `trade:Formwork`,
        `elements:${Object.entries(elementTypeCounts).map(([type, count]) => `${count} ${type}`).join(', ')}`,
        ...Array.from(allTags).filter(tag => !tag.startsWith('type:')),
      ],
    };

    boqLines.push(boqLine);
  }

  return boqLines;
}

// ===================================
// FINISHES PROCESSING
// ===================================
function processFinishesLines(
  lines: TakeoffLine[],
  warnings: string[],
  errors: string[]
): BOQLine[] {
  const groupedByItem: Record<string, TakeoffLine[]> = {};
  
  for (const line of lines) {
    const dpwhTag = line.tags.find(tag => tag.startsWith('dpwh:'));
    const dpwhItemNumber = dpwhTag?.replace('dpwh:', '') || '';
    
    if (!dpwhItemNumber) {
      warnings.push(`Finishes line ${line.id} missing DPWH item number`);
      continue;
    }
    
    if (!groupedByItem[dpwhItemNumber]) {
      groupedByItem[dpwhItemNumber] = [];
    }
    
    groupedByItem[dpwhItemNumber].push(line);
  }

  const boqLines: BOQLine[] = [];

  for (const [dpwhItemNumber, groupLines] of Object.entries(groupedByItem)) {
    const catalogItem = dpwhCatalog.find(item => item.itemNumber === dpwhItemNumber);
    
    if (!catalogItem) {
      errors.push(`Finishes DPWH item ${dpwhItemNumber} not found in catalog`);
      continue;
    }
    
    const totalQuantity = groupLines.reduce((sum, line) => sum + line.quantity, 0);
    const sourceTakeoffLineIds = groupLines.map(line => line.id);
    
    const allTags = new Set<string>();
    groupLines.forEach(line => line.tags.forEach(tag => allTags.add(tag)));
    
    const spaceCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    groupLines.forEach(line => {
      const spaceTag = line.tags.find(tag => tag.startsWith('spaceName:'));
      const space = spaceTag?.replace('spaceName:', '') || 'unknown';
      spaceCounts[space] = (spaceCounts[space] || 0) + 1;
      
      const categoryTag = line.tags.find(tag => tag.startsWith('category:'));
      const category = categoryTag?.replace('category:', '') || 'unknown';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    const boqLine: BOQLine = {
      id: `boq_${dpwhItemNumber.replace(/[^a-zA-Z0-9]/g, '_')}_finishes`,
      dpwhItemNumberRaw: catalogItem.itemNumber,
      description: catalogItem.description,
      unit: catalogItem.unit,
      quantity: Math.round(totalQuantity * 100) / 100,
      sourceTakeoffLineIds,
      tags: [
        `dpwh:${catalogItem.itemNumber}`,
        `trade:Finishes`,
        `spaces:${Object.entries(spaceCounts).map(([space, count]) => `${count}× ${space}`).join(', ')}`,
        `categories:${Object.entries(categoryCounts).map(([cat, count]) => `${count}× ${cat}`).join(', ')}`,
        ...Array.from(allTags).filter(tag => !tag.startsWith('spaceName:') && !tag.startsWith('category:')),
      ],
    };

    boqLines.push(boqLine);
  }

  return boqLines;
}

// ===================================
// ROOFING PROCESSING
// ===================================
function processRoofingLines(
  lines: TakeoffLine[],
  warnings: string[]
): BOQLine[] {
  const groupedByItem: Record<string, TakeoffLine[]> = {};

  for (const line of lines) {
    const dpwhTag = line.tags.find(tag => tag.startsWith('dpwh:'));
    if (!dpwhTag) continue;

    const dpwhItemNumber = dpwhTag.replace('dpwh:', '');
    if (!groupedByItem[dpwhItemNumber]) {
      groupedByItem[dpwhItemNumber] = [];
    }
    groupedByItem[dpwhItemNumber].push(line);
  }

  const boqLines: BOQLine[] = [];

  for (const [dpwhItemNumber, groupLines] of Object.entries(groupedByItem)) {
    const catalogItem = dpwhCatalog.find(item => item.itemNumber === dpwhItemNumber);
    if (!catalogItem) {
      warnings.push(`Roofing DPWH item "${dpwhItemNumber}" not found in catalog`);
      continue;
    }

    const totalQuantity = groupLines.reduce((sum, line) => sum + line.quantity, 0);
    const sourceTakeoffLineIds = groupLines.map(line => line.id);
    const allTags = new Set<string>();
    const roofPlaneCounts: Record<string, number> = {};

    for (const line of groupLines) {
      line.tags.forEach(tag => allTags.add(tag));
      const roofPlaneTag = line.tags.find(t => t.startsWith('roofPlane:'));
      if (roofPlaneTag) {
        const roofPlaneName = roofPlaneTag.replace('roofPlane:', '');
        roofPlaneCounts[roofPlaneName] = (roofPlaneCounts[roofPlaneName] || 0) + 1;
      }
    }

    const boqLine: BOQLine = {
      id: `boq_${dpwhItemNumber.replace(/[^a-zA-Z0-9]/g, '_')}_roofing`,
      dpwhItemNumberRaw: catalogItem.itemNumber,
      description: catalogItem.description,
      unit: catalogItem.unit,
      quantity: Math.round(totalQuantity * 100) / 100,
      sourceTakeoffLineIds,
      tags: [
        `dpwh:${catalogItem.itemNumber}`,
        `trade:Roofing`,
        `roofPlanes:${Object.entries(roofPlaneCounts).map(([name, count]) => `${count}× ${name}`).join(', ')}`,
        ...Array.from(allTags).filter(tag => !tag.startsWith('roofPlane:')),
      ],
    };

    boqLines.push(boqLine);
  }

  return boqLines;
}

// ===================================
// SCHEDULE ITEMS PROCESSING
// ===================================
function processScheduleItemsLines(
  lines: TakeoffLine[],
  warnings: string[]
): BOQLine[] {
  const groupedByItem: Record<string, TakeoffLine[]> = {};

  for (const line of lines) {
    const dpwhTag = line.tags.find(tag => tag.startsWith('dpwh:'));
    if (!dpwhTag) continue;

    const dpwhItemNumber = dpwhTag.replace('dpwh:', '');
    if (!groupedByItem[dpwhItemNumber]) {
      groupedByItem[dpwhItemNumber] = [];
    }
    groupedByItem[dpwhItemNumber].push(line);
  }

  const boqLines: BOQLine[] = [];

  for (const [dpwhItemNumber, groupLines] of Object.entries(groupedByItem)) {
    const catalogItem = dpwhCatalog.find(item => item.itemNumber === dpwhItemNumber);
    if (!catalogItem) {
      warnings.push(`Schedule item DPWH "${dpwhItemNumber}" not found in catalog`);
      continue;
    }

    const totalQuantity = groupLines.reduce((sum, line) => sum + line.quantity, 0);
    const sourceTakeoffLineIds = groupLines.map(line => line.id);
    const allTags = new Set<string>();
    const categoryCounts: Record<string, number> = {};

    for (const line of groupLines) {
      line.tags.forEach(tag => allTags.add(tag));
      const categoryTag = line.tags.find(t => t.startsWith('category:'));
      if (categoryTag) {
        const category = categoryTag.replace('category:', '');
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }
    }

    const boqLine: BOQLine = {
      id: `boq_${dpwhItemNumber.replace(/[^a-zA-Z0-9]/g, '_')}_schedule`,
      dpwhItemNumberRaw: catalogItem.itemNumber,
      description: catalogItem.description,
      unit: catalogItem.unit,
      quantity: Math.round(totalQuantity * 100) / 100,
      sourceTakeoffLineIds,
      tags: [
        `dpwh:${catalogItem.itemNumber}`,
        `trade:${groupLines[0].trade}`,
        `categories:${Object.entries(categoryCounts).map(([cat, count]) => `${count}× ${cat}`).join(', ')}`,
        ...Array.from(allTags).filter(tag => !tag.startsWith('category:')),
      ],
    };

    boqLines.push(boqLine);
  }

  return boqLines;
}

// ===================================
// SUMMARY CALCULATION
// ===================================
function calculateSummary(boqLines: BOQLine[]) {
  const concreteLines = boqLines.filter(line => line.tags.some(tag => tag === 'trade:Concrete'));
  const rebarLines = boqLines.filter(line => line.tags.some(tag => tag === 'trade:Rebar'));
  const formworkLines = boqLines.filter(line => line.tags.some(tag => tag === 'trade:Formwork'));
  const finishesLines = boqLines.filter(line => line.tags.some(tag => tag === 'trade:Finishes'));
  const roofingLines = boqLines.filter(line => line.tags.some(tag => tag === 'trade:Roofing'));
  const scheduleLines = boqLines.filter(line => 
    !line.tags.some(tag => ['trade:Concrete', 'trade:Rebar', 'trade:Formwork', 'trade:Finishes', 'trade:Roofing'].includes(tag))
  );
  
  const totalConcreteQty = concreteLines.reduce((sum, line) => sum + line.quantity, 0);
  const totalRebarQty = rebarLines.reduce((sum, line) => sum + line.quantity, 0);
  const totalFormworkQty = formworkLines.reduce((sum, line) => sum + line.quantity, 0);
  const totalFinishesQty = finishesLines.reduce((sum, line) => sum + line.quantity, 0);
  const totalRoofingQty = roofingLines.reduce((sum, line) => sum + line.quantity, 0);
  const totalScheduleQty = scheduleLines.reduce((sum, line) => sum + line.quantity, 0);

  return {
    totalLines: boqLines.length,
    totalQuantity: totalConcreteQty + totalRebarQty + totalFormworkQty + totalFinishesQty + totalRoofingQty + totalScheduleQty,
    trades: {
      Concrete: totalConcreteQty,
      Rebar: totalRebarQty,
      Formwork: totalFormworkQty,
      Finishes: totalFinishesQty,
      Roofing: totalRoofingQty,
      ScheduleItems: totalScheduleQty,
    },
  };
}
