/**
 * Master Data API - Equipment Rates
 * Manages equipment rate data
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Equipment from '@/models/Equipment';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const EquipmentSchema = z.object({
  no: z.number().int().positive('Equipment number must be positive'),
  completeDescription: z.string().min(1, 'Complete description is required'),
  description: z.string().min(1, 'Description is required'),
  equipmentModel: z.string().optional(),
  capacity: z.string().optional(),
  flywheelHorsepower: z.number().min(0).optional(),
  rentalRate: z.number().min(0, 'Rental rate must be non-negative'),
  hourlyRate: z.number().min(0, 'Hourly rate must be non-negative'),
});

const BulkEquipmentSchema = z.array(EquipmentSchema).min(1, 'At least one equipment required');

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
 * GET /api/master/equipment
 * List all equipment with optional filtering
 * 
 * Query Parameters:
 * - search: Search in description or completeDescription (partial match)
 * - minRate: Minimum hourly rate
 * - maxRate: Maximum hourly rate
 * - sortBy: Field to sort by (default: no)
 * - order: Sort order 'asc' or 'desc' (default: asc)
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const minRate = searchParams.get('minRate');
    const maxRate = searchParams.get('maxRate');
    const sortBy = searchParams.get('sortBy') || 'no';
    const order = searchParams.get('order') === 'desc' ? -1 : 1;
    
    // Build query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { completeDescription: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (minRate || maxRate) {
      query.hourlyRate = {};
      if (minRate) query.hourlyRate.$gte = parseFloat(minRate);
      if (maxRate) query.hourlyRate.$lte = parseFloat(maxRate);
    }
    
    // Execute query
    const equipment = await Equipment.find(query)
      .sort({ [sortBy]: order })
      .lean();
    
    return NextResponse.json({
      success: true,
      count: equipment.length,
      data: equipment
    });
  } catch (error: any) {
    console.error('GET /api/master/equipment error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/master/equipment
 * Create new equipment or bulk import
 * 
 * Body:
 * - Single: EquipmentSchema
 * - Bulk: Array of EquipmentSchema
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    
    if (Array.isArray(body)) {
      // Bulk import
      const validation = validateInput(BulkEquipmentSchema, body);
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        );
      }
      
      // Check for duplicates by equipment number
      const numbers = validation.data!.map(eq => eq.no);
      const existingEquipment = await Equipment.find({
        no: { $in: numbers }
      }).select('no description');
      
      if (existingEquipment.length > 0) {
        const duplicates = existingEquipment.map(eq => `#${eq.no} (${eq.description})`).join(', ');
        return NextResponse.json(
          { 
            success: false, 
            error: `Equipment already exists: ${duplicates}` 
          },
          { status: 409 }
        );
      }
      
      // Insert all equipment
      const equipment = await Equipment.insertMany(validation.data, { 
        ordered: false 
      });
      
      return NextResponse.json({
        success: true,
        message: `Successfully imported ${equipment.length} equipment items`,
        count: equipment.length,
        data: equipment
      }, { status: 201 });
      
    } else {
      // Single creation
      const validation = validateInput(EquipmentSchema, body);
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        );
      }
      
      const equipmentData = validation.data!;
      
      // Check if equipment number already exists
      const existing = await Equipment.findOne({ no: equipmentData.no });
      
      if (existing) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Equipment #${equipmentData.no} already exists` 
          },
          { status: 409 }
        );
      }
      
      // Create new equipment
      const equipment = await Equipment.create(equipmentData);
      
      return NextResponse.json({
        success: true,
        message: 'Equipment created successfully',
        data: equipment
      }, { status: 201 });
    }
  } catch (error: any) {
    console.error('POST /api/master/equipment error:', error);
    
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
      { success: false, error: error.message || 'Failed to create equipment' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/master/equipment
 * Clear all equipment (for re-import scenarios)
 * 
 * Query Parameters:
 * - confirm: Must be 'true' to execute deletion
 */
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const confirm = searchParams.get('confirm');
    
    if (confirm !== 'true') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Please confirm deletion by adding ?confirm=true to the URL' 
        },
        { status: 400 }
      );
    }
    
    const result = await Equipment.deleteMany({});
    
    return NextResponse.json({
      success: true,
      message: `Deleted ${result.deletedCount} equipment items`,
      deletedCount: result.deletedCount
    });
  } catch (error: any) {
    console.error('DELETE /api/master/equipment error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete equipment' },
      { status: 500 }
    );
  }
}
