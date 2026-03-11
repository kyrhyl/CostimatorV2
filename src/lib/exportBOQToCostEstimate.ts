/**
 * Export BOQ to Cost-Estimate Application Format
 * Transforms BuildingEstimate BOQ into the format expected by cost-estimate-application
 */

import type { BOQLine } from '@/types';

export interface CostEstimateProjectItem {
  payItemNumber: string;
  description: string;
  unit: string;
  quantity: number;
  estimatedUnitCost?: number;
  totalCost?: number;
  remarks?: string;
  source: 'BuildingEstimate';
  metadata: {
    trade: string;
    category: string;
    sourceTakeoffLineIds: string[];
    boqLineId: string;
    tags: string[];
  };
}

export interface CostEstimateExport {
  version: string;
  exportedAt: string;
  source: 'BuildingEstimate';
  projectId: string;
  summary: {
    totalItems: number;
    totalQuantity: number;
    tradeBreakdown: Record<string, number>;
  };
  items: CostEstimateProjectItem[];
}

/**
 * Transforms a BuildingEstimate BOQLine to Cost-Estimate format
 */
export function transformBOQLineToCostEstimate(
  boqLine: BOQLine
): CostEstimateProjectItem {
  // Extract trade from tags
  const tradeTag = boqLine.tags.find(tag => tag.startsWith('trade:'));
  const trade = tradeTag ? tradeTag.replace('trade:', '') : 'Other';
  
  // Extract category from tags or use trade as default
  const categoryTag = boqLine.tags.find(tag => tag.startsWith('category:'));
  const category = categoryTag ? categoryTag.replace('category:', '') : trade;

  return {
    payItemNumber: boqLine.dpwhItemNumberRaw,
    description: boqLine.description,
    unit: boqLine.unit,
    quantity: boqLine.quantity,
    estimatedUnitCost: 0, // To be filled in Cost-Estimate
    totalCost: 0,
    remarks: `Generated from BuildingEstimate on ${new Date().toLocaleDateString()}`,
    source: 'BuildingEstimate',
    metadata: {
      trade,
      category,
      sourceTakeoffLineIds: boqLine.sourceTakeoffLineIds,
      boqLineId: boqLine.id,
      tags: boqLine.tags,
    },
  };
}

/**
 * Exports BOQ lines to Cost-Estimate application format
 */
export function exportBOQToCostEstimate(
  boqLines: BOQLine[],
  projectId: string
): CostEstimateExport {
  const items = boqLines.map(transformBOQLineToCostEstimate);
  
  // Calculate summary statistics
  const tradeBreakdown: Record<string, number> = {};
  let totalQuantity = 0;
  
  items.forEach(item => {
    const trade = item.metadata.trade;
    tradeBreakdown[trade] = (tradeBreakdown[trade] || 0) + item.quantity;
    totalQuantity += item.quantity;
  });

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    source: 'BuildingEstimate',
    projectId,
    summary: {
      totalItems: items.length,
      totalQuantity,
      tradeBreakdown,
    },
    items,
  };
}

/**
 * Downloads the export as a JSON file
 */
export function downloadAsJSON(exportData: CostEstimateExport, filename: string) {
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads the export as a CSV file
 */
export function downloadAsCSV(exportData: CostEstimateExport, filename: string) {
  const headers = [
    'Pay Item Number',
    'Description',
    'Unit',
    'Quantity',
    'Trade',
    'Category',
    'Source',
    'Remarks',
  ];

  const rows = exportData.items.map(item => [
    item.payItemNumber,
    `"${item.description.replace(/"/g, '""')}"`, // Escape quotes
    item.unit,
    item.quantity.toString(),
    item.metadata.trade,
    item.metadata.category,
    item.source,
    `"${(item.remarks || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
