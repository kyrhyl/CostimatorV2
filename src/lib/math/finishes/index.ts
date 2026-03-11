/**
 * FINISHING WORKS - MATH LAYER
 * Pure deterministic functions for finishing works calculations
 * Export all math functions from this module
 */

export {
  computeSpaceGeometry,
  computeGridRectGeometry,
  computePolygonGeometry,
  computeOpeningArea,
  type GridSystem,
  type SpaceGeometry,
} from './geometry';

export {
  computeFloorFinishTakeoff,
  computeCeilingFinishTakeoff,
  computeWallFinishTakeoff,
  applyWasteAndRounding,
  type FloorFinishInput,
  type CeilingFinishInput,
  type WallFinishInput,
} from './takeoff';
