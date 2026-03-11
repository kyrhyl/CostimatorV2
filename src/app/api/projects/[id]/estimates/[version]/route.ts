import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import ProjectEstimate from '@/models/ProjectEstimate';
import { z } from 'zod';

const UpdateEstimateSchema = z.object({
  notes: z.string().optional(),
  submittedTotal: z.number().optional(),
  evaluatedTotal: z.number().optional(),
});

// GET /api/projects/:id/estimates/:version - Get specific estimate version
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; version: string }> }
) {
  try {
    await dbConnect();
    const { id, version } = await params;

    const estimate = await ProjectEstimate.findOne({
      projectId: id,
      version: parseInt(version),
    })
      .populate('projectId', 'projectName projectLocation implementingOffice')
      .lean();

    if (!estimate) {
      return NextResponse.json(
        { success: false, error: 'Estimate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: estimate,
    });
  } catch (error: any) {
    console.error('GET /api/projects/:id/estimates/:version error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch estimate',
      },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/:id/estimates/:version - Update estimate
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; version: string }> }
) {
  try {
    await dbConnect();
    const { id, version } = await params;
    const body = await req.json();

    const validatedData = UpdateEstimateSchema.parse(body);

    const estimate = await ProjectEstimate.findOne({
      projectId: id,
      version: parseInt(version),
    });

    if (!estimate) {
      return NextResponse.json(
        { success: false, error: 'Estimate not found' },
        { status: 404 }
      );
    }

    // Update allowed fields
    if (validatedData.notes !== undefined) {
      estimate.notes = validatedData.notes;
    }
    if (validatedData.submittedTotal !== undefined) {
      estimate.submittedTotal = validatedData.submittedTotal;
    }
    if (validatedData.evaluatedTotal !== undefined) {
      estimate.evaluatedTotal = validatedData.evaluatedTotal;
      if (estimate.submittedTotal) {
        estimate.variance = validatedData.evaluatedTotal - estimate.submittedTotal;
      }
    }

    await estimate.save();

    return NextResponse.json({
      success: true,
      data: estimate,
    });
  } catch (error: any) {
    console.error('PATCH /api/projects/:id/estimates/:version error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update estimate',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/:id/estimates/:version - Delete estimate (only if draft)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; version: string }> }
) {
  try {
    await dbConnect();
    const { id, version } = await params;

    const estimate = await ProjectEstimate.findOne({
      projectId: id,
      version: parseInt(version),
    });

    if (!estimate) {
      return NextResponse.json(
        { success: false, error: 'Estimate not found' },
        { status: 404 }
      );
    }

    if (estimate.status !== 'draft') {
      return NextResponse.json(
        {
          success: false,
          error: 'Can only delete draft estimates',
        },
        { status: 400 }
      );
    }

    await estimate.deleteOne();

    return NextResponse.json({
      success: true,
      message: 'Estimate deleted successfully',
    });
  } catch (error: any) {
    console.error('DELETE /api/projects/:id/estimates/:version error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete estimate',
      },
      { status: 500 }
    );
  }
}
