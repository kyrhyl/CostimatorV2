/**
 * GET /api/dupa-templates/:id
 * Get single DUPA template
 * 
 * PATCH /api/dupa-templates/:id
 * Update DUPA template
 * 
 * DELETE /api/dupa-templates/:id
 * Delete DUPA template
 */

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import DUPATemplate from '@/models/DUPATemplate';
import mongoose from 'mongoose';
import { getSessionUser } from '@/lib/auth/session';
import { buildAuditActor, diffAuditFields, logAuditEvent } from '@/lib/audit/logger';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid template ID format' },
        { status: 400 }
      );
    }

    const template = await DUPATemplate.findById(id).lean();

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'DUPA template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error: any) {
    console.error('Error fetching DUPA template:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch DUPA template',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    const { id } = await params;
    await dbConnect();
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid template ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Check for pay item number conflict if updating
    if (body.payItemNumber) {
      const existing = await DUPATemplate.findOne({
        payItemNumber: body.payItemNumber,
        _id: { $ne: id }
      }).lean();
      
      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: `Pay item number ${body.payItemNumber} already exists`,
          },
          { status: 409 }
        );
      }
    }

    const beforeTemplate = await DUPATemplate.findById(id).lean();

    if (!beforeTemplate) {
      return NextResponse.json(
        { success: false, error: 'DUPA template not found' },
        { status: 404 }
      );
    }

    const updated = await DUPATemplate.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'DUPA template not found' },
        { status: 404 }
      );
    }

    await logAuditEvent({
      actor: buildAuditActor(user),
      action: 'update',
      entityType: 'dupa_template',
      entityId: id,
      summary: `Updated DUPA template ${updated.payItemNumber || id}`,
      request,
      changes: {
        fields: diffAuditFields(beforeTemplate, updated),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating DUPA template:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation error',
          details: error.message 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update DUPA template',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    const { id } = await params;
    await dbConnect();
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid template ID format' },
        { status: 400 }
      );
    }

    const deleted = await DUPATemplate.findByIdAndDelete(id).lean();

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'DUPA template not found' },
        { status: 404 }
      );
    }

    await logAuditEvent({
      actor: buildAuditActor(user),
      action: 'delete',
      entityType: 'dupa_template',
      entityId: id,
      summary: `Deleted DUPA template ${deleted.payItemNumber || id}`,
      request,
      changes: {
        before: deleted,
      },
    });

    return NextResponse.json({
      success: true,
      data: deleted,
      message: 'DUPA template deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting DUPA template:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete DUPA template',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
