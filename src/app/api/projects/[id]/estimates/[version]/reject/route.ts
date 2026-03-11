import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import ProjectEstimate from '@/models/ProjectEstimate';

// POST /api/projects/:id/estimates/:version/reject - Reject estimate
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; version: string }> }
) {
  try {
    await dbConnect();
    const { id, version } = await params;
    const body = await req.json();

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

    if (estimate.status !== 'submitted') {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot reject estimate with status: ${estimate.status}. Must be submitted first.`,
        },
        { status: 400 }
      );
    }

    estimate.status = 'rejected';
    estimate.reviewedBy = body.reviewedBy || 'Admin';
    estimate.reviewedDate = new Date();
    if (body.rejectionReason) {
      estimate.notes = (estimate.notes || '') + `\n\nRejection Reason: ${body.rejectionReason}`;
    }

    await estimate.save();

    return NextResponse.json({
      success: true,
      data: estimate,
      message: 'Estimate rejected',
    });
  } catch (error: any) {
    console.error('POST /api/projects/:id/estimates/:version/reject error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to reject estimate',
      },
      { status: 500 }
    );
  }
}
