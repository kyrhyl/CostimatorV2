/**
 * Master Data API - Materials [ID]
 * Single material operations (Get, Update, Delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Material from '@/models/Material';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const UpdateMaterialSchema = z.object({
  materialCode: z.string().min(1, 'Material code is required').toUpperCase().optional(),
  materialDescription: z.string().min(1, 'Material description is required').optional(),
  unit: z.string().min(1, 'Unit is required').toUpperCase().optional(),
  basePrice: z.number().min(0, 'Base price must be non-negative').optional(),
  category: z.string().optional(),
  includeHauling: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

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
 * GET /api/master/materials/[id]
 * Get a specific material by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    const material = await Material.findById(id).lean();
    
    if (!material) {
      return NextResponse.json(
        { success: false, error: 'Material not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: material
    });
  } catch (error: any) {
    console.error(`GET /api/master/materials/[id] error:`, error);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return NextResponse.json(
        { success: false, error: 'Invalid material ID' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch material' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/master/materials/[id]
 * Update a specific material by ID
 * 
 * Body: Partial MaterialSchema (all fields optional)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    const body = await request.json();
    
    // Validate input
    const validation = validateInput(UpdateMaterialSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }
    
    const updateData = validation.data!;
    
    // Check if nothing to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }
    
    // If updating material code, check for duplicates
    if (updateData.materialCode) {
      const existing = await Material.findOne({
        materialCode: updateData.materialCode,
        _id: { $ne: id }
      });
      
      if (existing) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Material ${updateData.materialCode} already exists` 
          },
          { status: 409 }
        );
      }
    }
    
    // Update material
    const material = await Material.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();
    
    if (!material) {
      return NextResponse.json(
        { success: false, error: 'Material not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Material updated successfully',
      data: material
    });
  } catch (error: any) {
    console.error(`PATCH /api/master/materials/[id] error:`, error);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return NextResponse.json(
        { success: false, error: 'Invalid material ID' },
        { status: 400 }
      );
    }
    
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
      { success: false, error: error.message || 'Failed to update material' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/master/materials/[id]
 * Delete a specific material by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    const material = await Material.findByIdAndDelete(id).lean();
    
    if (!material) {
      return NextResponse.json(
        { success: false, error: 'Material not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Material deleted successfully',
      data: material
    });
  } catch (error: any) {
    console.error(`DELETE /api/master/materials/[id] error:`, error);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return NextResponse.json(
        { success: false, error: 'Invalid material ID' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete material' },
      { status: 500 }
    );
  }
}
