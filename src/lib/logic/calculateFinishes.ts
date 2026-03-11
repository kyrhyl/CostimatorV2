/**
 * Finishing Works Calculation Service
 * Generates takeoff lines for finishing works
 */

import type {
  Space,
  Opening,
  FinishType,
  SpaceFinishAssignment,
  WallSurface,
  WallSurfaceFinishAssignment,
  TakeoffLine,
  Level,
  GridLine,
} from '@/types';
import {
  computeFloorFinishTakeoff,
  computeCeilingFinishTakeoff,
  computeWallFinishTakeoff,
  type GridSystem,
} from '@/lib/math/finishes';

export interface FinishesCalculationInput {
  spaces: Space[];
  openings: Opening[];
  finishTypes: FinishType[];
  assignments: SpaceFinishAssignment[];
  wallSurfaces?: WallSurface[];
  wallAssignments?: WallSurfaceFinishAssignment[];
  levels: Level[];
  gridX: GridLine[];
  gridY: GridLine[];
}

export interface FinishesCalculationResult {
  takeoffLines: TakeoffLine[];
  errors: string[];
  summary: {
    totalFloorArea: number;
    totalWallArea: number;
    totalCeilingArea: number;
    finishLineCount: number;
  };
}

/**
 * Calculate all finishing works takeoff lines
 */
