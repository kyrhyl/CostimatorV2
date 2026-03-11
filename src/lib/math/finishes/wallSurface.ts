/**
 * WALL SURFACE GEOMETRY CALCULATIONS
 * Grid-based wall surface area computation for accurate finish estimation
 */

import type { WallSurface, GridLine, Level } from '@/types';

export interface GridSystem {
  gridX: GridLine[];
  gridY: GridLine[];
}

export interface WallSurfaceGeometry {
  length_m: number;
  height_m: number;
  grossArea_m2: number;
  sidesCount: number;
  totalArea_m2: number;
}

/**
 * Compute wall surface geometry from grid and level references
 */
export function computeWallSurfaceGeometry(
  wallSurface: WallSurface,
  gridSystem: GridSystem,
  levels: Level[]
): WallSurfaceGeometry {
  // Get horizontal length from grid span
  const length_m = computeGridSpanLength(
    wallSurface.gridLine,
    gridSystem
  );

  // Get vertical height from level difference
  const height_m = computeLevelHeight(
    wallSurface.levelStart,
    wallSurface.levelEnd,
    levels
  );

  // Gross area = length × height
  const grossArea_m2 = length_m * height_m;

  // Determine sides count based on surface type
  const sidesCount = getSidesCount(wallSurface.surfaceType);

  // Total area = gross area × sides count
  const totalArea_m2 = grossArea_m2 * sidesCount;

  return {
    length_m: Number(length_m.toFixed(3)),
    height_m: Number(height_m.toFixed(3)),
    grossArea_m2: Number(grossArea_m2.toFixed(3)),
    sidesCount,
    totalArea_m2: Number(totalArea_m2.toFixed(3)),
  };
}

/**
 * Calculate length along a grid line between two span points
 */
function computeGridSpanLength(
  gridLine: WallSurface['gridLine'],
  gridSystem: GridSystem
): number {
  const { axis, span } = gridLine;
  const [startLabel, endLabel] = span;

  // Select appropriate grid array
  const gridArray = axis === 'X' ? gridSystem.gridY : gridSystem.gridX;

  // Find grid lines
  const startGrid = gridArray.find(g => g.label === startLabel);
  const endGrid = gridArray.find(g => g.label === endLabel);

  if (!startGrid || !endGrid) {
    throw new Error(
      `Grid lines not found: ${startLabel}, ${endLabel} in ${axis === 'X' ? 'gridY' : 'gridX'}`
    );
  }

  // Calculate absolute distance
  return Math.abs(endGrid.offset - startGrid.offset);
}

/**
 * Calculate vertical height between two levels
 */
function computeLevelHeight(
  levelStart: string,
  levelEnd: string,
  levels: Level[]
): number {
  const startLevel = levels.find(l => l.label === levelStart);
  const endLevel = levels.find(l => l.label === levelEnd);

  if (!startLevel) {
    throw new Error(`Start level not found: ${levelStart}`);
  }
  if (!endLevel) {
    throw new Error(`End level not found: ${levelEnd}`);
  }

  // Calculate absolute height difference
  return Math.abs(endLevel.elevation - startLevel.elevation);
}

/**
 * Determine number of sides for finish calculation
 */
function getSidesCount(surfaceType: WallSurface['surfaceType']): number {
  switch (surfaceType) {
    case 'exterior':
      return 1; // Only exterior face
    case 'interior':
      return 2; // Both faces
    case 'both':
      return 2; // Both interior and exterior faces
    default:
      return 1;
  }
}

/**
 * Validate wall surface definition
 */
export function validateWallSurface(
  wallSurface: Partial<WallSurface>,
  gridSystem: GridSystem,
  levels: Level[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (!wallSurface.name) {
    errors.push('Wall surface name is required');
  }
  if (!wallSurface.gridLine) {
    errors.push('Grid line definition is required');
  }
  if (!wallSurface.levelStart) {
    errors.push('Start level is required');
  }
  if (!wallSurface.levelEnd) {
    errors.push('End level is required');
  }
  if (!wallSurface.surfaceType) {
    errors.push('Surface type is required');
  }

  // Validate grid line exists
  if (wallSurface.gridLine) {
    const { axis, label, span } = wallSurface.gridLine;
    
    const gridArray = axis === 'X' ? gridSystem.gridX : gridSystem.gridY;
    const spanArray = axis === 'X' ? gridSystem.gridY : gridSystem.gridX;

    const gridLine = gridArray.find(g => g.label === label);
    if (!gridLine) {
      errors.push(`Grid line ${label} not found in ${axis === 'X' ? 'gridX' : 'gridY'}`);
    }

    if (span && span.length === 2) {
      const [startLabel, endLabel] = span;
      const startGrid = spanArray.find(g => g.label === startLabel);
      const endGrid = spanArray.find(g => g.label === endLabel);

      if (!startGrid) {
        errors.push(`Span start ${startLabel} not found`);
      }
      if (!endGrid) {
        errors.push(`Span end ${endLabel} not found`);
      }
    } else {
      errors.push('Grid span must have exactly 2 labels [start, end]');
    }
  }

  // Validate levels exist
  if (wallSurface.levelStart) {
    const startLevel = levels.find(l => l.label === wallSurface.levelStart);
    if (!startLevel) {
      errors.push(`Start level ${wallSurface.levelStart} not found`);
    }
  }
  if (wallSurface.levelEnd) {
    const endLevel = levels.find(l => l.label === wallSurface.levelEnd);
    if (!endLevel) {
      errors.push(`End level ${wallSurface.levelEnd} not found`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
