/**
 * Master Data API - Material Prices
 * Manages location-specific material prices with history tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import MaterialPrice from '@/models/MaterialPrice';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const MaterialPriceSchema = z.object({
  materialCode: z.string().min(1, 'Material code is required'),
  description: z.string().min(1, 'Description is required'),
  unit: z.string().min(1, 'Unit is required'),
  location: z.string().min(1, 'Location is required'),
  unitCost: z.number().min(0, 'Unit cost must be non-negative'),
  priceSource: z.enum(['cmpd', 'canvass']).optional(),
  brand: z.string().optional(),
  specification: z.string().optional(),
  supplier: z.string().optional(),
  effectiveDate: z.string().or(z.date()).optional(),
});

const BulkMaterialPriceSchema = z.array(MaterialPriceSchema).min(1, 'At least one material price required');

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
 * GET /api/master/materials/prices
 * List all material prices with optional filtering
 * 
 * Query Parameters:
 * - materialCode: Filter by material code (exact match)
 * - location: Filter by location (partial match)
 * - district: Filter by district (partial match)
  * - cmpd_version: Filter by CMPD version (exact match)
  * - priceSource: Filter by price source (cmpd or canvass)
 * - isActive: Filter by active status (true/false)
 * - search: Search in description (partial match)
 * - dateFrom: Filter prices from this date (ISO format)
 * - dateTo: Filter prices to this date (ISO format)
 * - sortBy: Field to sort by (default: effectiveDate)
 * - order: Sort order 'asc' or 'desc' (default: desc for dates)
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const materialCode = searchParams.get('materialCode');
    const location = searchParams.get('location');
    const district = searchParams.get('district');
    const cmpd_version = searchParams.get('cmpd_version');
    const priceSource = searchParams.get('priceSource');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const sortBy = searchParams.get('sortBy') || 'effectiveDate';
    const order = searchParams.get('order') === 'asc' ? 1 : -1;
    
    // Build query
    const query: any = {};
    
    if (materialCode) {
      query.materialCode = materialCode;
    }
    
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }
    
    if (district) {
      query.district = { $regex: district, $options: 'i' };
    }
    
    if (cmpd_version) {
      query.cmpd_version = cmpd_version;
    }

    if (priceSource) {
      query.priceSource = priceSource;
    }
    
    if (isActive !== null && isActive !== undefined && isActive !== 'all') {
      query.isActive = isActive === 'true';
    }
    
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { materialCode: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (dateFrom || dateTo) {
      query.effectiveDate = {};
      if (dateFrom) query.effectiveDate.$gte = new Date(dateFrom);
      if (dateTo) query.effectiveDate.$lte = new Date(dateTo);
    }
    
    // Execute query
    const prices = await MaterialPrice.find(query)
      .sort({ [sortBy]: order })
      .lean();
    
    return NextResponse.json({
      success: true,
      count: prices.length,
      data: prices
    });
  } catch (error: any) {
    console.error('GET /api/master/materials/prices error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch material prices' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/master/materials/prices
 * Create a new material price or bulk import prices
 * 
 * Body:
 * - Single: MaterialPriceSchema
 * - Bulk: Array of MaterialPriceSchema
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    
    if (Array.isArray(body)) {
      // Bulk import
      const validation = validateInput(BulkMaterialPriceSchema, body);
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        );
      }
      
      // Insert all prices (allow duplicates for price history)
      const prices = await MaterialPrice.insertMany(validation.data!, { 
        ordered: false 
      });
      
      return NextResponse.json({
        success: true,
        message: `Successfully imported ${prices.length} material prices`,
        count: prices.length,
        data: prices
      }, { status: 201 });
      
    } else {
      // Single creation
      const validation = validateInput(MaterialPriceSchema, body);
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        );
      }
      
      // Create new material price
      const price = await MaterialPrice.create(validation.data!);
      
      return NextResponse.json({
        success: true,
        message: 'Material price created successfully',
        data: price
      }, { status: 201 });
    }
  } catch (error: any) {
    console.error('POST /api/master/materials/prices error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create material price' },
      { status: 500 }
    );
  }
}