export function calculateFinishingWorks(
  input: FinishesCalculationInput
): FinishesCalculationResult {
  const {
    spaces,
    openings,
    finishTypes,
    assignments,
    wallSurfaces = [],
    wallAssignments = [],
    levels,
    gridX,
    gridY,
  } = input;

  const takeoffLines: TakeoffLine[] = [];
  const errors: string[] = [];

  let totalFloorArea = 0;
  let totalWallArea = 0;
  let totalCeilingArea = 0;

  // Helper: Get level by label
  const getLevel = (label: string): Level | null => {
    return levels.find(l => l.label === label) || null;
  };

  // Helper: Get next level above
  const getNextLevel = (currentLabel: string): Level | null => {
    const currentLevel = getLevel(currentLabel);
    if (!currentLevel) return null;

    const sortedLevels = [...levels].sort((a, b) => a.elevation - b.elevation);
    const currentIndex = sortedLevels.findIndex(l => l.label === currentLabel);

    if (currentIndex === -1 || currentIndex === sortedLevels.length - 1) {
      return null;
    }

    return sortedLevels[currentIndex + 1];
  };

  // Helper: Calculate storey height
  const getStoreyHeight = (levelId: string): number => {
    const currentLevel = getLevel(levelId);
    const nextLevel = getNextLevel(levelId);

    if (!currentLevel || !nextLevel) {
      return 3.0; // Default 3m storey height
    }

    return nextLevel.elevation - currentLevel.elevation;
  };

  // Process each assignment
  for (const assignment of assignments) {
    try {
      // Find space
      const space = spaces.find(s => s.id === assignment.spaceId);
      if (!space) {
        errors.push(`Space ${assignment.spaceId} not found for assignment ${assignment.id}`);
        continue;
      }

      // Find finish type
      const finishType = finishTypes.find(ft => ft.id === assignment.finishTypeId);
      if (!finishType) {
        errors.push(`Finish type ${assignment.finishTypeId} not found for assignment ${assignment.id}`);
        continue;
      }

      // Generate takeoff based on category
      let takeoffLine: TakeoffLine;

      if (finishType.category === 'floor') {
        takeoffLine = computeFloorFinishTakeoff({
          space,
          finishType,
          assignment,
        });
        totalFloorArea += takeoffLine.quantity;
      } else if (finishType.category === 'ceiling') {
        // Check if space has metadata for isOpenToBelow
        const isOpenToBelow = space.metadata?.['isOpenToBelow'] === 'true';
        takeoffLine = computeCeilingFinishTakeoff({
          space,
          finishType,
          assignment,
          isOpenToBelow,
        });
        totalCeilingArea += takeoffLine.quantity;
      } else if (finishType.category === 'wall' || finishType.category === 'plaster' || finishType.category === 'paint') {
        // Get openings for this space and level
        const spaceOpenings = openings.filter(
          o => o.levelId === space.levelId && (!o.spaceId || o.spaceId === space.id)
        );

        const storeyHeight = getStoreyHeight(space.levelId);

        takeoffLine = computeWallFinishTakeoff({
          space,
          finishType,
          assignment,
          openings: spaceOpenings,
          storeyHeight_m: storeyHeight,
        });
        totalWallArea += takeoffLine.quantity;
      } else {
        errors.push(`Unknown finish category: ${finishType.category} for finish type ${finishType.id}`);
        continue;
      }

      takeoffLines.push(takeoffLine);
    } catch (error: any) {
      errors.push(`Error processing assignment ${assignment.id}: ${error.message}`);
    }
  }

  // ===================================
  // WALL SURFACE FINISH ASSIGNMENTS
  // ===================================
  console.log('\n=== WALL SURFACE ASSIGNMENTS ===');
  console.log('Wall surfaces available:', wallSurfaces.length);
  console.log('Wall assignments to process:', wallAssignments.length);
  
  if (wallAssignments.length > 0) {
    console.log('Wall assignments:', wallAssignments.map(a => ({
      id: a.id,
      wallSurfaceId: a.wallSurfaceId,
      finishTypeId: a.finishTypeId,
      scope: a.scope
    })));
  }

  for (const wallAssignment of wallAssignments) {
    try {
      // Find wall surface
      const wallSurface = wallSurfaces.find(ws => ws.id === wallAssignment.wallSurfaceId);
      if (!wallSurface) {
        errors.push(`Wall surface ${wallAssignment.wallSurfaceId} not found for assignment ${wallAssignment.id}`);
        continue;
      }

      // Find finish type
      const finishType = finishTypes.find(ft => ft.id === wallAssignment.finishTypeId);
      if (!finishType) {
        errors.push(`Finish type ${wallAssignment.finishTypeId} not found for wall assignment ${wallAssignment.id}`);
        continue;
      }

      // Calculate area based on wall surface computed values
      // Check both computed.totalArea_m2 and fallback to area_m2 if available
      let area = wallSurface.computed?.totalArea_m2 || (wallSurface as any).area_m2 || 0;
      
      if (area === 0) {
        errors.push(`Wall surface ${wallSurface.name} has no computed area. Skipping assignment ${wallAssignment.id}.`);
        continue;
      }
      
      // If assignment specifies side override, recalculate
      if (wallAssignment.side === 'single') {
        area = wallSurface.computed?.grossArea_m2 || 0;
      } else if (wallAssignment.side === 'both') {
        area = (wallSurface.computed?.grossArea_m2 || 0) * 2;
      }

      // Apply waste if specified
      const wastePercent = wallAssignment.overrides?.wastePercent ?? finishType.assumptions?.wastePercent ?? 0;
      const wasteFactor = 1 + (wastePercent / 100);
      const finalQuantity = area * wasteFactor;

      // Get dimensions for formula
      const length = wallSurface.computed?.length_m || 0;
      const height = wallSurface.computed?.height_m || 0;
      const sidesCount = wallAssignment.side === 'single' ? 1 : wallAssignment.side === 'both' ? 2 : wallSurface.computed?.sidesCount || 1;

      // Create takeoff line
      const takeoffLine: TakeoffLine = {
        id: `wall-finish-${wallAssignment.id}`,
        trade: 'Finishes',
        quantity: Number(finalQuantity.toFixed(2)),
        unit: finishType.unit,
        formulaText: `${length.toFixed(2)}m (L) × ${height.toFixed(2)}m (H) × ${sidesCount} side${sidesCount > 1 ? 's' : ''} = ${area.toFixed(2)} m²${wastePercent > 0 ? ` × ${wasteFactor.toFixed(2)} (waste)` : ''}`,
        inputsSnapshot: {
          grossArea_m2: wallSurface.computed?.grossArea_m2 || area,
          sidesCount: wallAssignment.side === 'single' ? 1 : wallAssignment.side === 'both' ? 2 : wallSurface.computed?.sidesCount || 1,
          wastePercent,
          wasteFactor,
        },
        resourceKey: `wall-surface-${wallSurface.id}-finish-${finishType.id}`,
        sourceElementId: wallSurface.id,
        tags: [
          `dpwh:${finishType.dpwhItemNumberRaw}`,
          `category:${finishType.category}`, 
          `scope:${wallAssignment.scope}`, 
          'type:wall-surface',
          `trade:Finishes`
        ],
        assumptions: [
          `Wall surface: ${wallSurface.name}`,
          `Finish: ${finishType.finishName}`,
          `Location: ${wallSurface.gridLine.axis}${wallSurface.gridLine.label} (${wallSurface.levelStart}-${wallSurface.levelEnd})`,
          `Dimensions: ${length.toFixed(2)}m × ${height.toFixed(2)}m`,
          `Gross area: ${(wallSurface.computed?.grossArea_m2 || area).toFixed(2)} m²`,
          `Sides: ${wallAssignment.side === 'single' ? '1 (single)' : wallAssignment.side === 'both' ? '2 (both)' : wallSurface.computed?.sidesCount || 1}`,
          wastePercent > 0 ? `Waste: ${wastePercent}%` : null,
        ].filter(Boolean) as string[],
      };

      takeoffLines.push(takeoffLine);
      totalWallArea += finalQuantity;
      
      console.log(`✓ Created wall finish takeoff: ${wallSurface.name} - ${finishType.finishName} (${finalQuantity.toFixed(2)} ${finishType.unit})`);

    } catch (error: any) {
      errors.push(`Error processing wall assignment ${wallAssignment.id}: ${error.message}`);
    }
  }

  console.log('\n=== FINISHES CALCULATION SUMMARY ===');
  console.log('Total takeoff lines created:', takeoffLines.length);
  console.log('Total floor area:', totalFloorArea.toFixed(2), 'm²');
  console.log('Total wall area:', totalWallArea.toFixed(2), 'm²');
  console.log('Total ceiling area:', totalCeilingArea.toFixed(2), 'm²');
  console.log('Errors:', errors.length);
  
  return {
    takeoffLines,
    errors,
    summary: {
      totalFloorArea: Number(totalFloorArea.toFixed(2)),
      totalWallArea: Number(totalWallArea.toFixed(2)),
      totalCeilingArea: Number(totalCeilingArea.toFixed(2)),
      finishLineCount: takeoffLines.length,
    },
  };
}
