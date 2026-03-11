/**
 * UNIT TESTS - Finishing Works Takeoff
 * Testing pure math functions for finish quantity calculation
 */

import {
  computeFloorFinishTakeoff,
  computeCeilingFinishTakeoff,
  computeWallFinishTakeoff,
  applyWasteAndRounding,
} from '../takeoff';
import type { Space, Opening, FinishType, SpaceFinishAssignment } from '@/types';

describe('Finishing Works - Takeoff Calculations', () => {
  
  const mockSpace: Space = {
    id: 'space1',
    name: 'Living Room',
    levelId: 'level1',
    boundary: {
      type: 'gridRect',
      data: { gridX: ['A', 'B'], gridY: ['1', '2'] },
    },
    computed: {
      area_m2: 30,
      perimeter_m: 22,
    },
    tags: [],
  };
  
  const mockFloorFinish: FinishType = {
    id: 'finish1',
    category: 'floor',
    finishName: 'Ceramic Tile',
    dpwhItemNumberRaw: '701 (1) a',
    unit: 'Square Meter',
    assumptions: {
      wastePercent: 0.05,
      rounding: 2,
    },
  };
  
  const mockWallFinish: FinishType = {
    id: 'finish2',
    category: 'wall',
    finishName: 'Paint on Concrete',
    dpwhItemNumberRaw: '802 (1) a',
    unit: 'Square Meter',
    wallHeightRule: {
      mode: 'fullHeight',
    },
    deductionRule: {
      enabled: true,
      minOpeningAreaToDeduct_m2: 0.5,
      includeTypes: ['door', 'window'],
    },
    assumptions: {
      rounding: 2,
    },
  };
  
  const mockAssignment: SpaceFinishAssignment = {
    id: 'assign1',
    spaceId: 'space1',
    finishTypeId: 'finish1',
    scope: 'base',
  };
  
  describe('computeFloorFinishTakeoff', () => {
    test('should calculate floor area without waste', () => {
      const finishNoWaste: FinishType = {
        ...mockFloorFinish,
        assumptions: { rounding: 2 },
      };
      
      const result = computeFloorFinishTakeoff({
        space: mockSpace,
        finishType: finishNoWaste,
        assignment: mockAssignment,
      });
      
      expect(result.quantity).toBe(30);
      expect(result.unit).toBe('Square Meter');
      expect(result.trade).toBe('Finishes');
      expect(result.resourceKey).toBe('floor-finish1');
      expect(result.formulaText).toContain('Floor finish area');
      expect(result.tags).toContain('category:floor');
      expect(result.tags).toContain('space:space1');
    });
    
    test('should apply waste percentage', () => {
      const result = computeFloorFinishTakeoff({
        space: mockSpace,
        finishType: mockFloorFinish,
        assignment: mockAssignment,
      });
      
      expect(result.quantity).toBe(31.5); // 30 × 1.05
      expect(result.assumptions).toContain('Waste: 5.0%');
      expect(result.inputsSnapshot.waste).toBe(0.05);
    });
    
    test('should use override waste from assignment', () => {
      const assignmentWithOverride: SpaceFinishAssignment = {
        ...mockAssignment,
        overrides: { wastePercent: 0.1 },
      };
      
      const result = computeFloorFinishTakeoff({
        space: mockSpace,
        finishType: mockFloorFinish,
        assignment: assignmentWithOverride,
      });
      
      expect(result.quantity).toBe(33); // 30 × 1.10
      expect(result.assumptions).toContain('Waste: 10.0%');
    });
  });
  
  describe('computeCeilingFinishTakeoff', () => {
    test('should calculate ceiling area', () => {
      const ceilingFinish: FinishType = {
        ...mockFloorFinish,
        category: 'ceiling',
        finishName: 'Gypsum Board Ceiling',
      };
      
      const result = computeCeilingFinishTakeoff({
        space: mockSpace,
        finishType: ceilingFinish,
        assignment: mockAssignment,
      });
      
      expect(result.quantity).toBe(31.5); // 30 × 1.05
      expect(result.tags).toContain('category:ceiling');
    });
    
    test('should return zero for open-to-below spaces', () => {
      const ceilingFinish: FinishType = {
        ...mockFloorFinish,
        category: 'ceiling',
      };
      
      const result = computeCeilingFinishTakeoff({
        space: mockSpace,
        finishType: ceilingFinish,
        assignment: mockAssignment,
        isOpenToBelow: true,
      });
      
      expect(result.quantity).toBe(0);
      expect(result.formulaText).toContain('open to below');
      expect(result.assumptions).toContain('Open to below: 0 area');
    });
  });
  
  describe('computeWallFinishTakeoff', () => {
    const mockOpenings: Opening[] = [
      {
        id: 'door1',
        levelId: 'level1',
        spaceId: 'space1',
        type: 'door',
        width_m: 0.9,
        height_m: 2.1,
        qty: 2,
        computed: { area_m2: 3.78 }, // 0.9 × 2.1 × 2
        tags: [],
      },
      {
        id: 'window1',
        levelId: 'level1',
        spaceId: 'space1',
        type: 'window',
        width_m: 1.2,
        height_m: 1.5,
        qty: 3,
        computed: { area_m2: 5.4 }, // 1.2 × 1.5 × 3
        tags: [],
      },
      {
        id: 'vent1',
        levelId: 'level1',
        spaceId: 'space1',
        type: 'vent',
        width_m: 0.3,
        height_m: 0.3,
        qty: 1,
        computed: { area_m2: 0.09 }, // too small to deduct
        tags: [],
      },
    ];
    
    test('should calculate wall area with full storey height', () => {
      const storeyHeight = 3.0;
      
      const result = computeWallFinishTakeoff({
        space: mockSpace,
        finishType: mockWallFinish,
        assignment: mockAssignment,
        openings: mockOpenings,
        storeyHeight_m: storeyHeight,
      });
      
      const grossArea = 22 * 3.0; // 66 m²
      const deductions = 3.78 + 5.4; // 9.18 m² (vent not deducted - below min)
      const netArea = grossArea - deductions; // 56.82 m²
      
      expect(result.quantity).toBe(56.82);
      expect(result.inputsSnapshot.grossWallArea).toBe(66);
      expect(result.inputsSnapshot.openingDeduction).toBe(9.18);
      expect(result.assumptions).toContain('Storey height: 3m');
      expect(result.assumptions).toContain('Openings deducted: 2 (9.180m²)');
    });
    
    test('should use fixed wall height', () => {
      const fixedHeightFinish: FinishType = {
        ...mockWallFinish,
        wallHeightRule: {
          mode: 'fixed',
          value_m: 1.2, // wainscot height
        },
      };
      
      const result = computeWallFinishTakeoff({
        space: mockSpace,
        finishType: fixedHeightFinish,
        assignment: mockAssignment,
        openings: [],
        storeyHeight_m: 3.0,
      });
      
      const expectedArea = 22 * 1.2; // 26.4 m²
      
      expect(result.quantity).toBe(26.4);
      expect(result.inputsSnapshot.height_m).toBe(1.2);
      expect(result.assumptions).toContain('Fixed height: 1.2m');
    });
    
    test('should not deduct openings when disabled', () => {
      const noDeductionFinish: FinishType = {
        ...mockWallFinish,
        deductionRule: {
          enabled: false,
          minOpeningAreaToDeduct_m2: 0.5,
          includeTypes: [],
        },
      };
      
      const result = computeWallFinishTakeoff({
        space: mockSpace,
        finishType: noDeductionFinish,
        assignment: mockAssignment,
        openings: mockOpenings,
        storeyHeight_m: 3.0,
      });
      
      expect(result.quantity).toBe(66); // no deductions
      expect(result.inputsSnapshot.openingDeduction).toBe(0);
    });
    
    test('should filter openings by minimum area', () => {
      const finishWithHigherMin: FinishType = {
        ...mockWallFinish,
        deductionRule: {
          enabled: true,
          minOpeningAreaToDeduct_m2: 5.0, // only window qualifies (5.4m²)
          includeTypes: ['door', 'window'],
        },
      };
      
      const result = computeWallFinishTakeoff({
        space: mockSpace,
        finishType: finishWithHigherMin,
        assignment: mockAssignment,
        openings: mockOpenings,
        storeyHeight_m: 3.0,
      });
      
      expect(result.inputsSnapshot.openingDeduction).toBe(5.4); // only window
      expect(result.assumptions).toContain('Openings deducted: 1 (5.400m²)');
    });
    
    test('should filter openings by type', () => {
      const doorsOnlyFinish: FinishType = {
        ...mockWallFinish,
        deductionRule: {
          enabled: true,
          minOpeningAreaToDeduct_m2: 0.5,
          includeTypes: ['door'], // only doors
        },
      };
      
      const result = computeWallFinishTakeoff({
        space: mockSpace,
        finishType: doorsOnlyFinish,
        assignment: mockAssignment,
        openings: mockOpenings,
        storeyHeight_m: 3.0,
      });
      
      expect(result.inputsSnapshot.openingDeduction).toBe(3.78); // only doors
    });
    
    test('should apply waste after deductions', () => {
      const finishWithWaste: FinishType = {
        ...mockWallFinish,
        assumptions: {
          wastePercent: 0.1, // 10% waste
          rounding: 2,
        },
      };
      
      const result = computeWallFinishTakeoff({
        space: mockSpace,
        finishType: finishWithWaste,
        assignment: mockAssignment,
        openings: mockOpenings,
        storeyHeight_m: 3.0,
      });
      
      const grossArea = 22 * 3.0; // 66 m²
      const deductions = 3.78 + 5.4; // 9.18 m²
      const netArea = grossArea - deductions; // 56.82 m²
      const withWaste = netArea * 1.1; // 62.502 m²
      
      expect(result.quantity).toBe(62.5); // rounded to 2 decimals
      expect(result.assumptions).toContain('Waste: 10.0%');
    });
  });
  
  describe('applyWasteAndRounding', () => {
    test('should apply waste and round', () => {
      const result = applyWasteAndRounding(100, 0.05, 2);
      expect(result).toBe(105);
    });
    
    test('should handle no waste', () => {
      const result = applyWasteAndRounding(100.456, 0, 2);
      expect(result).toBe(100.46);
    });
    
    test('should use default rounding', () => {
      const result = applyWasteAndRounding(100.12345);
      expect(result).toBe(100.123);
    });
  });
});
