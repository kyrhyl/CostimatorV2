/**
 * SCHEDULE ITEMS CALCULATION SERVICE
 * Orchestrates schedule-based takeoff calculations (DB → Results)
 * 
 * Architecture: LOGIC LAYER
 * - Fetches schedule items from project
 * - Generates TakeoffLines directly (no complex math needed)
 * - Returns structured results with full traceability
 */

import { v4 as uuidv4 } from 'uuid';
import type { ProjectModel, TakeoffLine, ScheduleItem, Trade } from '@/types';

export interface ScheduleCalculationResult {
  takeoffLines: TakeoffLine[];
  errors: string[];
  summary: {
    totalItems: number;
    byCategory: Record<string, number>;
  };
}

/**
 * Map schedule item category to Trade
 */
function mapCategoryToTrade(category: ScheduleItem['category']): Trade {
  const mapping: Record<ScheduleItem['category'], Trade> = {
    // Part E - Finishing Works
    'termite-control': 'Other',
    'drainage': 'Plumbing',
    'plumbing': 'Plumbing',
    'carpentry': 'Carpentry',
    'hardware': 'Hardware',
    'doors': 'Doors & Windows',
    'windows': 'Doors & Windows',
    'glazing': 'Glass & Glazing',
    'waterproofing': 'Waterproofing',
    'cladding': 'Cladding',
    'insulation': 'Other',
    'acoustical': 'Other',
    'other': 'Other',
    // Part C - Earthworks
    'earthworks-clearing': 'Earthwork',
    'earthworks-removal-trees': 'Earthwork',
    'earthworks-removal-structures': 'Earthwork',
    'earthworks-excavation': 'Earthwork',
    'earthworks-structure-excavation': 'Earthwork',
    'earthworks-embankment': 'Earthwork',
    'earthworks-site-development': 'Earthwork',
  };
  return mapping[category] || 'Other';
}

/**
 * Calculate all schedule-based takeoff lines for a project
 */
export async function calculateScheduleItems(
  project: ProjectModel
): Promise<ScheduleCalculationResult> {
  const takeoffLines: TakeoffLine[] = [];
  const errors: string[] = [];
  const byCategory: Record<string, number> = {};

  // Validate prerequisites
  if (!project.scheduleItems || project.scheduleItems.length === 0) {
    return {
      takeoffLines: [],
      errors: [],
      summary: { totalItems: 0, byCategory: {} },
    };
  }

  // Process each schedule item
  for (const item of project.scheduleItems) {
    try {
      const trade = mapCategoryToTrade(item.category);

      // Build formula text
      const formulaText = `Direct quantity from schedule: ${item.qty} ${item.unit}`;

      // Snapshot inputs
      const inputsSnapshot: Record<string, number> = {
        qty: item.qty,
      };

      // Build assumptions
      const assumptions: string[] = [
        `Basis: ${item.basisNote}`,
        `Category: ${item.category}`,
      ];

      if (item.descriptionOverride) {
        assumptions.push(`Description: ${item.descriptionOverride}`);
      }

      // Create takeoff line
      const takeoffLine: TakeoffLine = {
        id: uuidv4(),
        sourceElementId: item.id,
        trade,
        resourceKey: `schedule-${item.category}-${item.id}`,
        quantity: item.qty,
        unit: item.unit,
        formulaText,
        inputsSnapshot,
        assumptions,
        tags: [
          `category:${item.category}`,
          `dpwh:${item.dpwhItemNumberRaw}`,
          ...item.tags,
        ],
      };

      takeoffLines.push(takeoffLine);

      // Update summary
      byCategory[item.category] = (byCategory[item.category] || 0) + 1;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Schedule item ${item.id}: ${errorMsg}`);
    }
  }

  return {
    takeoffLines,
    errors,
    summary: {
      totalItems: project.scheduleItems.length,
      byCategory,
    },
  };
}
