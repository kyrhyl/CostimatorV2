import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/connect';
import CostEstimate from '@/models/CostEstimate';
import EstimateAudit from '@/models/EstimateAudit';
import { getSessionUser, hasRequiredRole } from '@/lib/auth/session';
import { AUDIT_READ_ROLES, AUDIT_WRITE_ROLES } from '@/lib/auth/roles';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasRequiredRole(user, AUDIT_READ_ROLES)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid cost estimate ID' }, { status: 400 });
    }

    await dbConnect();

    const estimate = await CostEstimate.findById(id).select('_id projectId estimateName estimateNumber status').lean();
    if (!estimate) {
      return NextResponse.json({ success: false, error: 'Cost estimate not found' }, { status: 404 });
    }

    const latest = await EstimateAudit.findOne({ estimateId: estimate._id })
      .sort({ createdAt: -1 })
      .populate('auditorId', 'name email roles')
      .lean();

    const history = await EstimateAudit.find({ estimateId: estimate._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('recommendation status submittedAt createdAt updatedAt auditorId')
      .populate('auditorId', 'name email roles')
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        estimate,
        latest,
        history,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch estimate audit data' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasRequiredRole(user, AUDIT_WRITE_ROLES)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid cost estimate ID' }, { status: 400 });
    }

    await dbConnect();

    const estimate = await CostEstimate.findById(id).select('_id projectId').lean();
    if (!estimate) {
      return NextResponse.json({ success: false, error: 'Cost estimate not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const status = body?.status === 'submitted' ? 'submitted' : 'draft';
    const recommendationRaw = String(body?.recommendation || '').trim();
    const recommendation = recommendationRaw || undefined;
    const allowedRecommendations = new Set(['pass', 'fail', 'needs_revision']);

    if (recommendation && !allowedRecommendations.has(recommendation)) {
      return NextResponse.json(
        { success: false, error: 'Invalid recommendation value.' },
        { status: 400 },
      );
    }

    if (status === 'submitted' && !recommendation) {
      return NextResponse.json(
        { success: false, error: 'Recommendation is required before submitting audit.' },
        { status: 400 },
      );
    }

    const checklist = {
      prescribedFormat: Boolean(body?.checklist?.prescribedFormat),
      arithmeticAccuracy: Boolean(body?.checklist?.arithmeticAccuracy),
      valueConsistency: Boolean(body?.checklist?.valueConsistency),
      scopeCompleteness: Boolean(body?.checklist?.scopeCompleteness),
    };

    const findings = typeof body?.findings === 'string' ? body.findings.trim() : '';
    const userObjectId = new mongoose.Types.ObjectId(user.id);

    let auditDoc;
    if (status === 'draft') {
      auditDoc = await EstimateAudit.findOneAndUpdate(
        {
          estimateId: estimate._id,
          auditorId: userObjectId,
          status: 'draft',
        },
        {
          $set: {
            projectId: estimate.projectId,
            checklist,
            findings,
            recommendation,
            submittedAt: undefined,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } else {
      auditDoc = await EstimateAudit.create({
        projectId: estimate.projectId,
        estimateId: estimate._id,
        auditorId: userObjectId,
        checklist,
        findings,
        recommendation,
        status: 'submitted',
        submittedAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      data: auditDoc,
      message: status === 'submitted' ? 'Audit recommendation submitted.' : 'Audit draft saved.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save estimate audit data' },
      { status: 500 },
    );
  }
}
