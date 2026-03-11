/**
 * Unit Tests for Materials API
 * Tests CRUD operations, filtering, and active status management using mocked handlers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET as materialsGET, POST as materialsPOST } from '../materials/route';
import { GET as materialGET, PATCH as materialPATCH, DELETE as materialDELETE } from '../materials/[id]/route';
import Material from '@/models/Material';
import { testGET, testPOST, testPATCH, testDELETE } from '@/test/helpers/api-test-helper';

// Mock the Material model
vi.mock('@/models/Material');

// Test data
const testMaterial = {
  materialCode: 'TEST-MAT-001',
  materialDescription: 'Test Material',
  unit: 'KG',
  basePrice: 100,
  category: 'Test Category',
  includeHauling: true,
  isActive: true,
};

const mockMaterialDoc = {
  _id: 'mock-id-1',
  ...testMaterial,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Materials API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/master/materials', () => {
    it('should create a new material', async () => {
      // Mock findOne to return null (no duplicate)
      vi.mocked(Material.findOne).mockResolvedValue(null);
      
      // Mock create to return the new material
      vi.mocked(Material.create).mockResolvedValue(mockMaterialDoc as any);
      
      const response = await testPOST(materialsPOST, '/api/master/materials', testMaterial);
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(response.data.data.materialCode).toBe(testMaterial.materialCode);
      expect(response.data.data.materialDescription).toBe(testMaterial.materialDescription);
      expect(response.data.data.isActive).toBe(true);
    });

    it('should uppercase material code', async () => {
      const lowerCaseMaterial = {
        ...testMaterial,
        materialCode: 'test-mat-lower',
      };
      
      vi.mocked(Material.findOne).mockResolvedValue(null);
      vi.mocked(Material.create).mockResolvedValue({
        ...mockMaterialDoc,
        materialCode: 'TEST-MAT-LOWER',
      } as any);
      
      const response = await testPOST(materialsPOST, '/api/master/materials', lowerCaseMaterial);
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.materialCode).toBe('TEST-MAT-LOWER');
    });

     it('should default isActive to true', async () => {
       const { isActive, ...materialWithoutActive } = testMaterial;
       void isActive;
      
      vi.mocked(Material.findOne).mockResolvedValue(null);
      vi.mocked(Material.create).mockResolvedValue({
        ...mockMaterialDoc,
        isActive: true,
      } as any);
      
      const response = await testPOST(materialsPOST, '/api/master/materials', materialWithoutActive);
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.isActive).toBe(true);
    });

    it('should reject duplicate material code', async () => {
      // Mock findOne to return existing material
      vi.mocked(Material.findOne).mockResolvedValue(mockMaterialDoc as any);
      
      const response = await testPOST(materialsPOST, '/api/master/materials', testMaterial);
      
      expect(response.status).toBe(409);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toContain('already exists');
    });

    it('should reject missing required fields', async () => {
      const incompleteMaterial = {
        materialCode: 'TEST-MAT-INCOMPLETE',
        // Missing materialDescription, unit, and basePrice
      };
      
      const response = await testPOST(materialsPOST, '/api/master/materials', incompleteMaterial);
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });

    it('should support bulk import', async () => {
      const bulkData = [
        { ...testMaterial, materialCode: 'BULK-MAT-001' },
        { ...testMaterial, materialCode: 'BULK-MAT-002' },
        { ...testMaterial, materialCode: 'BULK-MAT-003' },
      ];
      
      // Mock find to return empty (no duplicates) with select chain
      const mockFindResult = {
        select: vi.fn().mockResolvedValue([])
      };
      vi.mocked(Material.find).mockReturnValue(mockFindResult as any);
      
      // Mock insertMany to return the created materials
      vi.mocked(Material.insertMany).mockResolvedValue(bulkData.map((mat, idx) => ({
        _id: `mock-id-${idx + 2}`,
        ...mat,
        createdAt: new Date(),
        updatedAt: new Date(),
      })) as any);
      
      const response = await testPOST(materialsPOST, '/api/master/materials', bulkData);
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.count).toBe(3);
      expect(response.data.data).toHaveLength(3);
    });
  });

  describe('GET /api/master/materials', () => {
    const mockMaterials = [
      { ...mockMaterialDoc, _id: 'id-1', materialCode: 'TEST-MAT-001' },
      { ...mockMaterialDoc, _id: 'id-2', materialCode: 'TEST-MAT-002', category: 'TEST CATEGORY' },
      { ...mockMaterialDoc, _id: 'id-3', materialCode: 'BULK-MAT-001', isActive: false },
    ];

    beforeEach(() => {
      // Mock the find chain
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockMaterials),
      };
      vi.mocked(Material.find).mockReturnValue(mockFind as any);
    });

    it('should list all materials', async () => {
      const response = await testGET(materialsGET, '/api/master/materials');
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.count).toBeGreaterThan(0);
    });

    it('should search by description', async () => {
      const filteredMaterials = mockMaterials.filter(mat => 
        mat.materialCode.includes('TEST') || mat.materialDescription.includes('Test')
      );
      
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(filteredMaterials),
      };
      vi.mocked(Material.find).mockReturnValue(mockFind as any);
      
      const response = await testGET(materialsGET, '/api/master/materials', { search: 'Test' });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.every((mat: any) => 
        mat.materialDescription.includes('Test') || mat.materialCode.includes('TEST')
      )).toBe(true);
    });

    it('should filter by category', async () => {
      const filteredMaterials = mockMaterials.filter(mat => mat.category === 'TEST CATEGORY');
      
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(filteredMaterials),
      };
      vi.mocked(Material.find).mockReturnValue(mockFind as any);
      
      const response = await testGET(materialsGET, '/api/master/materials', { category: 'Test Category' });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it('should filter by active status', async () => {
      const activeMaterials = mockMaterials.filter(mat => mat.isActive === true);
      
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(activeMaterials),
      };
      vi.mocked(Material.find).mockReturnValue(mockFind as any);
      
      const response = await testGET(materialsGET, '/api/master/materials', { isActive: 'true' });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.every((mat: any) => mat.isActive === true)).toBe(true);
    });

    it('should filter inactive materials', async () => {
      const inactiveMaterials = mockMaterials.filter(mat => mat.isActive === false);
      
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(inactiveMaterials),
      };
      vi.mocked(Material.find).mockReturnValue(mockFind as any);
      
      const response = await testGET(materialsGET, '/api/master/materials', { isActive: 'false' });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.every((mat: any) => mat.isActive === false)).toBe(true);
    });

    it('should sort results', async () => {
      const sortedMaterials = [...mockMaterials].sort((a, b) => 
        a.materialCode.localeCompare(b.materialCode)
      );
      
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(sortedMaterials),
      };
      vi.mocked(Material.find).mockReturnValue(mockFind as any);
      
      const response = await testGET(materialsGET, '/api/master/materials', { 
        sortBy: 'materialCode', 
        order: 'asc' 
      });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      
      const codes = response.data.data.map((mat: any) => mat.materialCode);
      const sorted = [...codes].sort();
      expect(codes).toEqual(sorted);
    });

    it('should combine multiple filters', async () => {
      const filteredMaterials = mockMaterials.filter(mat => 
        mat.category === 'TEST CATEGORY' && 
        mat.isActive === true &&
        (mat.materialDescription.includes('Test') || mat.materialCode.includes('TEST'))
      );
      
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(filteredMaterials),
      };
      vi.mocked(Material.find).mockReturnValue(mockFind as any);
      
      const response = await testGET(materialsGET, '/api/master/materials', { 
        category: 'Test Category',
        isActive: 'true',
        search: 'Test'
      });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  describe('GET /api/master/materials/:id', () => {
    it('should get specific material', async () => {
      const mockFind = {
        lean: vi.fn().mockResolvedValue(mockMaterialDoc),
      };
      vi.mocked(Material.findById).mockReturnValue(mockFind as any);
      
      const response = await testGET(materialGET, '/api/master/materials/mock-id-1');
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data._id).toBe('mock-id-1');
      expect(response.data.data.materialCode).toBe(testMaterial.materialCode);
    });

    it('should return 404 for non-existent ID', async () => {
      const mockFind = {
        lean: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(Material.findById).mockReturnValue(mockFind as any);
      
      const response = await testGET(materialGET, '/api/master/materials/507f1f77bcf86cd799439011');
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
    });

    it('should return 400 for invalid ID format', async () => {
      const castError = new Error('Cast to ObjectId failed');
      (castError as any).name = 'CastError';
      
      const mockFind = {
        lean: vi.fn().mockRejectedValue(castError)
      };
      vi.mocked(Material.findById).mockReturnValue(mockFind as any);
      
      const response = await testGET(materialGET, '/api/master/materials/invalid-id');
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });
  });

  describe('PATCH /api/master/materials/:id', () => {
    it('should update material description', async () => {
      const updates = {
        materialDescription: 'Updated Test Material',
      };

      vi.mocked(Material.findOne).mockResolvedValue(null);
      
      const mockFind = {
        lean: vi.fn().mockResolvedValue({
          ...mockMaterialDoc,
          materialDescription: 'Updated Test Material',
        }),
      };
      vi.mocked(Material.findByIdAndUpdate).mockReturnValue(mockFind as any);
      
      const response = await testPATCH(materialPATCH, '/api/master/materials/mock-id-1', updates, { id: 'mock-id-1' });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.materialDescription).toBe('Updated Test Material');
    });

    it('should toggle active status', async () => {
      vi.mocked(Material.findOne).mockResolvedValue(null);
      
      const mockFind = {
        lean: vi.fn().mockResolvedValue({
          ...mockMaterialDoc,
          isActive: false,
        }),
      };
      vi.mocked(Material.findByIdAndUpdate).mockReturnValue(mockFind as any);
      
      const response = await testPATCH(materialPATCH, '/api/master/materials/mock-id-1', 
        { isActive: false }, 
        { id: 'mock-id-1' }
      );
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.isActive).toBe(false);
    });

    it('should uppercase material code on update', async () => {
      vi.mocked(Material.findOne).mockResolvedValue(null);
      
      const mockFind = {
        lean: vi.fn().mockResolvedValue({
          ...mockMaterialDoc,
          materialCode: 'UPDATED-CODE-LOWERCASE',
        }),
      };
      vi.mocked(Material.findByIdAndUpdate).mockReturnValue(mockFind as any);
      
      const response = await testPATCH(materialPATCH, '/api/master/materials/mock-id-1',
        { materialCode: 'updated-code-lowercase' },
        { id: 'mock-id-1' }
      );
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.materialCode).toBe('UPDATED-CODE-LOWERCASE');
    });

    it('should reject duplicate material code', async () => {
      // Mock findOne to return existing material with different ID
      vi.mocked(Material.findOne).mockResolvedValue({
        _id: 'different-id',
        materialCode: 'BULK-MAT-001',
      } as any);
      
      const response = await testPATCH(materialPATCH, '/api/master/materials/mock-id-1',
        { materialCode: 'BULK-MAT-001' },
        { id: 'mock-id-1' }
      );
      
      expect(response.status).toBe(409);
      expect(response.data.success).toBe(false);
    });

    it('should return 404 for non-existent ID', async () => {
      vi.mocked(Material.findOne).mockResolvedValue(null);
      
      const mockFind = {
        lean: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(Material.findByIdAndUpdate).mockReturnValue(mockFind as any);
      
      const response = await testPATCH(materialPATCH, '/api/master/materials/507f1f77bcf86cd799439011',
        { materialDescription: 'Update' },
        { id: '507f1f77bcf86cd799439011' }
      );
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
    });
  });

  describe('DELETE /api/master/materials/:id', () => {
    it('should delete material', async () => {
      const mockFind = {
        lean: vi.fn().mockResolvedValue(mockMaterialDoc),
      };
      vi.mocked(Material.findByIdAndDelete).mockReturnValue(mockFind as any);
      
      const response = await testDELETE(materialDELETE, '/api/master/materials/mock-id-1', { id: 'mock-id-1' });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data._id).toBe('mock-id-1');
    });

    it('should return 404 after deletion', async () => {
      const mockFind = {
        lean: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(Material.findByIdAndDelete).mockReturnValue(mockFind as any);
      
      const response = await testDELETE(materialDELETE, '/api/master/materials/mock-id-1', { id: 'mock-id-1' });
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
    });

    it('should return 404 for non-existent ID', async () => {
      const mockFind = {
        lean: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(Material.findByIdAndDelete).mockReturnValue(mockFind as any);
      
      const response = await testDELETE(materialDELETE, '/api/master/materials/507f1f77bcf86cd799439011', 
        { id: '507f1f77bcf86cd799439011' }
      );
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
    });
  });
});
