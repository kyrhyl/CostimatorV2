import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/connect';
import CostEstimate from '@/models/CostEstimate';
import Project from '@/models/Project';
import { getSessionUser, hasRequiredRole } from '@/lib/auth/session';
import { PROJECT_WRITE_ROLES } from '@/lib/auth/roles';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasRequiredRole(user, PROJECT_WRITE_ROLES)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid cost estimate ID' }, { status: 400 });
    }

    await dbConnect();

    const estimate = await CostEstimate.findById(id);
    if (!estimate) {
      return NextResponse.json({ success: false, error: 'Cost estimate not found' }, { status: 404 });
    }

    const projectId = estimate.projectId;
    const taggedAt = new Date();
    const taggedBy = user.name || user.email || user.id;

    await CostEstimate.updateMany(
      { projectId },
      { $set: { isFinalSubmission: false, finalTaggedAt: null, finalTaggedBy: null } },
    );

    await CostEstimate.updateOne(
      { _id: estimate._id },
      {
        $set: {
          isFinalSubmission: true,
          finalTaggedAt: taggedAt,
          finalTaggedBy: taggedBy,
        },
      },
    );

    await Project.findByIdAndUpdate(projectId, {
      finalCostEstimateId: estimate._id,
      finalSubmittedAt: taggedAt,
    });

    const updatedEstimate = await CostEstimate.findById(estimate._id).lean();

    return NextResponse.json({
      success: true,
      data: updatedEstimate,
      message: 'Version tagged as final submission.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to tag final version' },
      { status: 500 },
    );
  }
}
