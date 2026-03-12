import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/connect';
import DupaAdjustment from '@/models/DupaAdjustment';

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
    const estimateRef = String(searchParams.get('estimateRef') || '').trim();
    if (!estimateRef) {
      return NextResponse.json({ success: false, error: 'estimateRef is required' }, { status: 400 });
    }

    const data = await DupaAdjustment.find({ projectId: id, estimateRef }).lean();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to load DUPA adjustments' }, { status: 500 });
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
    const estimateRef = String(body?.estimateRef || '').trim();
    const itemKey = String(body?.itemKey || '').trim();
    const dupaItemId = String(body?.dupaItemId || '').trim();
    if (!estimateRef || (!itemKey && !dupaItemId)) {
      return NextResponse.json({ success: false, error: 'estimateRef and either itemKey or dupaItemId are required' }, { status: 400 });
    }

    const payload = {
      projectId: id,
      estimateRef,
      itemKey: itemKey || dupaItemId,
      dupaItemId,
      sourceType: body?.sourceType,
      sourceId: String(body?.sourceId || ''),
      migrationVersion: Number(body?.migrationVersion || 0),
      payItemNumber: String(body?.payItemNumber || ''),
      payItemDescription: String(body?.payItemDescription || ''),
      part: String(body?.part || ''),
      unitOfMeasurement: String(body?.unitOfMeasurement || ''),
      outputPerHour: Number(body?.outputPerHour || 0),
      quantity: Number(body?.quantity || 0),
      laborItems: Array.isArray(body?.laborItems) ? body.laborItems : [],
      equipmentItems: Array.isArray(body?.equipmentItems) ? body.equipmentItems : [],
      materialItems: Array.isArray(body?.materialItems) ? body.materialItems : [],
      totals: body?.totals || {},
      reason: String(body?.reason || ''),
      updatedBy: String(body?.updatedBy || 'workspace-user'),
    };

    const data = await DupaAdjustment.findOneAndUpdate(
      { projectId: id, estimateRef, itemKey: itemKey || dupaItemId },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to save DUPA adjustment' }, { status: 500 });
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
    const estimateRef = String(searchParams.get('estimateRef') || '').trim();
    const itemKey = String(searchParams.get('itemKey') || '').trim();
    const dupaItemId = String(searchParams.get('dupaItemId') || '').trim();
    if (!estimateRef || (!itemKey && !dupaItemId)) {
      return NextResponse.json({ success: false, error: 'estimateRef and either itemKey or dupaItemId are required' }, { status: 400 });
    }

    await DupaAdjustment.deleteOne({ projectId: id, estimateRef, itemKey: itemKey || dupaItemId });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete DUPA adjustment' }, { status: 500 });
  }
}
