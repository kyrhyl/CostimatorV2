/**
 * UNIT TESTS - Finishing Works Geometry
 * Testing pure math functions for space geometry calculation
 */

import {
  computeSpaceGeometry,
  computeGridRectGeometry,
  computePolygonGeometry,
  computeOpeningArea,
  type GridSystem,
} from '../geometry';
import type { Space, GridRectBoundary, PolygonBoundary } from '@/types';

describe('Finishing Works - Geometry Calculations', () => {
  
  describe('computeGridRectGeometry', () => {
    const gridSystem: GridSystem = {
      gridX: [
        { label: 'A', offset: 0 },
        { label: 'B', offset: 5 },
        { label: 'C', offset: 10 },
      ],
      gridY: [
        { label: '1', offset: 0 },
        { label: '2', offset: 6 },
        { label: '3', offset: 12 },
      ],
    };
    
    test('should calculate area and perimeter for 5x6m rectangle', () => {
      const boundary: GridRectBoundary = {
        gridX: ['A', 'B'],
        gridY: ['1', '2'],
      };
      
      const result = computeGridRectGeometry(boundary, gridSystem);
      
      expect(result.area_m2).toBe(30); // 5 × 6
      expect(result.perimeter_m).toBe(22); // 2 × (5 + 6)
    });
    
    test('should calculate area for 10x12m rectangle', () => {
      const boundary: GridRectBoundary = {
        gridX: ['A', 'C'],
        gridY: ['1', '3'],
      };
      
      const result = computeGridRectGeometry(boundary, gridSystem);
      
      expect(result.area_m2).toBe(120); // 10 × 12
      expect(result.perimeter_m).toBe(44); // 2 × (10 + 12)
    });
    
    test('should throw error for invalid grid labels', () => {
      const boundary: GridRectBoundary = {
        gridX: ['A', 'D'], // D doesn't exist
        gridY: ['1', '2'],
      };
      
      expect(() => {
        computeGridRectGeometry(boundary, gridSystem);
      }).toThrow('Grid lines not found');
    });
  });
  
  describe('computePolygonGeometry', () => {
    test('should calculate area and perimeter for 4x5m rectangle', () => {
      const boundary: PolygonBoundary = {
        points: [
          [0, 0],
          [4, 0],
          [4, 5],
          [0, 5],
        ],
      };
      
      const result = computePolygonGeometry(boundary);
      
      expect(result.area_m2).toBe(20); // 4 × 5
      expect(result.perimeter_m).toBe(18); // 2 × (4 + 5)
    });
    
    test('should calculate area for L-shaped polygon', () => {
      // L-shape: 10x10 with 5x5 cut from top-right
      const boundary: PolygonBoundary = {
        points: [
          [0, 0],
          [10, 0],
          [10, 5],
          [5, 5],
          [5, 10],
          [0, 10],
        ],
      };
      
      const result = computePolygonGeometry(boundary);
      
      expect(result.area_m2).toBe(75); // 10×10 - 5×5 = 100 - 25
      expect(result.perimeter_m).toBe(40); // perimeter of L-shape
    });
    
    test('should calculate area for triangle', () => {
      const boundary: PolygonBoundary = {
        points: [
          [0, 0],
          [6, 0],
          [3, 4],
        ],
      };
      
      const result = computePolygonGeometry(boundary);
      
      expect(result.area_m2).toBe(12); // (base × height) / 2 = (6 × 4) / 2
    });
    
    test('should throw error for polygon with less than 3 points', () => {
      const boundary: PolygonBoundary = {
        points: [
          [0, 0],
          [4, 0],
        ],
      };
      
      expect(() => {
        computePolygonGeometry(boundary);
      }).toThrow('Polygon must have at least 3 points');
    });
  });
  
  describe('computeOpeningArea', () => {
    test('should calculate area for single door', () => {
      const area = computeOpeningArea(0.9, 2.1, 1);
      expect(area).toBe(1.89); // 0.9 × 2.1
    });
    
    test('should calculate total area for multiple windows', () => {
      const area = computeOpeningArea(1.2, 1.5, 3);
      expect(area).toBe(5.4); // 1.2 × 1.5 × 3
    });
    
    test('should handle zero quantity', () => {
      const area = computeOpeningArea(1, 2, 0);
      expect(area).toBe(0);
    });
  });
  
  describe('computeSpaceGeometry', () => {
    const gridSystem: GridSystem = {
      gridX: [
        { label: 'A', offset: 0 },
        { label: 'B', offset: 5 },
      ],
      gridY: [
        { label: '1', offset: 0 },
        { label: '2', offset: 6 },
      ],
    };
    
    test('should compute gridRect space', () => {
      const space: Space = {
        id: 'space1',
        name: 'Room 101',
        levelId: 'level1',
        boundary: {
          type: 'gridRect',
          data: {
            gridX: ['A', 'B'],
            gridY: ['1', '2'],
          } as GridRectBoundary,
        },
        computed: { area_m2: 0, perimeter_m: 0 },
        tags: [],
      };
      
      const result = computeSpaceGeometry(space, gridSystem);
      
      expect(result.area_m2).toBe(30);
      expect(result.perimeter_m).toBe(22);
    });
    
    test('should compute polygon space', () => {
      const space: Space = {
        id: 'space2',
        name: 'Room 102',
        levelId: 'level1',
        boundary: {
          type: 'polygon',
          data: {
            points: [
              [0, 0],
              [4, 0],
              [4, 5],
              [0, 5],
            ],
          } as PolygonBoundary,
        },
        computed: { area_m2: 0, perimeter_m: 0 },
        tags: [],
      };
      
      const result = computeSpaceGeometry(space, gridSystem);
      
      expect(result.area_m2).toBe(20);
      expect(result.perimeter_m).toBe(18);
    });
  });
});
