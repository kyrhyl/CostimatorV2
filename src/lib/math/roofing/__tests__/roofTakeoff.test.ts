/**
 * Unit Tests for Roofing Takeoff Calculations
 * Tests for computeRoofCoverTakeoff with various scenarios
 */

import { computeRoofCoverTakeoff } from '../roofTakeoff';
import type { RoofPlane, RoofType } from '@/types';

describe('Roof Takeoff Calculations', () => {
  const mockRoofPlane: RoofPlane = {
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
    slope: { mode: 'ratio', value: 0.25 }, // 1:4 slope
    roofTypeId: 'rt1',
    computed: {
      planArea_m2: 50.0,
      slopeFactor: 1.0308,
      slopeArea_m2: 51.54, // 50 × 1.0308
    },
    tags: ['zone:main'],
  };

  describe('computeRoofCoverTakeoff', () => {
    it('should calculate quantity based on slope area with lap and waste', () => {
      const roofType: RoofType = {
        id: 'rt1',
        name: 'Corrugated GI Sheet',
        dpwhItemNumberRaw: '1013',
        unit: 'Square Meter',
        areaBasis: 'slopeArea',
        lapAllowancePercent: 0.10, // 10% lap
        wastePercent: 0.05, // 5% waste
        assumptions: {},
      };

      const takeoffLine = computeRoofCoverTakeoff(mockRoofPlane, roofType);

      // qty = slopeArea × (1 + lap + waste) = 51.54 × 1.15 = 59.271
      expect(takeoffLine.quantity).toBeCloseTo(59.271, 3);
      expect(takeoffLine.unit).toBe('Square Meter');
      expect(takeoffLine.trade).toBe('Roofing');
      expect(takeoffLine.tags).toContain('dpwh:1013');
      expect(takeoffLine.tags).toContain('roofPlane:Main Roof');
    });

    it('should calculate quantity based on plan area when specified', () => {
      const roofType: RoofType = {
        id: 'rt2',
        name: 'Clay Roof Tile',
        dpwhItemNumberRaw: '1015',
        unit: 'Square Meter',
        areaBasis: 'planArea',
        lapAllowancePercent: 0.15, // 15% lap
        wastePercent: 0.10, // 10% waste
        assumptions: {},
      };

      const takeoffLine = computeRoofCoverTakeoff(mockRoofPlane, roofType);

      // qty = planArea × (1 + lap + waste) = 50 × 1.25 = 62.5
      expect(takeoffLine.quantity).toBe(62.5);
      expect(takeoffLine.unit).toBe('Square Meter');
      expect(takeoffLine.tags).toContain('dpwh:1015');
    });

    it('should include formula text with correct values', () => {
      const roofType: RoofType = {
        id: 'rt3',
        name: 'Metal Sheet',
        dpwhItemNumberRaw: '1014',
        unit: 'Square Meter',
        areaBasis: 'slopeArea',
        lapAllowancePercent: 0.08,
        wastePercent: 0.03,
        assumptions: {},
      };

      const takeoffLine = computeRoofCoverTakeoff(mockRoofPlane, roofType);

      expect(takeoffLine.formulaText).toContain('slopeArea');
      expect(takeoffLine.formulaText).toContain('1.110'); // 1 + 0.08 + 0.03
      expect(takeoffLine.formulaText).toContain(takeoffLine.quantity.toFixed(2));
    });

    it('should include correct inputs snapshot', () => {
      const roofType: RoofType = {
        id: 'rt4',
        name: 'Asphalt Shingles',
        dpwhItemNumberRaw: '1056',
        unit: 'Square Meter',
        areaBasis: 'slopeArea',
        lapAllowancePercent: 0.12,
        wastePercent: 0.07,
        assumptions: {},
      };

      const takeoffLine = computeRoofCoverTakeoff(mockRoofPlane, roofType);

      expect(takeoffLine.inputsSnapshot.planArea_m2).toBe(50.0);
      expect(takeoffLine.inputsSnapshot.slopeFactor).toBeCloseTo(1.0308, 4);
      expect(takeoffLine.inputsSnapshot.slopeArea_m2).toBeCloseTo(51.54, 2);
      expect(takeoffLine.inputsSnapshot.lapPercent).toBe(0.12);
      expect(takeoffLine.inputsSnapshot.wastePercent).toBe(0.07);
    });

    it('should include assumptions in takeoff line', () => {
      const roofType: RoofType = {
        id: 'rt5',
        name: 'Pre-painted Metal',
        dpwhItemNumberRaw: '1014',
        unit: 'Square Meter',
        areaBasis: 'slopeArea',
        lapAllowancePercent: 0.10,
        wastePercent: 0.05,
        assumptions: {
          accessoriesBundled: true,
          fastenersIncluded: true,
          notes: 'Include ridge caps and valleys',
        },
      };

      const takeoffLine = computeRoofCoverTakeoff(mockRoofPlane, roofType);

      expect(takeoffLine.assumptions).toContain('Area basis: slopeArea');
      expect(takeoffLine.assumptions).toContain('Lap allowance: 10.0%');
      expect(takeoffLine.assumptions).toContain('Waste: 5.0%');
      expect(takeoffLine.assumptions).toContain('Accessories bundled (ridges, valleys, etc.)');
      expect(takeoffLine.assumptions).toContain('Fasteners included');
      expect(takeoffLine.assumptions).toContain('Include ridge caps and valleys');
    });

    it('should handle zero lap and waste (no adjustments)', () => {
      const roofType: RoofType = {
        id: 'rt6',
        name: 'Concrete Tile',
        dpwhItemNumberRaw: '1037',
        unit: 'Square Meter',
        areaBasis: 'slopeArea',
        lapAllowancePercent: 0,
        wastePercent: 0,
        assumptions: {},
      };

      const takeoffLine = computeRoofCoverTakeoff(mockRoofPlane, roofType);

      // qty = slopeArea × 1.0 = 51.54
      expect(takeoffLine.quantity).toBeCloseTo(51.54, 2);
    });

    it('should include slope information in assumptions', () => {
      const roofPlaneWithDegrees: RoofPlane = {
        ...mockRoofPlane,
        slope: { mode: 'degrees', value: 18.43 },
      };

      const roofType: RoofType = {
        id: 'rt7',
        name: 'Test Roof',
        dpwhItemNumberRaw: '1013',
        unit: 'Square Meter',
        areaBasis: 'slopeArea',
        lapAllowancePercent: 0.10,
        wastePercent: 0.05,
        assumptions: {},
      };

      const takeoffLine = computeRoofCoverTakeoff(roofPlaneWithDegrees, roofType);

      expect(takeoffLine.assumptions).toContain('Slope: 18.43°');
    });

    it('should generate unique IDs for each takeoff line', () => {
      const roofType: RoofType = {
        id: 'rt8',
        name: 'Test Roof',
        dpwhItemNumberRaw: '1013',
        unit: 'Square Meter',
        areaBasis: 'slopeArea',
        lapAllowancePercent: 0.10,
        wastePercent: 0.05,
        assumptions: {},
      };

      const line1 = computeRoofCoverTakeoff(mockRoofPlane, roofType);
      const line2 = computeRoofCoverTakeoff(mockRoofPlane, roofType);

      expect(line1.id).not.toBe(line2.id);
      expect(line1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });
});
