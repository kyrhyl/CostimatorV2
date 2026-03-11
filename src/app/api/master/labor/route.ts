/**
 * Master Data API - Labor Rates
 * Manages labor rate data by location and district
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import LaborRate from '@/models/LaborRate';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const LaborRateSchema = z.object({
  location: z.string().min(1, 'Location is required'),
  district: z.string().min(1, 'District is required'),
  foreman: z.number().min(0, 'Foreman rate must be positive'),
  leadman: z.number().min(0, 'Leadman rate must be positive'),
  equipmentOperatorHeavy: z.number().min(0, 'Equipment operator (heavy) rate must be positive'),
  equipmentOperatorHighSkilled: z.number().min(0, 'Equipment operator (high skilled) rate must be positive'),
  equipmentOperatorLightSkilled: z.number().min(0, 'Equipment operator (light skilled) rate must be positive'),
  driver: z.number().min(0, 'Driver rate must be positive'),
  laborSkilled: z.number().min(0, 'Skilled labor rate must be positive'),
  laborSemiSkilled: z.number().min(0, 'Semi-skilled labor rate must be positive'),
  laborUnskilled: z.number().min(0, 'Unskilled labor rate must be positive'),
  effectiveDate: z.string().or(z.date()).optional(),
});

const BulkLaborRateSchema = z.array(LaborRateSchema).min(1, 'At least one labor rate required');

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
 * GET /api/master/labor
 * List all labor rates with optional filtering
 * 
 * Query Parameters:
 * - location: Filter by location (partial match)
 * - district: Filter by district (exact match)
 * - sortBy: Field to sort by (default: location)
 * - order: Sort order 'asc' or 'desc' (default: asc)
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    const district = searchParams.get('district');
    const sortBy = searchParams.get('sortBy') || 'location';
    const order = searchParams.get('order') === 'desc' ? -1 : 1;
    
    // Build query
    const query: any = {};
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }
    if (district) {
      query.district = district;
    }
    
    // Execute query
    const laborRates = await LaborRate.find(query)
      .sort({ [sortBy]: order })
      .lean();
    
    return NextResponse.json({
      success: true,
      count: laborRates.length,
      data: laborRates
    });
  } catch (error: any) {
    console.error('GET /api/master/labor error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch labor rates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/master/labor
 * Create a new labor rate or bulk import multiple rates
 * 
 * Body:
 * - Single: LaborRateSchema
 * - Bulk: Array of LaborRateSchema
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    
    if (Array.isArray(body)) {
      // Bulk import
      const validation = validateInput(BulkLaborRateSchema, body);
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        );
      }
      
      // Check for duplicates by location
      const locations = validation.data!.map(rate => rate.location);
      const existingRates = await LaborRate.find({
        location: { $in: locations }
      }).select('location');
      
      if (existingRates.length > 0) {
        const duplicates = existingRates.map(r => r.location).join(', ');
        return NextResponse.json(
          { 
            success: false, 
            error: `Labor rates already exist for locations: ${duplicates}` 
          },
          { status: 409 }
        );
      }
      
      // Insert all rates
      const laborRates = await LaborRate.insertMany(validation.data, { 
        ordered: false 
      });
      
      return NextResponse.json({
        success: true,
        message: `Successfully imported ${laborRates.length} labor rates`,
        count: laborRates.length,
        data: laborRates
      }, { status: 201 });
      
    } else {
      // Single creation
      const validation = validateInput(LaborRateSchema, body);
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        );
      }
      
      const laborRateData = validation.data!;
      
      // Check if location already exists
      const existing = await LaborRate.findOne({ 
        location: laborRateData.location 
      });
      
      if (existing) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Labor rate already exists for location: ${laborRateData.location}` 
          },
          { status: 409 }
        );
      }
      
      // Create new labor rate
      const laborRate = await LaborRate.create(laborRateData);
      
      return NextResponse.json({
        success: true,
        message: 'Labor rate created successfully',
        data: laborRate
      }, { status: 201 });
    }
  } catch (error: any) {
    console.error('POST /api/master/labor error:', error);
    
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
      { success: false, error: error.message || 'Failed to create labor rate' },
      { status: 500 }
    );
  }
}
