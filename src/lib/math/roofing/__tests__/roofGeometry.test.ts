/**
 * Unit Tests for Roofing Geometry Calculations
 * Tests for computeRoofPlaneGeometry, computeSlopeFactor, etc.
 */

import {
  computeGridRectPlanArea,
  computePolygonPlanArea,
  computeSlopeFactor,
  computeRoofPlaneGeometry,
} from '../roofGeometry';
import type { RoofPlane, GridLine } from '@/types';

describe('Roof Geometry Calculations', () => {
  const mockGridX: GridLine[] = [
    { label: 'A', offset: 0 },
    { label: 'B', offset: 6 },
    { label: 'C', offset: 12 },
  ];

  const mockGridY: GridLine[] = [
    { label: '1', offset: 0 },
    { label: '2', offset: 5 },
    { label: '3', offset: 10 },
  ];

  describe('computeGridRectPlanArea', () => {
    it('should calculate area for grid rectangle A-B × 1-2', () => {
      const boundary = {
        gridX: ['A', 'B'] as [string, string],
        gridY: ['1', '2'] as [string, string],
      };

      const area = computeGridRectPlanArea(boundary, mockGridX, mockGridY);
      expect(area).toBe(30); // 6m × 5m = 30m²
    });

    it('should calculate area for grid rectangle B-C × 2-3', () => {
      const boundary = {
        gridX: ['B', 'C'] as [string, string],
        gridY: ['2', '3'] as [string, string],
      };

      const area = computeGridRectPlanArea(boundary, mockGridX, mockGridY);
      expect(area).toBe(30); // 6m × 5m = 30m²
    });

    it('should handle reversed grid references', () => {
      const boundary = {
        gridX: ['B', 'A'] as [string, string],
        gridY: ['2', '1'] as [string, string],
      };

      const area = computeGridRectPlanArea(boundary, mockGridX, mockGridY);
      expect(area).toBe(30); // Should use absolute value
    });
  });

  describe('computePolygonPlanArea', () => {
    it('should calculate area for simple rectangle polygon', () => {
      const boundary = {
        points: [
          [0, 0],
          [6, 0],
          [6, 5],
          [0, 5],
        ] as [number, number][],
      };

      const area = computePolygonPlanArea(boundary);
      expect(area).toBe(30); // 6 × 5 = 30
    });

    it('should calculate area for triangle', () => {
      const boundary = {
        points: [
          [0, 0],
          [10, 0],
          [5, 8],
        ] as [number, number][],
      };

      const area = computePolygonPlanArea(boundary);
      expect(area).toBe(40); // base × height / 2 = 10 × 8 / 2 = 40
    });

    it('should return 0 for invalid polygon (< 3 points)', () => {
      const boundary = {
        points: [
          [0, 0],
          [5, 5],
        ] as [number, number][],
      };

      const area = computePolygonPlanArea(boundary);
      expect(area).toBe(0);
    });
  });

  describe('computeSlopeFactor', () => {
    it('should calculate slope factor for 1:4 ratio (0.25)', () => {
      const slope = { mode: 'ratio' as const, value: 0.25 };
      const factor = computeSlopeFactor(slope);
      // sqrt(1 + 0.25²) = sqrt(1.0625) ≈ 1.0308
      expect(factor).toBeCloseTo(1.0308, 4);
    });

    it('should calculate slope factor for 1:3 ratio (0.333)', () => {
      const slope = { mode: 'ratio' as const, value: 0.333 };
      const factor = computeSlopeFactor(slope);
      // sqrt(1 + 0.333²) = sqrt(1.111) ≈ 1.054
      expect(factor).toBeCloseTo(1.054, 3);
    });

    it('should calculate slope factor for 14.04 degrees', () => {
      const slope = { mode: 'degrees' as const, value: 14.04 };
      const factor = computeSlopeFactor(slope);
      // 1 / cos(14.04°) ≈ 1.0308
      expect(factor).toBeCloseTo(1.0308, 4);
    });

    it('should calculate slope factor for 45 degrees', () => {
      const slope = { mode: 'degrees' as const, value: 45 };
      const factor = computeSlopeFactor(slope);
      // 1 / cos(45°) ≈ 1.4142
      expect(factor).toBeCloseTo(1.4142, 4);
    });

    it('should return 1 for zero slope (flat roof)', () => {
      const slope = { mode: 'ratio' as const, value: 0 };
      const factor = computeSlopeFactor(slope);
      expect(factor).toBe(1); // sqrt(1 + 0) = 1
    });
  });

  describe('computeRoofPlaneGeometry', () => {
    it('should compute geometry for gridRect roof plane with 1:4 slope', () => {
      const roofPlane: RoofPlane = {
        id: 'roof1',
        name: 'Main Roof',
        levelId: 'ROOF',
        boundary: {
          type: 'gridRect',
          data: {
            gridX: ['A', 'B'] as [string, string],
            gridY: ['1', '2'] as [string, string],
          },
        },
        slope: { mode: 'ratio', value: 0.25 },
        roofTypeId: 'rt1',
        computed: { planArea_m2: 0, slopeFactor: 1, slopeArea_m2: 0 },
        tags: [],
      };

      const geometry = computeRoofPlaneGeometry(roofPlane, mockGridX, mockGridY);

      expect(geometry.planArea_m2).toBe(30);
      expect(geometry.slopeFactor).toBeCloseTo(1.0308, 4);
      expect(geometry.slopeArea_m2).toBeCloseTo(30.924, 2);
    });

    it('should compute geometry for polygon roof plane with 20 degree slope', () => {
      const roofPlane: RoofPlane = {
        id: 'roof2',
        name: 'Hip Roof',
        levelId: 'ROOF',
        boundary: {
          type: 'polygon',
          data: {
            points: [
              [0, 0],
              [10, 0],
              [10, 8],
              [0, 8],
            ] as [number, number][],
          },
        },
        slope: { mode: 'degrees', value: 20 },
        roofTypeId: 'rt2',
        computed: { planArea_m2: 0, slopeFactor: 1, slopeArea_m2: 0 },
        tags: [],
      };

      const geometry = computeRoofPlaneGeometry(roofPlane);

      expect(geometry.planArea_m2).toBe(80); // 10 × 8
      expect(geometry.slopeFactor).toBeCloseTo(1.0642, 4); // 1/cos(20°)
      expect(geometry.slopeArea_m2).toBeCloseTo(85.136, 2); // 80 × 1.0642
    });

    it('should throw error for gridRect without grid system', () => {
      const roofPlane: RoofPlane = {
        id: 'roof3',
        name: 'Invalid Roof',
        levelId: 'ROOF',
        boundary: {
          type: 'gridRect',
          data: {
            gridX: ['A', 'B'] as [string, string],
            gridY: ['1', '2'] as [string, string],
          },
        },
        slope: { mode: 'ratio', value: 0.25 },
        roofTypeId: 'rt3',
        computed: { planArea_m2: 0, slopeFactor: 1, slopeArea_m2: 0 },
        tags: [],
      };

      expect(() => {
        computeRoofPlaneGeometry(roofPlane); // No gridX/gridY provided
      }).toThrow('Grid system required for gridRect boundary');
    });
  });
});
