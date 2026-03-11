import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/connect';
import PowAdjustment from '@/models/PowAdjustment';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid project ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');
    const estimateId = searchParams.get('estimateId');

    const query: any = { projectId: id };
    if (mode === 'manual' || mode === 'takeoff') {
      query.mode = mode;
    }
    if (estimateId && mongoose.Types.ObjectId.isValid(estimateId)) {
      query.estimateId = estimateId;
    } else if (mode === 'manual') {
      query.estimateId = null;
    }

    const data = await PowAdjustment.find(query).lean();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to load POW adjustments' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid project ID' }, { status: 400 });
    }

    const body = await request.json();
    const mode = body?.mode;
    const lineKey = String(body?.lineKey || '').trim();
    const payItemNumber = String(body?.payItemNumber || '').trim();

    if (mode !== 'manual' && mode !== 'takeoff') {
      return NextResponse.json({ success: false, error: 'mode must be manual or takeoff' }, { status: 400 });
    }
    if (!lineKey) {
      return NextResponse.json({ success: false, error: 'lineKey is required' }, { status: 400 });
    }
    if (!payItemNumber) {
      return NextResponse.json({ success: false, error: 'payItemNumber is required' }, { status: 400 });
    }

    const estimateId =
      mode === 'takeoff' && body?.estimateId && mongoose.Types.ObjectId.isValid(body.estimateId)
        ? new mongoose.Types.ObjectId(body.estimateId)
        : null;

    const payload: any = {
      quantity: typeof body?.quantity === 'number' ? body.quantity : undefined,
      unitCost: typeof body?.unitCost === 'number' ? body.unitCost : undefined,
      reason: String(body?.reason || ''),
      updatedBy: String(body?.updatedBy || 'workspace-user'),
    };

    if (payload.quantity !== undefined && payload.quantity < 0) {
      return NextResponse.json({ success: false, error: 'quantity must be >= 0' }, { status: 400 });
    }
    if (payload.unitCost !== undefined && payload.unitCost < 0) {
      return NextResponse.json({ success: false, error: 'unitCost must be >= 0' }, { status: 400 });
    }

    const data = await PowAdjustment.findOneAndUpdate(
      { projectId: id, mode, estimateId, lineKey },
      {
        $set: {
          projectId: id,
          mode,
          estimateId,
          lineKey,
          payItemNumber,
          ...payload,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to save POW adjustment' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid project ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');
    const lineKey = searchParams.get('lineKey');
    const estimateId = searchParams.get('estimateId');

    if ((mode !== 'manual' && mode !== 'takeoff') || !lineKey) {
      return NextResponse.json({ success: false, error: 'mode and lineKey are required' }, { status: 400 });
    }

    const query: any = {
      projectId: id,
      mode,
      lineKey,
      estimateId: mode === 'manual' ? null : undefined,
    };
    if (mode === 'takeoff') {
      if (!estimateId || !mongoose.Types.ObjectId.isValid(estimateId)) {
        return NextResponse.json({ success: false, error: 'estimateId is required for takeoff mode' }, { status: 400 });
      }
      query.estimateId = estimateId;
    }

    await PowAdjustment.deleteOne(query);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete POW adjustment' }, { status: 500 });
  }
}
