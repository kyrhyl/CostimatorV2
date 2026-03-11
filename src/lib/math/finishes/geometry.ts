/**
 * FINISHING WORKS - GEOMETRY CALCULATIONS
 * Pure deterministic functions for space geometry computation
 * No database access, no side effects
 */

import type { Space, GridLine, GridRectBoundary, PolygonBoundary } from '@/types';

export interface GridSystem {
  gridX: GridLine[];
  gridY: GridLine[];
}

export interface SpaceGeometry {
  area_m2: number;
  perimeter_m: number;
}

/**
 * Compute space geometry based on boundary type
 */
export function computeSpaceGeometry(
  space: Space,
  gridSystem: GridSystem
): SpaceGeometry {
  if (space.boundary.type === 'gridRect') {
    return computeGridRectGeometry(
      space.boundary.data as GridRectBoundary,
      gridSystem
    );
  } else if (space.boundary.type === 'polygon') {
    return computePolygonGeometry(space.boundary.data as PolygonBoundary);
  }
  
  throw new Error(`Unknown boundary type: ${space.boundary.type}`);
}

/**
 * Compute geometry for grid-based rectangular spaces
 */
export function computeGridRectGeometry(
  boundary: GridRectBoundary,
  gridSystem: GridSystem
): SpaceGeometry {
  // Find grid lines
  const [xStart, xEnd] = boundary.gridX;
  const [yStart, yEnd] = boundary.gridY;
  
  console.log('Looking for X grid lines:', xStart, xEnd);
  console.log('Available X grid lines:', gridSystem.gridX.map(g => g.label));
  console.log('Looking for Y grid lines:', yStart, yEnd);
  console.log('Available Y grid lines:', gridSystem.gridY.map(g => g.label));
  
  const xStartLine = gridSystem.gridX.find(g => g.label === xStart);
  const xEndLine = gridSystem.gridX.find(g => g.label === xEnd);
  const yStartLine = gridSystem.gridY.find(g => g.label === yStart);
  const yEndLine = gridSystem.gridY.find(g => g.label === yEnd);
  
  console.log('Found grid lines:', {
    xStartLine: xStartLine?.label,
    xEndLine: xEndLine?.label,
    yStartLine: yStartLine?.label,
    yEndLine: yEndLine?.label,
  });
  
  if (!xStartLine || !xEndLine || !yStartLine || !yEndLine) {
    throw new Error(
      `Grid lines not found. Requested: X[${xStart}, ${xEnd}], Y[${yStart}, ${yEnd}]. Available X: [${gridSystem.gridX.map(g => g.label).join(', ')}], Available Y: [${gridSystem.gridY.map(g => g.label).join(', ')}]`
    );
  }
  
  const width = Math.abs(xEndLine.offset - xStartLine.offset);
  const length = Math.abs(yEndLine.offset - yStartLine.offset);
  
  const area_m2 = width * length;
  const perimeter_m = 2 * (width + length);
  
  return {
    area_m2: Number(area_m2.toFixed(3)),
    perimeter_m: Number(perimeter_m.toFixed(3)),
  };
}

/**
 * Compute geometry for polygon-based spaces
 * Uses shoelace formula for area and perimeter calculation
 */
export function computePolygonGeometry(boundary: PolygonBoundary): SpaceGeometry {
  const points = boundary.points;
  
  if (points.length < 3) {
    throw new Error('Polygon must have at least 3 points');
  }
  
  // Shoelace formula for area
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  area = Math.abs(area) / 2;
  
  // Perimeter calculation
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    perimeter += dist;
  }
  
  return {
    area_m2: Number(area.toFixed(3)),
    perimeter_m: Number(perimeter.toFixed(3)),
  };
}

/**
 * Compute opening area
 */
export function computeOpeningArea(
  width_m: number,
  height_m: number,
  qty: number
): number {
  const area = width_m * height_m * qty;
  return Number(area.toFixed(3));
}
