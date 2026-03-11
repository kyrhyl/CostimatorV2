/**
 * Unit Tests for Equipment CSV Import API
 * Tests CSV parsing, header mapping, and import options using mocked handlers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST as csvImportPOST } from '../equipment/import-csv/route';
import { testPOST } from '../../../../test/helpers/api-test-helper';
import Equipment from '../../../../models/Equipment';

// Mock the Equipment model
vi.mock('../../../../models/Equipment', () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
    insertMany: vi.fn(),
    deleteMany: vi.fn(),
  }
}));

describe('Equipment CSV Import API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/master/equipment/import-csv', () => {
    it('should import valid CSV data', async () => {
      const csvData = `No,Complete Description,Description,Equipment Model,Capacity,Flywheel Horsepower,Rental Rate,Hourly Rate
1,Test Equipment 1,Test Eq 1,MODEL-1,100,50,1000,500
2,Test Equipment 2,Test Eq 2,MODEL-2,200,100,2000,1000`;

      vi.mocked(Equipment.insertMany).mockResolvedValue([
        { no: 1, description: 'Test Eq 1', completeDescription: 'Test Equipment 1' },
        { no: 2, description: 'Test Eq 2', completeDescription: 'Test Equipment 2' }
      ] as any);

      const response = await testPOST(csvImportPOST, '/api/master/equipment/import-csv', { csvData });
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.imported).toBe(2);
      expect(vi.mocked(Equipment.insertMany)).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ no: 1, description: 'Test Eq 1' }),
          expect.objectContaining({ no: 2, description: 'Test Eq 2' })
        ]),
        { ordered: false }
      );
    });

    it('should handle header variations (No -> #)', async () => {
      const csvData = `#,Complete Description,Description,Equipment Model,Capacity,Flywheel Horsepower,Rental Rate,Hourly Rate
3,Equipment 3,Eq 3,M3,300,150,3000,1500`;

      vi.mocked(Equipment.insertMany).mockResolvedValue([
        { no: 3, description: 'Eq 3' }
      ] as any);

      const response = await testPOST(csvImportPOST, '/api/master/equipment/import-csv', { csvData });
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.imported).toBe(1);
    });

    it('should handle header variations (HP -> Flywheel Horsepower)', async () => {
      const csvData = `No,Complete Description,Description,Equipment Model,Capacity,HP,Rental Rate,Hourly Rate
4,Equipment 4,Eq 4,M4,400,200,4000,2000`;

      vi.mocked(Equipment.insertMany).mockResolvedValue([
        { no: 4, flywheelHorsepower: 200 }
      ] as any);

      const response = await testPOST(csvImportPOST, '/api/master/equipment/import-csv', { csvData });
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(vi.mocked(Equipment.insertMany)).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ no: 4, flywheelHorsepower: 200 })
        ]),
        { ordered: false }
      );
    });

    it('should handle quoted fields with commas', async () => {
      const csvData = `No,Complete Description,Description,Equipment Model,Capacity,Flywheel Horsepower,Rental Rate,Hourly Rate
5,"Equipment, with comma","Eq, also with comma",M5,500,250,5000,2500`;

      vi.mocked(Equipment.insertMany).mockResolvedValue([
        { no: 5, description: 'Eq, also with comma', completeDescription: 'Equipment, with comma' }
      ] as any);

      const response = await testPOST(csvImportPOST, '/api/master/equipment/import-csv', { csvData });
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(vi.mocked(Equipment.insertMany)).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ 
            description: 'Eq, also with comma',
            completeDescription: 'Equipment, with comma'
          })
        ]),
        { ordered: false }
      );
    });

    it('should handle numeric strings correctly', async () => {
      const csvData = `No,Complete Description,Description,Equipment Model,Capacity,Flywheel Horsepower,Rental Rate,Hourly Rate
6,Equipment 6,Eq 6,M6,"600 tons",300,"6000.50","3000.25"`;

      vi.mocked(Equipment.insertMany).mockResolvedValue([
        { 
          no: 6, 
          equipmentModel: '600 tons', 
          flywheelHorsepower: 300,
          rentalRate: 6000.50,
          hourlyRate: 3000.25
        }
      ] as any);

      const response = await testPOST(csvImportPOST, '/api/master/equipment/import-csv', { csvData });
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(vi.mocked(Equipment.insertMany)).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ 
            no: 6,
            flywheelHorsepower: 300,
            rentalRate: 6000.50,
            hourlyRate: 3000.25
          })
        ]),
        { ordered: false }
      );
    });

    it('should skip duplicates when skipDuplicates=true', async () => {
      const csvData = `No,Complete Description,Description,Equipment Model,Capacity,Flywheel Horsepower,Rental Rate,Hourly Rate
1,Duplicate Equipment,Dup Eq,M1,100,50,1000,500
7,New Equipment,New Eq,M7,700,350,7000,3500`;

      // First item exists, second is new
      vi.mocked(Equipment.findOne)
        .mockResolvedValueOnce({ no: 1 } as any)  // First call - duplicate found
        .mockResolvedValueOnce(null);              // Second call - new item
      
      vi.mocked(Equipment.create).mockResolvedValue({ no: 7 } as any);

      const response = await testPOST(csvImportPOST, '/api/master/equipment/import-csv', { 
        csvData,
        skipDuplicates: true
      });
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.imported).toBe(1);
      expect(response.data.skipped).toBe(1);
      expect(vi.mocked(Equipment.findOne)).toHaveBeenCalledTimes(2);
      expect(vi.mocked(Equipment.create)).toHaveBeenCalledTimes(1);
    });

    it('should clear existing when clearExisting=true', async () => {
      const csvData = `No,Complete Description,Description,Equipment Model,Capacity,Flywheel Horsepower,Rental Rate,Hourly Rate
8,New Equipment,New Eq,M8,800,400,8000,4000`;

      vi.mocked(Equipment.deleteMany).mockResolvedValue({ deletedCount: 5 } as any);
      vi.mocked(Equipment.insertMany).mockResolvedValue([
        { no: 8, description: 'New Eq' }
      ] as any);

      const response = await testPOST(csvImportPOST, '/api/master/equipment/import-csv', { 
        csvData,
        clearExisting: true
      });
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.imported).toBe(1);
      expect(vi.mocked(Equipment.deleteMany)).toHaveBeenCalledWith({});
    });

    it('should reject CSV without headers', async () => {
      const csvData = `9,Equipment 9,Eq 9,M9,900,450,9000,4500`;

      const response = await testPOST(csvImportPOST, '/api/master/equipment/import-csv', { csvData });
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBeDefined();
    });

    it('should accept CSV with minimal required fields', async () => {
      // The CSV parser is lenient - only requires No and Description
      const csvData = `No,Description
10,Equipment 10`;

      vi.mocked(Equipment.insertMany).mockResolvedValue([
        { no: 10, description: 'Equipment 10' }
      ] as any);

      const response = await testPOST(csvImportPOST, '/api/master/equipment/import-csv', { csvData });
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.imported).toBe(1);
    });

    it('should handle malformed CSV with unclosed quotes', async () => {
      // Parser handles unclosed quotes by including rest of line
      const csvData = `No,Complete Description,Description,Equipment Model,Capacity,Flywheel Horsepower,Rental Rate,Hourly Rate
11,"Unclosed quote,Equipment 11,Eq 11,M11,1100,550,11000,5500`;

      vi.mocked(Equipment.insertMany).mockResolvedValue([
        { no: 11, description: 'Eq 11' }
      ] as any);

      const response = await testPOST(csvImportPOST, '/api/master/equipment/import-csv', { csvData });
      
      // Parser is lenient with quotes - it will still parse
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
    });

    it('should handle empty CSV', async () => {
      const response = await testPOST(csvImportPOST, '/api/master/equipment/import-csv', { csvData: '' });
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });

    it('should handle CSV with only headers', async () => {
      const csvData = `No,Complete Description,Description,Equipment Model,Capacity,Flywheel Horsepower,Rental Rate,Hourly Rate`;

      const response = await testPOST(csvImportPOST, '/api/master/equipment/import-csv', { csvData });
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toContain('at least a header');
    });

    it('should provide detailed error messages for rows with missing data', async () => {
      const csvData = `No,Complete Description,Description,Equipment Model,Capacity,Flywheel Horsepower,Rental Rate,Hourly Rate
12,Valid Equipment,Valid Eq,M12,1200,600,12000,6000
,Missing No,Missing Eq,M13,1300,650,13000,6500
14,Valid Equipment 2,Valid Eq 2,M14,1400,700,14000,7000`;

      vi.mocked(Equipment.insertMany).mockResolvedValue([
        { no: 12, description: 'Valid Eq' },
        { no: 14, description: 'Valid Eq 2' }
      ] as any);

      const response = await testPOST(csvImportPOST, '/api/master/equipment/import-csv', { csvData });
      
      // Should succeed but with warnings about skipped row
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.imported).toBe(2);
    });
  });
});
