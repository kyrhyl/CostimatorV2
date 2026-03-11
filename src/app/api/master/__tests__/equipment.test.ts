/**
 * Unit Tests for Equipment API
 * Tests CRUD operations, validation, filtering, and bulk operations using mocked handlers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET as equipmentGET, POST as equipmentPOST, DELETE as equipmentDELETE } from '../equipment/route';
import { GET as equipmentByIdGET, PATCH as equipmentByIdPATCH, DELETE as equipmentByIdDELETE } from '../equipment/[id]/route';
import { testGET, testPOST, testPATCH, testDELETE } from '../../../../test/helpers/api-test-helper';
import Equipment from '../../../../models/Equipment';

// Mock the Equipment model
vi.mock('@/models/Equipment', () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    insertMany: vi.fn(),
    deleteMany: vi.fn(),
  }
}));

// Test data
const testEquipment = {
  no: 1,
  description: 'Test Equipment',
  completeDescription: 'Test Equipment Complete Description',
  equipmentModel: 'TEST-MODEL',
  capacity: '100',
  flywheelHorsepower: 50,
  hourlyRate: 1000,
  rentalRate: 500,
};

const mockEquipmentDoc = {
  _id: 'mock-equipment-id-1',
  ...testEquipment,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Equipment API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('POST /api/master/equipment', () => {
    it('should create new equipment', async () => {
      vi.mocked(Equipment.findOne).mockResolvedValue(null);
      vi.mocked(Equipment.create).mockResolvedValue(mockEquipmentDoc as any);
      
      const response = await testPOST(equipmentPOST, '/api/master/equipment', testEquipment);
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(response.data.data.no).toBe(testEquipment.no);
      expect(response.data.data.description).toBe(testEquipment.description);
    });

    it('should reject duplicate equipment number', async () => {
      vi.mocked(Equipment.findOne).mockResolvedValue(mockEquipmentDoc as any);
      
      const response = await testPOST(equipmentPOST, '/api/master/equipment', testEquipment);
      
      expect(response.status).toBe(409);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toContain('already exists');
    });

    it('should reject missing required fields', async () => {
      const response = await testPOST(equipmentPOST, '/api/master/equipment', {
        no: 2,
        // Missing description and completeDescription
      });
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });

    it('should reject negative rates', async () => {
      const response = await testPOST(equipmentPOST, '/api/master/equipment', {
        ...testEquipment,
        no: 999,
        hourlyRate: -100,
      });
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });

    it('should support bulk import', async () => {
      const bulkData = [
        { ...testEquipment, no: 10 },
        { ...testEquipment, no: 11 },
        { ...testEquipment, no: 12 },
      ];
      
      // Mock find to return empty (no duplicates) with select chain
      const mockFindResult = {
        select: vi.fn().mockResolvedValue([])
      };
      vi.mocked(Equipment.find).mockReturnValue(mockFindResult as any);
      
      vi.mocked(Equipment.insertMany).mockResolvedValue(bulkData.map((eq, idx) => ({
        _id: `mock-equipment-id-${idx + 2}`,
        ...eq,
        createdAt: new Date(),
        updatedAt: new Date(),
      })) as any);
      
      const response = await testPOST(equipmentPOST, '/api/master/equipment', bulkData);
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.count).toBe(3);
      expect(response.data.data).toHaveLength(3);
    });
  });

  describe('GET /api/master/equipment', () => {
    const mockEquipments = [
      { ...mockEquipmentDoc, _id: 'id-1', no: 1, description: 'Test Equipment 1' },
      { ...mockEquipmentDoc, _id: 'id-2', no: 2, description: 'Test Equipment 2', hourlyRate: 800 },
      { ...mockEquipmentDoc, _id: 'id-3', no: 3, description: 'Excavator', hourlyRate: 1500 },
    ];

    it('should list all equipment', async () => {
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockEquipments),
      };
      vi.mocked(Equipment.find).mockReturnValue(mockFind as any);
      
      const response = await testGET(equipmentGET, '/api/master/equipment');
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.count).toBe(3);
    });

    it('should search by description', async () => {
      const filtered = mockEquipments.filter(eq => 
        eq.description.includes('Test') || eq.completeDescription.includes('Test')
      );
      
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(filtered),
      };
      vi.mocked(Equipment.find).mockReturnValue(mockFind as any);
      
      const response = await testGET(equipmentGET, '/api/master/equipment', { search: 'Test' });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it('should filter by rate range', async () => {
      const filtered = mockEquipments.filter(eq => 
        eq.hourlyRate >= 500 && eq.hourlyRate <= 1500
      );
      
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(filtered),
      };
      vi.mocked(Equipment.find).mockReturnValue(mockFind as any);
      
      const response = await testGET(equipmentGET, '/api/master/equipment', { 
        minRate: '500', 
        maxRate: '1500' 
      });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it('should sort results', async () => {
      const sorted = [...mockEquipments].sort((a, b) => a.no - b.no);
      
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(sorted),
      };
      vi.mocked(Equipment.find).mockReturnValue(mockFind as any);
      
      const response = await testGET(equipmentGET, '/api/master/equipment', { 
        sortBy: 'no', 
        order: 'asc' 
      });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      
      const numbers = response.data.data.map((eq: any) => eq.no);
      expect(numbers).toEqual([1, 2, 3]);
    });

    it('should sort by hourly rate', async () => {
      const sorted = [...mockEquipments].sort((a, b) => b.hourlyRate - a.hourlyRate);
      
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(sorted),
      };
      vi.mocked(Equipment.find).mockReturnValue(mockFind as any);
      
      const response = await testGET(equipmentGET, '/api/master/equipment', { 
        sortBy: 'hourlyRate', 
        order: 'desc' 
      });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  describe('GET /api/master/equipment/:id', () => {
    it('should get specific equipment', async () => {
      const mockFind = {
        lean: vi.fn().mockResolvedValue(mockEquipmentDoc),
      };
      vi.mocked(Equipment.findById).mockReturnValue(mockFind as any);
      
      const response = await testGET(equipmentByIdGET, '/api/master/equipment/mock-equipment-id-1');
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data._id).toBe('mock-equipment-id-1');
      expect(response.data.data.no).toBe(testEquipment.no);
    });

    it('should return 404 for non-existent ID', async () => {
      const mockFind = {
        lean: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(Equipment.findById).mockReturnValue(mockFind as any);
      
      const response = await testGET(equipmentByIdGET, '/api/master/equipment/507f1f77bcf86cd799439011');
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
    });

    it('should return 400 for invalid ID format', async () => {
      const castError = new Error('Cast to ObjectId failed');
      (castError as any).name = 'CastError';
      
      const mockFind = {
        lean: vi.fn().mockRejectedValue(castError)
      };
      vi.mocked(Equipment.findById).mockReturnValue(mockFind as any);
      
      const response = await testGET(equipmentByIdGET, '/api/master/equipment/invalid-id');
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });
  });

  describe('PATCH /api/master/equipment/:id', () => {
    it('should update equipment', async () => {
      const updates = {
        description: 'Updated Test Equipment',
        hourlyRate: 1200,
      };

      const updatedDoc = { ...mockEquipmentDoc, ...updates };
      
      vi.mocked(Equipment.findOne).mockResolvedValue(null);
      const mockUpdate = {
        lean: vi.fn().mockResolvedValue(updatedDoc)
      };
      vi.mocked(Equipment.findByIdAndUpdate).mockReturnValue(mockUpdate as any);
      
      const response = await testPATCH(equipmentByIdPATCH, '/api/master/equipment/mock-equipment-id-1', updates);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.description).toBe('Updated Test Equipment');
      expect(response.data.data.hourlyRate).toBe(1200);
    });

    it('should reject duplicate equipment number', async () => {
      vi.mocked(Equipment.findOne).mockResolvedValue({ 
        _id: 'different-id',
        no: 10 
      } as any);
      
      const response = await testPATCH(equipmentByIdPATCH, '/api/master/equipment/mock-equipment-id-1', { no: 10 });
      
      expect(response.status).toBe(409);
      expect(response.data.success).toBe(false);
    });

    it('should reject negative rates', async () => {
      const response = await testPATCH(equipmentByIdPATCH, '/api/master/equipment/mock-equipment-id-1', { 
        hourlyRate: -500 
      });
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });

    it('should return 404 for non-existent ID', async () => {
      vi.mocked(Equipment.findOne).mockResolvedValue(null);
      const mockUpdate = {
        lean: vi.fn().mockResolvedValue(null)
      };
      vi.mocked(Equipment.findByIdAndUpdate).mockReturnValue(mockUpdate as any);
      
      const response = await testPATCH(equipmentByIdPATCH, '/api/master/equipment/507f1f77bcf86cd799439011', { 
        description: 'Update' 
      });
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
    });
  });

  describe('DELETE /api/master/equipment/:id', () => {
    it('should delete equipment', async () => {
      const mockDelete = {
        lean: vi.fn().mockResolvedValue(mockEquipmentDoc)
      };
      vi.mocked(Equipment.findByIdAndDelete).mockReturnValue(mockDelete as any);
      
      const response = await testDELETE(equipmentByIdDELETE, '/api/master/equipment/mock-equipment-id-1');
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data._id).toBe('mock-equipment-id-1');
    });

    it('should return 404 after deletion', async () => {
      const mockFind = {
        lean: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(Equipment.findById).mockReturnValue(mockFind as any);
      
      const response = await testGET(equipmentByIdGET, '/api/master/equipment/mock-equipment-id-1');
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
    });

    it('should return 404 for non-existent ID', async () => {
      const mockDelete = {
        lean: vi.fn().mockResolvedValue(null)
      };
      vi.mocked(Equipment.findByIdAndDelete).mockReturnValue(mockDelete as any);
      
      const response = await testDELETE(equipmentByIdDELETE, '/api/master/equipment/507f1f77bcf86cd799439011');
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
    });
  });

  describe('DELETE /api/master/equipment (bulk)', () => {
    it('should require confirmation', async () => {
      const response = await testDELETE(equipmentDELETE, '/api/master/equipment');
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toContain('confirm=true');
    });

    it('should delete all with confirmation', async () => {
      vi.mocked(Equipment.deleteMany).mockResolvedValue({ deletedCount: 5 } as any);
      
      const response = await testDELETE(equipmentDELETE, '/api/master/equipment?confirm=true');
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.deletedCount).toBe(5);
    });

    it('should return empty list after bulk delete', async () => {
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(Equipment.find).mockReturnValue(mockFind as any);
      
      const response = await testGET(equipmentGET, '/api/master/equipment');
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.count).toBe(0);
    });
  });
});
