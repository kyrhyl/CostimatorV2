import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import ProjectEstimate from '@/models/ProjectEstimate';

// POST /api/projects/:id/estimates/:version/approve - Approve estimate
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
          error: `Cannot approve estimate with status: ${estimate.status}. Must be submitted first.`,
        },
        { status: 400 }
      );
    }

    estimate.status = 'approved';
    estimate.approvedBy = body.approvedBy || 'Admin';
    estimate.approvedDate = new Date();

    await estimate.save();

    return NextResponse.json({
      success: true,
      data: estimate,
      message: 'Estimate approved successfully',
    });
  } catch (error: any) {
    console.error('POST /api/projects/:id/estimates/:version/approve error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to approve estimate',
      },
      { status: 500 }
    );
  }
}
