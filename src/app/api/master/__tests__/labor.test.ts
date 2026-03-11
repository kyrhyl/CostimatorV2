/**
 * Unit Tests for Labor Rates API
 * Tests all CRUD operations, validation, and error handling using mocked handlers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET as laborGET, POST as laborPOST } from '../labor/route';
import { GET as laborByIdGET, PATCH as laborPATCH, DELETE as laborDELETE } from '../labor/[id]/route';
import LaborRate from '@/models/LaborRate';
import { testGET, testPOST, testPATCH, testDELETE } from '@/test/helpers/api-test-helper';

// Mock the LaborRate model
vi.mock('@/models/LaborRate');

// Test data
const testLaborRate = {
  location: 'Test City',
  district: 'Test District',
  foreman: 500,
  leadman: 450,
  equipmentOperatorHeavy: 400,
  equipmentOperatorHighSkilled: 380,
  equipmentOperatorLightSkilled: 350,
  driver: 320,
  laborSkilled: 300,
  laborSemiSkilled: 280,
  laborUnskilled: 250,
};

const mockLaborDoc = {
  _id: 'mock-labor-id-1',
  ...testLaborRate,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Labor Rates API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/master/labor', () => {
    it('should create a new labor rate', async () => {
      vi.mocked(LaborRate.findOne).mockResolvedValue(null);
      vi.mocked(LaborRate.create).mockResolvedValue(mockLaborDoc as any);
      
      const response = await testPOST(laborPOST, '/api/master/labor', testLaborRate);
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(response.data.data.location).toBe(testLaborRate.location);
      expect(response.data.data.foreman).toBe(testLaborRate.foreman);
    });

    it('should reject duplicate location', async () => {
      vi.mocked(LaborRate.findOne).mockResolvedValue(mockLaborDoc as any);
      
      const response = await testPOST(laborPOST, '/api/master/labor', testLaborRate);
      
      expect(response.status).toBe(409);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toContain('already exists');
    });

    it('should reject invalid data (negative rates)', async () => {
      const response = await testPOST(laborPOST, '/api/master/labor', {
        ...testLaborRate,
        location: 'Invalid City',
        foreman: -100,
      });
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });

    it('should reject missing required fields', async () => {
      const response = await testPOST(laborPOST, '/api/master/labor', {
        location: 'Incomplete City',
      });
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });

    it('should support bulk import', async () => {
      const bulkData = [
        { ...testLaborRate, location: 'Bulk City 1' },
        { ...testLaborRate, location: 'Bulk City 2' },
      ];

      // Mock find to return empty (no duplicates) with select chain
      const mockFindResult = {
        select: vi.fn().mockResolvedValue([])
      };
      vi.mocked(LaborRate.find).mockReturnValue(mockFindResult as any);
      
      vi.mocked(LaborRate.insertMany).mockResolvedValue(bulkData.map((rate, idx) => ({
        _id: `mock-labor-id-${idx + 2}`,
        ...rate,
        createdAt: new Date(),
        updatedAt: new Date(),
      })) as any);
      
      const response = await testPOST(laborPOST, '/api/master/labor', bulkData);
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.count).toBe(2);
      expect(response.data.data).toHaveLength(2);
    });
  });

  describe('GET /api/master/labor', () => {
    const mockLaborRates = [
      { ...mockLaborDoc, _id: 'id-1', location: 'Test City' },
      { ...mockLaborDoc, _id: 'id-2', location: 'Bulk City 1' },
    ];

    it('should list all labor rates', async () => {
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockLaborRates),
      };
      vi.mocked(LaborRate.find).mockReturnValue(mockFind as any);
      
      const response = await testGET(laborGET, '/api/master/labor');
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.count).toBeGreaterThan(0);
    });

    it('should filter by location', async () => {
      const filtered = mockLaborRates.filter(r => r.location.includes('Test'));
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(filtered),
      };
      vi.mocked(LaborRate.find).mockReturnValue(mockFind as any);
      
      const response = await testGET(laborGET, '/api/master/labor', { location: 'Test' });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.every((rate: any) => rate.location.includes('Test'))).toBe(true);
    });

    it('should filter by district', async () => {
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockLaborRates),
      };
      vi.mocked(LaborRate.find).mockReturnValue(mockFind as any);
      
      const response = await testGET(laborGET, '/api/master/labor', { district: 'Test District' });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.every((rate: any) => rate.district === 'Test District')).toBe(true);
    });

    it('should sort results', async () => {
      const sorted = [...mockLaborRates].sort((a, b) => a.location.localeCompare(b.location));
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(sorted),
      };
      vi.mocked(LaborRate.find).mockReturnValue(mockFind as any);
      
      const response = await testGET(laborGET, '/api/master/labor', { sortBy: 'location', order: 'asc' });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      
      const locations = response.data.data.map((rate: any) => rate.location);
      const expectedSorted = [...locations].sort();
      expect(locations).toEqual(expectedSorted);
    });
  });

  describe('GET /api/master/labor/:id', () => {
    it('should get a specific labor rate', async () => {
      const mockFind = {
        lean: vi.fn().mockResolvedValue(mockLaborDoc),
      };
      vi.mocked(LaborRate.findById).mockReturnValue(mockFind as any);
      
      const response = await testGET(laborByIdGET, '/api/master/labor/mock-labor-id-1');
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data._id).toBe('mock-labor-id-1');
      expect(response.data.data.location).toBe(testLaborRate.location);
    });

    it('should return 404 for non-existent ID', async () => {
      const mockFind = {
        lean: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(LaborRate.findById).mockReturnValue(mockFind as any);
      
      const response = await testGET(laborByIdGET, '/api/master/labor/507f1f77bcf86cd799439011');
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
    });

    it('should return 400 for invalid ID format', async () => {
      const castError = new Error('Cast to ObjectId failed');
      (castError as any).name = 'CastError';
      
      const mockFind = {
        lean: vi.fn().mockRejectedValue(castError)
      };
      vi.mocked(LaborRate.findById).mockReturnValue(mockFind as any);
      
      const response = await testGET(laborByIdGET, '/api/master/labor/invalid-id');
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });
  });

  describe('PATCH /api/master/labor/:id', () => {
    it('should update a labor rate', async () => {
      const updates = {
        foreman: 550,
        leadman: 500,
      };

      vi.mocked(LaborRate.findOne).mockResolvedValue(null);
      const mockFind = {
        lean: vi.fn().mockResolvedValue({
          ...mockLaborDoc,
          foreman: 550,
          leadman: 500,
        }),
      };
      vi.mocked(LaborRate.findByIdAndUpdate).mockReturnValue(mockFind as any);
      
      const response = await testPATCH(laborPATCH, '/api/master/labor/mock-labor-id-1', updates, { id: 'mock-labor-id-1' });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.foreman).toBe(550);
      expect(response.data.data.leadman).toBe(500);
    });

    it('should reject negative rates', async () => {
      const response = await testPATCH(laborPATCH, '/api/master/labor/mock-labor-id-1', { foreman: -100 }, { id: 'mock-labor-id-1' });
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });

    it('should reject duplicate location on update', async () => {
      vi.mocked(LaborRate.findOne).mockResolvedValue({
        _id: 'different-id',
        location: 'Bulk City 1',
      } as any);
      
      const response = await testPATCH(laborPATCH, '/api/master/labor/mock-labor-id-1', { location: 'Bulk City 1' }, { id: 'mock-labor-id-1' });
      
      expect(response.status).toBe(409);
      expect(response.data.success).toBe(false);
    });

    it('should return 404 for non-existent ID', async () => {
      vi.mocked(LaborRate.findOne).mockResolvedValue(null);
      const mockFind = {
        lean: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(LaborRate.findByIdAndUpdate).mockReturnValue(mockFind as any);
      
      const response = await testPATCH(laborPATCH, '/api/master/labor/507f1f77bcf86cd799439011', { foreman: 600 }, { id: '507f1f77bcf86cd799439011' });
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
    });
  });

  describe('DELETE /api/master/labor/:id', () => {
    it('should delete a labor rate', async () => {
      const mockFind = {
        lean: vi.fn().mockResolvedValue(mockLaborDoc),
      };
      vi.mocked(LaborRate.findByIdAndDelete).mockReturnValue(mockFind as any);
      
      const response = await testDELETE(laborDELETE, '/api/master/labor/mock-labor-id-1', { id: 'mock-labor-id-1' });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data._id).toBe('mock-labor-id-1');
    });

    it('should return 404 after deletion', async () => {
      const mockFind = {
        lean: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(LaborRate.findByIdAndDelete).mockReturnValue(mockFind as any);
      
      const response = await testDELETE(laborDELETE, '/api/master/labor/mock-labor-id-1', { id: 'mock-labor-id-1' });
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
    });

    it('should return 404 for non-existent ID', async () => {
      const mockFind = {
        lean: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(LaborRate.findByIdAndDelete).mockReturnValue(mockFind as any);
      
      const response = await testDELETE(laborDELETE, '/api/master/labor/507f1f77bcf86cd799439011', { id: '507f1f77bcf86cd799439011' });
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
    });
  });
});
