/**
 * Master Data API - Pay Items - Individual Item Operations
 * Handles GET, PATCH, and DELETE for individual pay items
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import PayItem from '@/models/PayItem';
import DUPATemplate from '@/models/DUPATemplate';
import { z } from 'zod';
import { normalizePart, inferPartFromPayItemNumber } from '@/lib/utils/dpwh-constants';
import { requiresClassification, resolveClassificationInput } from '@/lib/classifications/pay-item';

// ============================================================================
// Validation Schema
// ============================================================================

const UpdatePayItemSchema = z.object({
  classificationId: z.string().optional(),
  division: z.string().min(1, 'Division is required').optional(),
  part: z.string().min(1, 'Part is required').optional(),
  item: z.string().min(1, 'Item is required').optional(),
  payItemNumber: z.string().min(1, 'Pay item number is required').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  unit: z.string().min(1, 'Unit is required').optional(),
  trade: z.string().optional(),
  category: z.string().optional(),
  subCategory: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// API Routes
// ============================================================================

/**
 * GET /api/master/pay-items/[id]
 * Get a single pay item by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    const payItem = await PayItem.findById(id);
    
    if (!payItem) {
      return NextResponse.json(
        { success: false, error: 'Pay item not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: payItem
    });
    
  } catch (error: any) {
    console.error('Error fetching pay item:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch pay item' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/master/pay-items/[id]
 * Update a pay item
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
    const validation = UpdatePayItemSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        },
        { status: 400 }
      );
    }
    
    // Check if updating payItemNumber and if it conflicts
    if (validation.data.payItemNumber) {
      const existing = await PayItem.findOne({
        payItemNumber: validation.data.payItemNumber,
        _id: { $ne: id }
      });
      
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Pay item number already exists' },
          { status: 409 }
        );
      }
    }
    
    const existingPayItem = await PayItem.findById(id).lean();
    if (!existingPayItem) {
      return NextResponse.json(
        { success: false, error: 'Pay item not found' },
        { status: 404 }
      );
    }

    const finalPayItemNumber = validation.data.payItemNumber || existingPayItem.payItemNumber || '';
    const inferredPart = inferPartFromPayItemNumber(finalPayItemNumber);
    const nextPart = inferredPart || normalizePart(String(validation.data.part || existingPayItem.part || '')) || String(validation.data.part || existingPayItem.part || '').trim();
    const resolvedClassification = await resolveClassificationInput({
      classificationId: validation.data.classificationId,
      part: nextPart,
      category: validation.data.category ?? existingPayItem.category,
      subCategory: validation.data.subCategory ?? existingPayItem.subCategory,
    });

    if (requiresClassification(nextPart) && !resolvedClassification.classificationId) {
      return NextResponse.json(
        { success: false, error: 'Part E pay items require a category or sub-category selection' },
        { status: 400 }
      );
    }

    const payItem = await PayItem.findByIdAndUpdate(
      id,
      {
        ...validation.data,
        part: nextPart,
        classificationId: resolvedClassification.classificationId || undefined,
        category: resolvedClassification.category,
        subCategory: resolvedClassification.subCategory,
      },
      { new: true, runValidators: true }
    );

    await DUPATemplate.updateMany(
      { payItemId: id },
      {
        $set: {
          classificationId: resolvedClassification.classificationId || undefined,
          payItemNumber: payItem.payItemNumber,
          payItemDescription: payItem.description,
          unitOfMeasurement: payItem.unit,
          part: payItem.part,
          category: payItem.category || '',
          subCategory: payItem.subCategory || '',
        },
      },
    );
    
    return NextResponse.json({
      success: true,
      data: payItem,
      message: 'Pay item updated successfully'
    });
    
  } catch (error: any) {
    console.error('Error updating pay item:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update pay item' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/master/pay-items/[id]
 * Delete a pay item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    const payItem = await PayItem.findByIdAndDelete(id);
    
    if (!payItem) {
      return NextResponse.json(
        { success: false, error: 'Pay item not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Pay item deleted successfully'
    });
    
  } catch (error: any) {
    console.error('Error deleting pay item:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete pay item' },
      { status: 500 }
    );
  }
}
