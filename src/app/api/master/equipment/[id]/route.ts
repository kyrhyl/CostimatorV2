/**
 * Master Data API - Equipment Rates [ID]
 * Single equipment operations (Get, Update, Delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Equipment from '@/models/Equipment';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const UpdateEquipmentSchema = z.object({
  no: z.number().int().positive('Equipment number must be positive').optional(),
  completeDescription: z.string().min(1, 'Complete description is required').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  equipmentModel: z.string().optional(),
  capacity: z.string().optional(),
  flywheelHorsepower: z.number().min(0).optional(),
  rentalRate: z.number().min(0, 'Rental rate must be non-negative').optional(),
  hourlyRate: z.number().min(0, 'Hourly rate must be non-negative').optional(),
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
 * GET /api/master/equipment/[id]
 * Get a specific equipment by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    const equipment = await Equipment.findById(id).lean();
    
    if (!equipment) {
      return NextResponse.json(
        { success: false, error: 'Equipment not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: equipment
    });
  } catch (error: any) {
    console.error(`GET /api/master/equipment/[id] error:`, error);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return NextResponse.json(
        { success: false, error: 'Invalid equipment ID' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/master/equipment/[id]
 * Update a specific equipment by ID
 * 
 * Body: Partial EquipmentSchema (all fields optional)
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
    const validation = validateInput(UpdateEquipmentSchema, body);
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
    
    // If updating equipment number, check for duplicates
    if (updateData.no) {
      const existing = await Equipment.findOne({
        no: updateData.no,
        _id: { $ne: id }
      });
      
      if (existing) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Equipment #${updateData.no} already exists` 
          },
          { status: 409 }
        );
      }
    }
    
    // Update equipment
    const equipment = await Equipment.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();
    
    if (!equipment) {
      return NextResponse.json(
        { success: false, error: 'Equipment not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Equipment updated successfully',
      data: equipment
    });
  } catch (error: any) {
    console.error(`PATCH /api/master/equipment/[id] error:`, error);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return NextResponse.json(
        { success: false, error: 'Invalid equipment ID' },
        { status: 400 }
      );
    }
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Equipment with this number already exists' 
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update equipment' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/master/equipment/[id]
 * Delete a specific equipment by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    const equipment = await Equipment.findByIdAndDelete(id).lean();
    
    if (!equipment) {
      return NextResponse.json(
        { success: false, error: 'Equipment not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Equipment deleted successfully',
      data: equipment
    });
  } catch (error: any) {
    console.error(`DELETE /api/master/equipment/[id] error:`, error);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return NextResponse.json(
        { success: false, error: 'Invalid equipment ID' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete equipment' },
      { status: 500 }
    );
  }
}
