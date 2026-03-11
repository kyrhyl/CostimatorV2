/**
 * Master Data API - Pay Items - Individual Item Operations
 * Handles GET, PATCH, and DELETE for individual pay items
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import PayItem from '@/models/PayItem';
import { z } from 'zod';

// ============================================================================
// Validation Schema
// ============================================================================

const UpdatePayItemSchema = z.object({
  division: z.string().min(1, 'Division is required').optional(),
  part: z.string().min(1, 'Part is required').optional(),
  item: z.string().min(1, 'Item is required').optional(),
  payItemNumber: z.string().min(1, 'Pay item number is required').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  unit: z.string().min(1, 'Unit is required').optional(),
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
          error: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
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
    
    const payItem = await PayItem.findByIdAndUpdate(
      id,
      validation.data,
      { new: true, runValidators: true }
    );
    
    if (!payItem) {
      return NextResponse.json(
        { success: false, error: 'Pay item not found' },
        { status: 404 }
      );
    }
    
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
