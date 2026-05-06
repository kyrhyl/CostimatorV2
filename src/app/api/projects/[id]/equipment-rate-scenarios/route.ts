import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/connect';
import EquipmentRateScenario from '@/models/EquipmentRateScenario';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid project ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const equipmentVersion = String(searchParams.get('equipmentVersion') || '').trim().toUpperCase();
    const edition = String(searchParams.get('edition') || '').trim().toUpperCase();

    const query: Record<string, unknown> = { projectId: id, isActive: true };
    if (equipmentVersion) query.equipmentVersion = equipmentVersion;
    if (edition) query.edition = edition;

    const data = await EquipmentRateScenario.find(query).sort({ updatedAt: -1 }).lean();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to load scenarios' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid project ID' }, { status: 400 });
    }

    const body = await request.json();
    const equipmentVersion = String(body?.equipmentVersion || '').trim().toUpperCase();
    const edition = String(body?.edition || '').trim().toUpperCase();
    const name = String(body?.name || 'BASE').trim().toUpperCase();
    const fuelPricePerLiter = Number(body?.fuelPricePerLiter || 0);
    const lubePricePerLiter = Number(body?.lubePricePerLiter || 0);

    if (!equipmentVersion) {
      return NextResponse.json({ success: false, error: 'equipmentVersion is required' }, { status: 400 });
    }
    if (!edition) {
      return NextResponse.json({ success: false, error: 'edition is required' }, { status: 400 });
    }
    if (!Number.isFinite(fuelPricePerLiter) || fuelPricePerLiter < 0) {
      return NextResponse.json({ success: false, error: 'fuelPricePerLiter must be a non-negative number' }, { status: 400 });
    }
    if (!Number.isFinite(lubePricePerLiter) || lubePricePerLiter < 0) {
      return NextResponse.json({ success: false, error: 'lubePricePerLiter must be a non-negative number' }, { status: 400 });
    }

    const scenario = await EquipmentRateScenario.findOneAndUpdate(
      { projectId: id, equipmentVersion, edition, name },
      {
        $set: {
          fuelPricePerLiter,
          lubePricePerLiter,
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json({
      success: true,
      message: 'Equipment rate scenario saved',
      data: scenario,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to save scenario' }, { status: 500 });
  }
}
