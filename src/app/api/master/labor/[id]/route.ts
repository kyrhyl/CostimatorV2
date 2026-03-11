/**
 * Master Data API - Labor Rates [ID]
 * Single labor rate operations (Get, Update, Delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import LaborRate from '@/models/LaborRate';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const UpdateLaborRateSchema = z.object({
  location: z.string().min(1, 'Location is required').optional(),
  district: z.string().min(1, 'District is required').optional(),
  foreman: z.number().min(0, 'Foreman rate must be positive').optional(),
  leadman: z.number().min(0, 'Leadman rate must be positive').optional(),
  equipmentOperatorHeavy: z.number().min(0, 'Equipment operator (heavy) rate must be positive').optional(),
  equipmentOperatorHighSkilled: z.number().min(0, 'Equipment operator (high skilled) rate must be positive').optional(),
  equipmentOperatorLightSkilled: z.number().min(0, 'Equipment operator (light skilled) rate must be positive').optional(),
  driver: z.number().min(0, 'Driver rate must be positive').optional(),
  laborSkilled: z.number().min(0, 'Skilled labor rate must be positive').optional(),
  laborSemiSkilled: z.number().min(0, 'Semi-skilled labor rate must be positive').optional(),
  laborUnskilled: z.number().min(0, 'Unskilled labor rate must be positive').optional(),
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
 * GET /api/master/labor/[id]
 * Get a specific labor rate by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    const laborRate = await LaborRate.findById(id).lean();
    
    if (!laborRate) {
      return NextResponse.json(
        { success: false, error: 'Labor rate not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: laborRate
    });
  } catch (error: any) {
    console.error(`GET /api/master/labor/[id] error:`, error);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return NextResponse.json(
        { success: false, error: 'Invalid labor rate ID' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch labor rate' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/master/labor/[id]
 * Update a specific labor rate by ID
 * 
 * Body: Partial LaborRateSchema (all fields optional)
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
    const validation = validateInput(UpdateLaborRateSchema, body);
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
    
    // If updating location, check for duplicates
    if (updateData.location) {
      const existing = await LaborRate.findOne({
        location: updateData.location,
        _id: { $ne: id }
      });
      
      if (existing) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Labor rate already exists for location: ${updateData.location}` 
          },
          { status: 409 }
        );
      }
    }
    
    // Update labor rate
    const laborRate = await LaborRate.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();
    
    if (!laborRate) {
      return NextResponse.json(
        { success: false, error: 'Labor rate not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Labor rate updated successfully',
      data: laborRate
    });
  } catch (error: any) {
    console.error(`PATCH /api/master/labor/[id] error:`, error);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return NextResponse.json(
        { success: false, error: 'Invalid labor rate ID' },
        { status: 400 }
      );
    }
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Labor rate with this location already exists' 
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update labor rate' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/master/labor/[id]
 * Delete a specific labor rate by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    const laborRate = await LaborRate.findByIdAndDelete(id).lean();
    
    if (!laborRate) {
      return NextResponse.json(
        { success: false, error: 'Labor rate not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Labor rate deleted successfully',
      data: laborRate
    });
  } catch (error: any) {
    console.error(`DELETE /api/master/labor/[id] error:`, error);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return NextResponse.json(
        { success: false, error: 'Invalid labor rate ID' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete labor rate' },
      { status: 500 }
    );
  }
}
