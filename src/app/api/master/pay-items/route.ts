/**
 * Master Data API - Pay Items
 * Manages DPWH Standard Pay Items Database
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import PayItem from '@/models/PayItem';
import { z } from 'zod';
import { normalizePart, inferPartFromPayItemNumber } from '@/lib/utils/dpwh-constants';
import { requiresClassification, resolveClassificationInput } from '@/lib/classifications/pay-item';

// ============================================================================
// Validation Schemas
// ============================================================================

const PayItemSchema = z.object({
  classificationId: z.string().optional(),
  division: z.string().min(1, 'Division is required'),
  part: z.string().min(1, 'Part is required'),
  item: z.string().min(1, 'Item is required'),
  payItemNumber: z.string().min(1, 'Pay item number is required'),
  description: z.string().min(1, 'Description is required'),
  unit: z.string().min(1, 'Unit is required'),
  trade: z.string().optional(),
  category: z.string().optional(),
  subCategory: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

const BulkPayItemSchema = z.array(PayItemSchema).min(1, 'At least one pay item required');

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
        error: error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      };
    }
    return { success: false, error: 'Validation failed' };
  }
}

// ============================================================================
// API Routes
// ============================================================================

/**
 * GET /api/master/pay-items
 * List all pay items with optional filtering
 * 
 * Query Parameters:
 * - search: Search in payItemNumber or description (partial match)
 * - division: Filter by division (partial match)
 * - part: Filter by part (partial match)
 * - item: Filter by item (partial match)
 * - unit: Filter by unit (exact match)
 * - active: Filter by active status (true/false)
 * - sortBy: Field to sort by (default: payItemNumber)
 * - order: Sort order 'asc' or 'desc' (default: asc)
 * - limit: Maximum number of results (default: 1000)
 * - page: Page number for pagination (default: 1)
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const division = searchParams.get('division');
    const part = searchParams.get('part');
    const item = searchParams.get('item');
    const unit = searchParams.get('unit');
    const active = searchParams.get('active');
    const sortBy = searchParams.get('sortBy') || 'payItemNumber';
    const order = searchParams.get('order') === 'desc' ? -1 : 1;
    const limit = Math.min(parseInt(searchParams.get('limit') || '5000'), 5000);
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    
    // Build query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { payItemNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (division) {
      query.division = { $regex: division, $options: 'i' };
    }
    
    if (part) {
      query.part = { $regex: part, $options: 'i' };
    }
    
    if (item) {
      query.item = { $regex: item, $options: 'i' };
    }
    
    if (unit) {
      query.unit = unit;
    }
    
    if (active !== null && active !== undefined && active !== '') {
      query.isActive = active === 'true';
    }
    
    console.log('PayItem Query:', JSON.stringify(query));
    console.log('PayItem Model collection:', PayItem.collection.name);
    
    // Execute query with pagination
    const [payItems, total] = await Promise.all([
      PayItem.find(query)
        .populate('classificationId')
        .sort({ [sortBy]: order })
        .skip(skip)
        .limit(limit)
        .lean(),
      PayItem.countDocuments(query)
    ]);
    
    console.log('PayItems found:', payItems.length, 'Total:', total);
    
    return NextResponse.json({
      success: true,
      data: payItems,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching pay items:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch pay items' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/master/pay-items
 * Create new pay item(s)
 * Body: Single pay item object or array of pay items for bulk import
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    
    // Check if bulk import (array) or single item
    const isBulk = Array.isArray(body);
    
    if (isBulk) {
      // Validate bulk input
      const validation = validateInput(BulkPayItemSchema, body);
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        );
      }
      // Bulk import with error handling
      const results = {
        success: [] as any[],
        failed: [] as any[],
        duplicates: [] as string[]
      };
      
      for (const itemData of validation.data as any[]) {
        try {
          const inferredPart = inferPartFromPayItemNumber(itemData.payItemNumber);
          const normalizedPart = inferredPart || normalizePart(String(itemData.part || '')) || String(itemData.part || '').trim();
          const resolvedClassification = await resolveClassificationInput({
            classificationId: itemData.classificationId,
            part: normalizedPart,
            category: itemData.category,
            subCategory: itemData.subCategory,
          });
          if (requiresClassification(normalizedPart) && !resolvedClassification.classificationId) {
            throw new Error('Part E pay items require a category or sub-category selection');
          }

          // Check for existing pay item number
          const existing = await PayItem.findOne({ payItemNumber: itemData.payItemNumber });
          if (existing) {
            results.duplicates.push(itemData.payItemNumber);
            continue;
          }
          
          const payItem = await PayItem.create({
            ...itemData,
            part: normalizedPart,
            classificationId: resolvedClassification.classificationId || undefined,
            category: resolvedClassification.category,
            subCategory: resolvedClassification.subCategory,
          });
          results.success.push(payItem);
        } catch (error: any) {
          results.failed.push({
            data: itemData,
            error: error.message
          });
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `Imported ${results.success.length} pay items`,
        data: results,
        summary: {
          total: (validation.data as any[]).length,
          imported: results.success.length,
          failed: results.failed.length,
          duplicates: results.duplicates.length
        }
      }, { status: 201 });
      
    } else {
      // Single item creation - validate
      const validation = validateInput(PayItemSchema, body);
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        );
      }
      
      // Check for duplicate pay item number
      const existing = await PayItem.findOne({ payItemNumber: (validation.data as any).payItemNumber });
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Pay item number already exists' },
          { status: 409 }
        );
      }
      
      const inferredPart = inferPartFromPayItemNumber((validation.data as any).payItemNumber);
      const normalizedPart = inferredPart || normalizePart(String((validation.data as any).part || '')) || String((validation.data as any).part || '').trim();
      const resolvedClassification = await resolveClassificationInput({
        classificationId: (validation.data as any).classificationId,
        part: normalizedPart,
        category: (validation.data as any).category,
        subCategory: (validation.data as any).subCategory,
      });
      if (requiresClassification(normalizedPart) && !resolvedClassification.classificationId) {
        return NextResponse.json(
          { success: false, error: 'Part E pay items require a category or sub-category selection' },
          { status: 400 }
        );
      }

      const payItem = await PayItem.create({
        ...(validation.data as any),
        part: normalizedPart,
        classificationId: resolvedClassification.classificationId || undefined,
        category: resolvedClassification.category,
        subCategory: resolvedClassification.subCategory,
      });
      
      return NextResponse.json({
        success: true,
        data: payItem,
        message: 'Pay item created successfully'
      }, { status: 201 });
    }
    
  } catch (error: any) {
    console.error('Error creating pay item:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create pay item' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/master/pay-items
 * Bulk delete pay items
 * Body: { ids: string[] } - Array of pay item IDs to delete
 */
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { ids } = body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'IDs array is required' },
        { status: 400 }
      );
    }
    
    const result = await PayItem.deleteMany({ _id: { $in: ids } });
    
    return NextResponse.json({
      success: true,
      message: `Deleted ${result.deletedCount} pay items`,
      deletedCount: result.deletedCount
    });
    
  } catch (error: any) {
    console.error('Error deleting pay items:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete pay items' },
      { status: 500 }
    );
  }
}
