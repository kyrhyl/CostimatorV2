/**
 * Master Data API - Materials
 * Manages material catalog with categories and base prices
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Material from '@/models/Material';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const MaterialSchema = z.object({
  materialCode: z.string().min(1, 'Material code is required').toUpperCase(),
  materialDescription: z.string().min(1, 'Material description is required'),
  unit: z.string().min(1, 'Unit is required').toUpperCase(),
  basePrice: z.number().min(0, 'Base price must be non-negative'),
  category: z.string().optional(),
  includeHauling: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(true),
});

const BulkMaterialSchema = z.array(MaterialSchema).min(1, 'At least one material required');

// ============================================================================
// Helper Functions
// ============================================================================

function validateInput<T>(schema: z.ZodSchema<T>, data: unknown) {
  try {
    return { success: true, data: schema.parse(data) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      };
    }
    return { success: false, error: 'Validation failed' };
  }
}

// ============================================================================
// API Routes
// ============================================================================

/**
 * GET /api/master/materials
 * List all materials with optional filtering
 * 
 * Query Parameters:
 * - search: Search in materialCode or materialDescription (partial match)
 * - category: Filter by category (exact match)
 * - active: Filter by active status (true/false)
 * - minPrice: Minimum base price
 * - maxPrice: Maximum base price
 * - sortBy: Field to sort by (default: materialCode)
 * - order: Sort order 'asc' or 'desc' (default: asc)
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const active = searchParams.get('active');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sortBy = searchParams.get('sortBy') || 'materialCode';
    const order = searchParams.get('order') === 'desc' ? -1 : 1;
    
    // Build query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { materialCode: { $regex: search, $options: 'i' } },
        { materialDescription: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.category = category.toUpperCase();
    }
    
    if (active !== null) {
      query.isActive = active === 'true';
    }
    
    if (minPrice || maxPrice) {
      query.basePrice = {};
      if (minPrice) query.basePrice.$gte = parseFloat(minPrice);
      if (maxPrice) query.basePrice.$lte = parseFloat(maxPrice);
    }
    
    // Execute query
    const materials = await Material.find(query)
      .sort({ [sortBy]: order })
      .lean();
    
    return NextResponse.json({
      success: true,
      count: materials.length,
      data: materials
    });
  } catch (error: any) {
    console.error('GET /api/master/materials error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch materials' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/master/materials
 * Create a new material or bulk import materials
 * 
 * Body:
 * - Single: MaterialSchema
 * - Bulk: Array of MaterialSchema
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    
    if (Array.isArray(body)) {
      // Bulk import
      const validation = validateInput(BulkMaterialSchema, body);
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        );
      }
      
      // Check for duplicates by material code
      const codes = validation.data!.map(m => m.materialCode);
      const existingMaterials = await Material.find({
        materialCode: { $in: codes }
      }).select('materialCode materialDescription');
      
      if (existingMaterials.length > 0) {
        const duplicates = existingMaterials.map(m => `${m.materialCode} (${m.materialDescription})`).join(', ');
        return NextResponse.json(
          { 
            success: false, 
            error: `Materials already exist: ${duplicates}` 
          },
          { status: 409 }
        );
      }
      
      // Insert all materials
      const materials = await Material.insertMany(validation.data, { 
        ordered: false 
      });
      
      return NextResponse.json({
        success: true,
        message: `Successfully imported ${materials.length} materials`,
        count: materials.length,
        data: materials
      }, { status: 201 });
      
    } else {
      // Single creation
      const validation = validateInput(MaterialSchema, body);
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        );
      }
      
      const materialData = validation.data!;
      
      // Check if material code already exists
      const existing = await Material.findOne({ 
        materialCode: materialData.materialCode 
      });
      
      if (existing) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Material ${materialData.materialCode} already exists` 
          },
          { status: 409 }
        );
      }
      
      // Create new material
      const material = await Material.create(materialData);
      
      return NextResponse.json({
        success: true,
        message: 'Material created successfully',
        data: material
      }, { status: 201 });
    }
  } catch (error: any) {
    console.error('POST /api/master/materials error:', error);
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Material with this code already exists' 
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create material' },
      { status: 500 }
    );
  }
}
