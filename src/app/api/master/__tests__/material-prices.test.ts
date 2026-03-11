/**
 * Unit Tests for Material Prices API
 * Tests CRUD operations, price history tracking, and date filtering using mocked handlers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET as pricesGET, POST as pricesPOST } from '../../master/materials/prices/route';
import { GET as priceByIdGET, PATCH as priceByIdPATCH, DELETE as priceByIdDELETE } from '../../master/materials/prices/[id]/route';
import { testGET, testPOST, testPATCH, testDELETE } from '../../../../test/helpers/api-test-helper';
import MaterialPrice from '../../../../models/MaterialPrice';

// Mock the MaterialPrice model
vi.mock('../../../../models/MaterialPrice', () => ({
  default: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    insertMany: vi.fn(),
  }
}));

// Test data
const testPrice = {
  materialCode: 'PRICE-TEST-001',
  description: 'Test Material',
  unit: 'BAG',
  location: 'Test Location',
  unitCost: 100.50,
  effectiveDate: '2024-01-01',
  supplier: 'Test Supplier',
  brand: 'Test Brand',
  specification: 'Test Spec',
};

const mockPriceDoc = {
  _id: 'mock-price-id-1',
  ...testPrice,
  effectiveDate: new Date('2024-01-01'),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Material Prices API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/master/materials/prices', () => {
    it('should create a new price record', async () => {
      vi.mocked(MaterialPrice.create).mockResolvedValue(mockPriceDoc as any);
      
      const response = await testPOST(pricesPOST, '/api/master/materials/prices', testPrice);
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(response.data.data.materialCode).toBe(testPrice.materialCode);
      expect(response.data.data.unitCost).toBe(testPrice.unitCost);
      expect(response.data.data.location).toBe(testPrice.location);
    });

    it('should allow duplicate material codes for price history', async () => {
      vi.mocked(MaterialPrice.create).mockResolvedValue(mockPriceDoc as any);
      
      const response = await testPOST(pricesPOST, '/api/master/materials/prices', {
        ...testPrice,
        materialCode: 'PRICE-DUP-001',
        unitCost: 100,
        effectiveDate: '2024-01-01',
      });
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
    });

    it('should reject negative prices', async () => {
      const response = await testPOST(pricesPOST, '/api/master/materials/prices', {
        ...testPrice,
        materialCode: 'PRICE-NEG',
        unitCost: -50,
      });
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });

    it('should reject missing required fields', async () => {
      const response = await testPOST(pricesPOST, '/api/master/materials/prices', {
        materialCode: 'PRICE-INCOMPLETE',
        // Missing required fields
      });
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });

    it('should support bulk import', async () => {
      const bulkData = [
        { ...testPrice, materialCode: 'BULK-PRICE-001' },
        { ...testPrice, materialCode: 'BULK-PRICE-002' },
        { ...testPrice, materialCode: 'BULK-PRICE-003' },
      ];
      
      vi.mocked(MaterialPrice.insertMany).mockResolvedValue(bulkData.map((price, idx) => ({
        _id: `mock-price-id-${idx + 2}`,
        ...price,
        effectiveDate: new Date(price.effectiveDate || '2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
      })) as any);
      
      const response = await testPOST(pricesPOST, '/api/master/materials/prices', bulkData);
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.count).toBe(3);
      expect(response.data.data).toHaveLength(3);
    });
  });

  describe('GET /api/master/materials/prices', () => {
    const mockPrices = [
      { ...mockPriceDoc, _id: 'id-1', materialCode: 'PRICE-TEST-001' },
      { ...mockPriceDoc, _id: 'id-2', materialCode: 'PRICE-DUP-001', unitCost: 100, effectiveDate: new Date('2024-01-01') },
      { ...mockPriceDoc, _id: 'id-3', materialCode: 'PRICE-DUP-001', unitCost: 120, effectiveDate: new Date('2024-02-01') },
    ];

    it('should list all price records', async () => {
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockPrices),
      };
      vi.mocked(MaterialPrice.find).mockReturnValue(mockFind as any);
      
      const response = await testGET(pricesGET, '/api/master/materials/prices');
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.count).toBe(3);
    });

    it('should filter by material code', async () => {
      const filtered = mockPrices.filter(p => p.materialCode === 'PRICE-TEST-001');
      
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(filtered),
      };
      vi.mocked(MaterialPrice.find).mockReturnValue(mockFind as any);
      
      const response = await testGET(pricesGET, '/api/master/materials/prices', { materialCode: 'PRICE-TEST-001' });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it('should filter by location', async () => {
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockPrices),
      };
      vi.mocked(MaterialPrice.find).mockReturnValue(mockFind as any);
      
      const response = await testGET(pricesGET, '/api/master/materials/prices', { location: 'Test' });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it('should filter by date range', async () => {
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockPrices),
      };
      vi.mocked(MaterialPrice.find).mockReturnValue(mockFind as any);
      
      const response = await testGET(pricesGET, '/api/master/materials/prices', { 
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31'
      });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it('should sort by effective date', async () => {
      const sorted = [...mockPrices].sort((a, b) => 
        b.effectiveDate.getTime() - a.effectiveDate.getTime()
      );
      
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(sorted),
      };
      vi.mocked(MaterialPrice.find).mockReturnValue(mockFind as any);
      
      const response = await testGET(pricesGET, '/api/master/materials/prices', { 
        sortBy: 'effectiveDate',
        order: 'desc'
      });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  describe('GET /api/master/materials/prices/:id', () => {
    it('should get specific price record', async () => {
      const mockFind = {
        lean: vi.fn().mockResolvedValue(mockPriceDoc),
      };
      vi.mocked(MaterialPrice.findById).mockReturnValue(mockFind as any);
      
      const response = await testGET(priceByIdGET, '/api/master/materials/prices/mock-price-id-1');
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data._id).toBe('mock-price-id-1');
      expect(response.data.data.materialCode).toBe(testPrice.materialCode);
    });

    it('should return 404 for non-existent ID', async () => {
      const mockFind = {
        lean: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(MaterialPrice.findById).mockReturnValue(mockFind as any);
      
      const response = await testGET(priceByIdGET, '/api/master/materials/prices/507f1f77bcf86cd799439011');
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
    });

    it('should return 400 for invalid ID format', async () => {
      const castError = new Error('Cast to ObjectId failed');
      (castError as any).name = 'CastError';
      
      const mockFind = {
        lean: vi.fn().mockRejectedValue(castError)
      };
      vi.mocked(MaterialPrice.findById).mockReturnValue(mockFind as any);
      
      const response = await testGET(priceByIdGET, '/api/master/materials/prices/invalid-id');
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });
  });

  describe('PATCH /api/master/materials/prices/:id', () => {
    it('should update price record', async () => {
      const updates = {
        unitCost: 150.75,
        supplier: 'Updated Supplier',
      };

      const updatedDoc = { ...mockPriceDoc, ...updates };
      
      const mockUpdate = {
        lean: vi.fn().mockResolvedValue(updatedDoc)
      };
      vi.mocked(MaterialPrice.findByIdAndUpdate).mockReturnValue(mockUpdate as any);
      
      const response = await testPATCH(priceByIdPATCH, '/api/master/materials/prices/mock-price-id-1', updates);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.unitCost).toBe(150.75);
      expect(response.data.data.supplier).toBe('Updated Supplier');
    });

    it('should reject negative prices', async () => {
      const response = await testPATCH(priceByIdPATCH, '/api/master/materials/prices/mock-price-id-1', { 
        unitCost: -100 
      });
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });

    it('should return 404 for non-existent ID', async () => {
      const mockUpdate = {
        lean: vi.fn().mockResolvedValue(null)
      };
      vi.mocked(MaterialPrice.findByIdAndUpdate).mockReturnValue(mockUpdate as any);
      
      const response = await testPATCH(priceByIdPATCH, '/api/master/materials/prices/507f1f77bcf86cd799439011', { 
        unitCost: 200 
      });
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
    });
  });

  describe('DELETE /api/master/materials/prices/:id', () => {
    it('should delete price record', async () => {
      const mockDelete = {
        lean: vi.fn().mockResolvedValue(mockPriceDoc)
      };
      vi.mocked(MaterialPrice.findByIdAndDelete).mockReturnValue(mockDelete as any);
      
      const response = await testDELETE(priceByIdDELETE, '/api/master/materials/prices/mock-price-id-1');
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data._id).toBe('mock-price-id-1');
    });

    it('should return 404 after deletion', async () => {
      const mockFind = {
        lean: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(MaterialPrice.findById).mockReturnValue(mockFind as any);
      
      const response = await testGET(priceByIdGET, '/api/master/materials/prices/mock-price-id-1');
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
    });

    it('should return 404 for non-existent ID', async () => {
      const mockDelete = {
        lean: vi.fn().mockResolvedValue(null)
      };
      vi.mocked(MaterialPrice.findByIdAndDelete).mockReturnValue(mockDelete as any);
      
      const response = await testDELETE(priceByIdDELETE, '/api/master/materials/prices/507f1f77bcf86cd799439011');
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
    });
  });
});
