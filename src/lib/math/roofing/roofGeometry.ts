/**
 * ROOFING GEOMETRY CALCULATIONS
 * Pure functions for roof plane geometry (plan area, slope factor, slope area)
 * 
 * Architecture: PURE - no side effects, 100% deterministic, fully testable
 */

import type { RoofPlane, GridLine, GridRectBoundary, PolygonBoundary } from '@/types';

/**
 * Compute plan area from grid rectangle boundary
 */
export function computeGridRectPlanArea(
  boundary: GridRectBoundary,
  gridX: GridLine[],
  gridY: GridLine[]
): number {
  const [startX, endX] = boundary.gridX;
  const [startY, endY] = boundary.gridY;

  const x1 = gridX.find(g => g.label === startX)?.offset ?? 0;
  const x2 = gridX.find(g => g.label === endX)?.offset ?? 0;
  const y1 = gridY.find(g => g.label === startY)?.offset ?? 0;
  const y2 = gridY.find(g => g.label === endY)?.offset ?? 0;

  const width = Math.abs(x2 - x1);
  const length = Math.abs(y2 - y1);

  return width * length;
}

/**
 * Compute plan area from polygon boundary using Shoelace formula
 */
export function computePolygonPlanArea(boundary: PolygonBoundary): number {
  const points = boundary.points;
  if (points.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area / 2);
}

/**
 * Compute slope factor from slope specification
 * - ratio mode: rise/run (e.g., 0.25 for 1:4 slope)
 * - degrees mode: angle in degrees (e.g., 14.04°)
 * 
 * Slope factor = 1 / cos(angle) = sqrt(1 + (rise/run)²)
 */
export function computeSlopeFactor(slope: { mode: 'ratio' | 'degrees'; value: number }): number {
  if (slope.mode === 'ratio') {
    // slope.value is rise/run ratio
    const riseOverRun = slope.value;
    return Math.sqrt(1 + riseOverRun * riseOverRun);
  } else {
    // slope.mode === 'degrees'
    const angleRad = (slope.value * Math.PI) / 180;
    return 1 / Math.cos(angleRad);
  }
}

/**
 * Compute roof plane geometry (plan area, slope factor, slope area)
 */
export function computeRoofPlaneGeometry(
  roofPlane: RoofPlane,
  gridX?: GridLine[],
  gridY?: GridLine[]
): {
  planArea_m2: number;
  slopeFactor: number;
  slopeArea_m2: number;
} {
  let planArea_m2 = 0;

  if (roofPlane.boundary.type === 'gridRect') {
    if (!gridX || !gridY) {
      throw new Error('Grid system required for gridRect boundary');
    }
    planArea_m2 = computeGridRectPlanArea(
      roofPlane.boundary.data as GridRectBoundary,
      gridX,
      gridY
    );
  } else if (roofPlane.boundary.type === 'polygon') {
    planArea_m2 = computePolygonPlanArea(roofPlane.boundary.data as PolygonBoundary);
  }

  const slopeFactor = computeSlopeFactor(roofPlane.slope);
  const slopeArea_m2 = planArea_m2 * slopeFactor;

  return {
    planArea_m2,
    slopeFactor,
    slopeArea_m2,
  };
}
