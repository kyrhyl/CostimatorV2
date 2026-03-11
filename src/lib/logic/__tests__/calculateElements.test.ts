/**
 * INTEGRATION TESTS - Structural Elements Calculation
 * 
 * Verifies that calculateElements produces results matching BuildingEstimate implementation
 * 
 * Test Strategy:
 * 1. Create mock project with known quantities
 * 2. Run calculations through calculateElements
 * 3. Verify outputs match expected values
 * 4. Check TakeoffLine format, formulas, and assumptions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateStructuralElements,
  type ElementsCalculationInput,
} from '../calculateElements';
import type {
  IElementTemplate,
  IElementInstance,
  ILevel,
  IGridLine,
  IProjectSettings,
} from '@/models/Project';
import type { TakeoffLine } from '@/types';

describe('calculateElements - BuildingEstimate Alignment', () => {
  
  let testInput: ElementsCalculationInput;
  
  beforeEach(() => {
    // Create a minimal test project with known grid, levels, and elements
    testInput = {
      gridX: [
        { label: 'A', offset: 0 },
        { label: 'B', offset: 3 },
        { label: 'C', offset: 6 },
        { label: 'D', offset: 9 },
      ],
      gridY: [
        { label: '1', offset: 0 },
        { label: '2', offset: 4 },
        { label: '3', offset: 8 },
      ],
      levels: [
        { label: 'GF', elevation: 0 },
        { label: '2F', elevation: 3.5 },
        { label: 'RF', elevation: 7.0 },
      ],
      elementTemplates: [],
      elementInstances: [],
      settings: {
        rounding: {
          concrete: 2,
          rebar: 2,
          formwork: 2,
        },
        waste: {
          concrete: 0.05,
          rebar: 0.05,
          formwork: 0.05,
        },
      },
    };
  });

  describe('Beam Calculations', () => {
    it('should calculate beam along X-axis (A-C @ 1) correctly', () => {
      // Template: 300mm x 500mm beam
      const beamTemplate: IElementTemplate = {
        id: 'tmpl-beam-001',
        type: 'beam',
        name: 'Beam 300x500',
        properties: new Map([
          ['width', 0.30],
          ['height', 0.50],
        ]),
        rebarConfig: {
          mainBars: { diameter: 16, count: 6 },
          stirrups: { diameter: 10, spacing: 0.15 },
          dpwhRebarItem: '401 (3)',
        },
        dpwhItemNumber: '301 (1) b',
      } as IElementTemplate;

      // Instance: Grid A to C (6m span) at grid line 1
      const beamInstance: IElementInstance = {
        id: 'inst-beam-001',
        templateId: 'tmpl-beam-001',
        placement: {
          levelId: 'GF',
          gridRef: ['A-C', '1'],
        },
        tags: ['structural'],
      } as IElementInstance;

      testInput.elementTemplates = [beamTemplate];
      testInput.elementInstances = [beamInstance];

      const result = calculateStructuralElements(testInput);

      // Should have 3 takeoff lines: concrete, rebar_main, formwork
      expect(result.takeoffLines.length).toBeGreaterThanOrEqual(3);

      // Find concrete line
      const concreteLine = result.takeoffLines.find(
        (line) => line.id === 'tof_inst-beam-001_concrete'
      );
      expect(concreteLine).toBeDefined();
      expect(concreteLine?.trade).toBe('Concrete');
      expect(concreteLine?.unit).toBe('m³');
      
      // Volume = 0.30 * 0.50 * 6.0 = 0.90 cu.m. + 5% waste = 0.945 cu.m.
      expect(concreteLine?.quantity).toBeCloseTo(0.95, 2);
      expect(concreteLine?.formulaText).toContain('0.3 × 0.5 × 6');

      // Find rebar line
      const rebarLine = result.takeoffLines.find(
        (line) => line.id === 'tof_inst-beam-001_rebar_main'
      );
      expect(rebarLine).toBeDefined();
      expect(rebarLine?.trade).toBe('Rebar');
      expect(rebarLine?.unit).toBe('kg');
      
      // 6 bars x 16mm dia x 6m length
      // Weight (16mm @ 1.58 kg/m): 6 * 6.0 * 1.58 ≈ 56.88 kg
      expect(rebarLine?.quantity).toBeGreaterThan(50);

      // Find formwork line - NO WASTE applied to formwork (BuildingEstimate standard)
      const formworkLine = result.takeoffLines.find(
        (line) => line.id === 'tof_inst-beam-001_formwork'
      );
      expect(formworkLine).toBeDefined();
      expect(formworkLine?.trade).toBe('Formwork');
      expect(formworkLine?.unit).toBe('m²');
      
      // Formwork area = bottom + 2 sides = (0.30 × 6.0) + (2 × 0.50 × 6.0) = 7.80 m² (NO WASTE)
      expect(formworkLine?.quantity).toBeCloseTo(7.80, 2);
    });

    it('should calculate beam along Y-axis (B @ 1-3) correctly', () => {
      const beamTemplate: IElementTemplate = {
        id: 'tmpl-beam-002',
        type: 'beam',
        name: 'Beam 250x400',
        properties: new Map([
          ['width', 0.25],
          ['height', 0.40],
        ]),
        dpwhItemNumber: '301 (1) b',
      } as IElementTemplate;

      // Instance: Grid 1 to 3 (8m span) at grid line B
      const beamInstance: IElementInstance = {
        id: 'inst-beam-002',
        templateId: 'tmpl-beam-002',
        placement: {
          levelId: 'GF',
          gridRef: ['B', '1-3'],
        },
        tags: [],
      } as IElementInstance;

      testInput.elementTemplates = [beamTemplate];
      testInput.elementInstances = [beamInstance];

      const result = calculateStructuralElements(testInput);

      const concreteLine = result.takeoffLines.find(
        (line) => line.id === 'tof_inst-beam-002_concrete'
      );
      
      // Volume = 0.25 * 0.40 * 8.0 = 0.80 cu.m. + 5% waste = 0.84 cu.m.
      expect(concreteLine?.quantity).toBeCloseTo(0.84, 2);
      expect(concreteLine?.formulaText).toContain('0.25 × 0.4 × 8');
    });
  });

  describe('Column Calculations', () => {
    it('should calculate column with explicit endLevel', () => {
      const columnTemplate: IElementTemplate = {
        id: 'tmpl-col-001',
        type: 'column',
        name: 'Column 400x400',
        properties: new Map([
          ['width', 0.40],
          ['depth', 0.40],
        ]),
        rebarConfig: {
          mainBars: { diameter: 20, count: 8 },
          ties: { diameter: 10, spacing: 0.15 },
          dpwhRebarItem: '401 (3)',
        },
        dpwhItemNumber: '301 (1) b',
      } as IElementTemplate;

      const columnInstance: IElementInstance = {
        id: 'inst-col-001',
        templateId: 'tmpl-col-001',
        placement: {
          levelId: 'GF',
          endLevelId: '2F',
          gridRef: ['B', '2'],
        },
        tags: [],
      } as IElementInstance;

      testInput.elementTemplates = [columnTemplate];
      testInput.elementInstances = [columnInstance];

      const result = calculateStructuralElements(testInput);

      const concreteLine = result.takeoffLines.find(
        (line) => line.id === 'tof_inst-col-001_concrete'
      );
      
      // Height: GF (0) to 2F (3.5) = 3.5m
      // Volume = 0.40 * 0.40 * 3.5 = 0.56 cu.m. + 5% waste = 0.588 cu.m.
      expect(concreteLine?.quantity).toBeCloseTo(0.59, 2);
      expect(concreteLine?.assumptions.join(' ')).toMatch(/3\.5/);

      // Formwork - NO WASTE
      const formworkLine = result.takeoffLines.find(
        (line) => line.id === 'tof_inst-col-001_formwork'
      );
      // Formwork = 4 sides * 0.40 * 3.5 = 5.60 m²
      expect(formworkLine?.quantity).toBeCloseTo(5.60, 2);
    });

    it('should auto-detect column height when endLevel not specified', () => {
      const columnTemplate: IElementTemplate = {
        id: 'tmpl-col-002',
        type: 'column',
        name: 'Column 300x300',
        properties: new Map([
          ['width', 0.30],
          ['depth', 0.30],
        ]),
        dpwhItemNumber: '301 (1) b',
      } as IElementTemplate;

      // No endLevelId specified - should auto-detect to 2F
      const columnInstance: IElementInstance = {
        id: 'inst-col-002',
        templateId: 'tmpl-col-002',
        placement: {
          levelId: 'GF',
          gridRef: ['A', '1'],
        },
        tags: [],
      } as IElementInstance;

      testInput.elementTemplates = [columnTemplate];
      testInput.elementInstances = [columnInstance];

      const result = calculateStructuralElements(testInput);

      const concreteLine = result.takeoffLines.find(
        (line) => line.id === 'tof_inst-col-002_concrete'
      );
      
      // Should auto-detect GF -> 2F (3.5m)
      // Volume = 0.30 * 0.30 * 3.5 = 0.315 cu.m. + 5% waste = 0.331 cu.m.
      expect(concreteLine?.quantity).toBeCloseTo(0.33, 2);
      expect(concreteLine?.assumptions.join(' ')).toMatch(/GF.*2F/);
    });

    it('should skip top-floor columns with warning', () => {
      const columnTemplate: IElementTemplate = {
        id: 'tmpl-col-003',
        type: 'column',
        name: 'Column 400x400',
        properties: new Map([
          ['width', 0.40],
          ['depth', 0.40],
        ]),
        dpwhItemNumber: '301 (1) b',
      } as IElementTemplate;

      // Column at roof level with no endLevel - should skip
      const columnInstance: IElementInstance = {
        id: 'inst-col-003',
        templateId: 'tmpl-col-003',
        placement: {
          levelId: 'RF',
          gridRef: ['C', '3'],
        },
        tags: [],
      } as IElementInstance;

      testInput.elementTemplates = [columnTemplate];
      testInput.elementInstances = [columnInstance];

      const result = calculateStructuralElements(testInput);

      // Should produce error message about top floor column
      expect(result.errors[0]).toContain('inst-col-003');
      expect(result.errors[0]).toContain('top floor');
      expect(result.takeoffLines.length).toBe(0);
    });
  });

  describe('Slab Calculations', () => {
    it('should calculate rectangular slab with secondary rebar', () => {
      const slabTemplate: IElementTemplate = {
        id: 'tmpl-slab-001',
        type: 'slab',
        name: 'Slab 120mm',
        properties: new Map([
          ['thickness', 0.12],
        ]),
        rebarConfig: {
          mainBars: { diameter: 12, spacing: 0.15 },
          secondaryBars: { diameter: 12, spacing: 0.15 },
          dpwhRebarItem: '401 (3)',
        },
        dpwhItemNumber: '301 (1) b',
      } as IElementTemplate;

      // Slab from A-C (6m) x 1-3 (8m) = 48 sq.m.
      const slabInstance: IElementInstance = {
        id: 'inst-slab-001',
        templateId: 'tmpl-slab-001',
        placement: {
          levelId: '2F',
          gridRef: ['A-C', '1-3'],
        },
        tags: [],
      } as IElementInstance;

      testInput.elementTemplates = [slabTemplate];
      testInput.elementInstances = [slabInstance];

      const result = calculateStructuralElements(testInput);

      // Concrete
      const concreteLine = result.takeoffLines.find(
        (line) => line.id === 'tof_inst-slab-001_concrete'
      );
      // Volume = 6.0 * 8.0 * 0.12 = 5.76 cu.m. + 5% waste = 6.05 cu.m.
      expect(concreteLine?.quantity).toBeCloseTo(6.05, 2);

      // Main rebar (along X direction) - should have "Direction: X" or similar assumption
      const mainRebarLine = result.takeoffLines.find(
        (line) => line.id === 'tof_inst-slab-001_rebar_main'
      );
      expect(mainRebarLine).toBeDefined();
      // Check for meaningful assumptions (waste, DPWH item, grade)
      expect(mainRebarLine?.assumptions.length).toBeGreaterThan(0);

      // Secondary rebar (along Y direction) - NEW FEATURE
      const secondaryRebarLine = result.takeoffLines.find(
        (line) => line.id === 'tof_inst-slab-001_rebar_secondary'
      );
      expect(secondaryRebarLine).toBeDefined();
      // Secondary rebar should exist and have assumptions
      expect(secondaryRebarLine?.assumptions.length).toBeGreaterThan(0);

      // Formwork (soffit only) - NO WASTE
      const formworkLine = result.takeoffLines.find(
        (line) => line.id === 'tof_inst-slab-001_formwork'
      );
      // Area = 6.0 * 8.0 = 48.0 sq.m.
      expect(formworkLine?.quantity).toBeCloseTo(48.0, 2);
    });

    it('should handle slabs with count-based rebar instead of spacing', () => {
      const slabTemplate: IElementTemplate = {
        id: 'tmpl-slab-002',
        type: 'slab',
        name: 'Slab 150mm',
        properties: new Map([
          ['thickness', 0.15],
        ]),
        rebarConfig: {
          mainBars: { diameter: 16, count: 20 }, // Count instead of spacing
          dpwhRebarItem: '401 (3)',
        },
        dpwhItemNumber: '301 (1) b',
      } as IElementTemplate;

      const slabInstance: IElementInstance = {
        id: 'inst-slab-002',
        templateId: 'tmpl-slab-002',
        placement: {
          levelId: '2F',
          gridRef: ['B-D', '1-2'],
        },
        tags: [],
      } as IElementInstance;

      testInput.elementTemplates = [slabTemplate];
      testInput.elementInstances = [slabInstance];

      const result = calculateStructuralElements(testInput);

      const mainRebarLine = result.takeoffLines.find(
        (line) => line.id === 'tof_inst-slab-002_rebar_main'
      );
      
      expect(mainRebarLine).toBeDefined();
      // Should show bar count in formula
      expect(mainRebarLine?.formulaText).toMatch(/\d+ bars/);
    });
  });

  describe('Foundation Calculations', () => {
    it('should calculate spread footing correctly', () => {
      const foundationTemplate: IElementTemplate = {
        id: 'tmpl-fdn-001',
        type: 'foundation',
        name: 'Footing 1500x1500x600',
        properties: new Map([
          ['length', 1.5],
          ['width', 1.5],
          ['depth', 0.6],  // Note: foundation uses 'depth' not 'thickness'
        ]),
        rebarConfig: {
          mainBars: { diameter: 16, count: 10 },
          dpwhRebarItem: '401 (3)',
        },
        dpwhItemNumber: '301 (1) b',
      } as IElementTemplate;

      const foundationInstance: IElementInstance = {
        id: 'inst-fdn-001',
        templateId: 'tmpl-fdn-001',
        placement: {
          levelId: 'GF',
          gridRef: ['A', '1'],
        },
        tags: [],
      } as IElementInstance;

      testInput.elementTemplates = [foundationTemplate];
      testInput.elementInstances = [foundationInstance];

      const result = calculateStructuralElements(testInput);

      const concreteLine = result.takeoffLines.find(
        (line) => line.id === 'tof_inst-fdn-001_concrete'
      );
      
      // Volume = 1.5 * 1.5 * 0.6 = 1.35 cu.m. + 5% waste = 1.42 cu.m.
      expect(concreteLine?.quantity).toBeCloseTo(1.42, 2);

      // Formwork (perimeter * height) - NO WASTE
      const formworkLine = result.takeoffLines.find(
        (line) => line.id === 'tof_inst-fdn-001_formwork'
      );
      // Formwork = 2 * (1.5 + 1.5) * 0.6 = 3.60 m²
      expect(formworkLine?.quantity).toBeCloseTo(3.60, 2);
    });
  });

  describe('TakeoffLine Format Validation', () => {
    it('should use predictable ID format: tof_{instanceId}_{type}', () => {
      const beamTemplate: IElementTemplate = {
        id: 'tmpl-test',
        type: 'beam',
        name: 'Test Beam',
        properties: new Map([['width', 0.30], ['height', 0.50]]),
        dpwhItemNumber: '301 (1) b',
      } as IElementTemplate;

      const beamInstance: IElementInstance = {
        id: 'my-instance-id-123',
        templateId: 'tmpl-test',
        placement: {
          levelId: 'GF',
          gridRef: ['A-B', '1'],
        },
        tags: [],
      } as IElementInstance;

      testInput.elementTemplates = [beamTemplate];
      testInput.elementInstances = [beamInstance];

      const result = calculateStructuralElements(testInput);

      // Check ID format
      result.takeoffLines.forEach((line) => {
        expect(line.id).toMatch(/^tof_my-instance-id-123_(concrete|rebar_\w+|formwork)$/);
      });
    });

    it('should include descriptive assumptions', () => {
      const columnTemplate: IElementTemplate = {
        id: 'tmpl-col',
        type: 'column',
        name: 'Column 400x400',
        properties: new Map([['width', 0.40], ['depth', 0.40]]),
        dpwhItemNumber: '301 (1) b',
      } as IElementTemplate;

      const columnInstance: IElementInstance = {
        id: 'inst-col',
        templateId: 'tmpl-col',
        placement: {
          levelId: 'GF',
          endLevelId: '2F',
          gridRef: ['B', '2'],
        },
        tags: [],
      } as IElementInstance;

      testInput.elementTemplates = [columnTemplate];
      testInput.elementInstances = [columnInstance];

      const result = calculateStructuralElements(testInput);

      const concreteLine = result.takeoffLines.find(
        (line) => line.id === 'tof_inst-col_concrete'
      );

      // Should have descriptive assumption with level info
      expect(concreteLine?.assumptions.length).toBeGreaterThan(0);
      expect(concreteLine?.assumptions.join(' ')).toMatch(/Height.*GF.*2F.*3\.50/);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing template gracefully', () => {
      const beamInstance: IElementInstance = {
        id: 'inst-orphan',
        templateId: 'non-existent-template',
        placement: {
          levelId: 'GF',
          gridRef: ['A-B', '1'],
        },
        tags: [],
      } as IElementInstance;

      testInput.elementInstances = [beamInstance];

      const result = calculateStructuralElements(testInput);

      // Should produce error about missing template
      expect(result.errors[0]).toContain('non-existent-template');
      expect(result.errors[0]).toContain('Template not found');
      expect(result.takeoffLines.length).toBe(0);
    });

    it('should handle invalid grid references', () => {
      const beamTemplate: IElementTemplate = {
        id: 'tmpl-beam',
        type: 'beam',
        name: 'Beam',
        properties: new Map([['width', 0.30], ['height', 0.50]]),
        dpwhItemNumber: '301 (1) b',
      } as IElementTemplate;

      const beamInstance: IElementInstance = {
        id: 'inst-invalid',
        templateId: 'tmpl-beam',
        placement: {
          levelId: 'GF',
          gridRef: ['Z-Q', '99'], // Invalid grid labels
        },
        tags: [],
      } as IElementInstance;

      testInput.elementTemplates = [beamTemplate];
      testInput.elementInstances = [beamInstance];

      const result = calculateStructuralElements(testInput);

      // Should handle gracefully with warning
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Property Access Compatibility', () => {
    it('should handle both Map and plain object properties', () => {
      const beamTemplateWithMap: IElementTemplate = {
        id: 'tmpl-map',
        type: 'beam',
        name: 'Beam with Map',
        properties: new Map([['width', 0.30], ['height', 0.50]]),
        dpwhItemNumber: '301 (1) b',
      } as IElementTemplate;

      const beamTemplateWithObject: IElementTemplate = {
        id: 'tmpl-obj',
        type: 'beam',
        name: 'Beam with Object',
        properties: { width: 0.30, height: 0.50 } as any,
        dpwhItemNumber: '301 (1) b',
      } as IElementTemplate;

      const instance1: IElementInstance = {
        id: 'inst-1',
        templateId: 'tmpl-map',
        placement: { levelId: 'GF', gridRef: ['A-B', '1'] },
        tags: [],
      } as IElementInstance;

      const instance2: IElementInstance = {
        id: 'inst-2',
        templateId: 'tmpl-obj',
        placement: { levelId: 'GF', gridRef: ['B-C', '1'] },
        tags: [],
      } as IElementInstance;

      testInput.elementTemplates = [beamTemplateWithMap, beamTemplateWithObject];
      testInput.elementInstances = [instance1, instance2];

      const result = calculateStructuralElements(testInput);

      // Both should produce valid results
      expect(result.takeoffLines.length).toBeGreaterThan(0);
      expect(result.errors.length).toBe(0);
      
      const line1 = result.takeoffLines.find(l => l.id === 'tof_inst-1_concrete');
      const line2 = result.takeoffLines.find(l => l.id === 'tof_inst-2_concrete');
      
      // Same dimensions should produce same quantities
      expect(line1?.quantity).toBeCloseTo(line2?.quantity || 0, 2);
    });
  });
});
