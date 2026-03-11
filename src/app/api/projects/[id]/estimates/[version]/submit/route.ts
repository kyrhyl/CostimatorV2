import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import ProjectEstimate from '@/models/ProjectEstimate';

// POST /api/projects/:id/estimates/:version/submit - Submit estimate for approval
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

    if (estimate.status !== 'draft') {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot submit estimate with status: ${estimate.status}`,
        },
        { status: 400 }
      );
    }

    estimate.status = 'submitted';
    estimate.preparedBy = body.preparedBy || estimate.preparedBy;
    estimate.preparedDate = new Date();

    await estimate.save();

    return NextResponse.json({
      success: true,
      data: estimate,
      message: 'Estimate submitted for approval',
    });
  } catch (error: any) {
    console.error('POST /api/projects/:id/estimates/:version/submit error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to submit estimate',
      },
      { status: 500 }
    );
  }
}
