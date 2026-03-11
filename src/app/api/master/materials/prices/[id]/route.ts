/**
 * Master Data API - Material Prices [ID]
 * Single material price operations (Get, Update, Delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import MaterialPrice from '@/models/MaterialPrice';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const UpdateMaterialPriceSchema = z.object({
  materialCode: z.string().min(1, 'Material code is required').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  unit: z.string().min(1, 'Unit is required').optional(),
  location: z.string().min(1, 'Location is required').optional(),
  unitCost: z.number().min(0, 'Unit cost must be non-negative').optional(),
  brand: z.string().optional(),
  specification: z.string().optional(),
  supplier: z.string().optional(),
  effectiveDate: z.string().or(z.date()).optional(),
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
 * GET /api/master/materials/prices/[id]
 * Get a specific material price by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    const price = await MaterialPrice.findById(id).lean();
    
    if (!price) {
      return NextResponse.json(
        { success: false, error: 'Material price not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: price
    });
  } catch (error: any) {
    console.error(`GET /api/master/materials/prices/[id] error:`, error);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return NextResponse.json(
        { success: false, error: 'Invalid material price ID' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch material price' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/master/materials/prices/[id]
 * Update a specific material price by ID
 * 
 * Body: Partial MaterialPriceSchema (all fields optional)
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
    const validation = validateInput(UpdateMaterialPriceSchema, body);
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
    
    // Update material price
    const price = await MaterialPrice.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();
    
    if (!price) {
      return NextResponse.json(
        { success: false, error: 'Material price not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Material price updated successfully',
      data: price
    });
  } catch (error: any) {
    console.error(`PATCH /api/master/materials/prices/[id] error:`, error);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return NextResponse.json(
        { success: false, error: 'Invalid material price ID' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update material price' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/master/materials/prices/[id]
 * Delete a specific material price by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    const price = await MaterialPrice.findByIdAndDelete(id).lean();
    
    if (!price) {
      return NextResponse.json(
        { success: false, error: 'Material price not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Material price deleted successfully',
      data: price
    });
  } catch (error: any) {
    console.error(`DELETE /api/master/materials/prices/[id] error:`, error);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return NextResponse.json(
        { success: false, error: 'Invalid material price ID' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete material price' },
      { status: 500 }
    );
  }
}
