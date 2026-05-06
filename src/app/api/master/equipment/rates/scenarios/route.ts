import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import EquipmentRateScenario from '@/models/EquipmentRateScenario';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const equipmentVersion = String(searchParams.get('equipmentVersion') || '').trim().toUpperCase();
    const edition = String(searchParams.get('edition') || '').trim().toUpperCase();

    if (!equipmentVersion || !edition) {
      return NextResponse.json({ success: false, error: 'equipmentVersion and edition are required' }, { status: 400 });
    }

    const scenarios = await EquipmentRateScenario.find({
      projectId: null,
      equipmentVersion,
      edition,
      isActive: true,
    }).sort({ updatedAt: -1 }).lean();

    return NextResponse.json({ success: true, data: scenarios });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to load scenario' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const equipmentVersion = String(body?.equipmentVersion || '').trim().toUpperCase();
    const edition = String(body?.edition || '').trim().toUpperCase();
    const name = String(body?.name || 'BASE').trim().toUpperCase();
    const fuelPricePerLiter = Number(body?.fuelPricePerLiter || 0);
    const lubePricePerLiter = Number(body?.lubePricePerLiter || 0);

    if (!equipmentVersion || !edition) {
      return NextResponse.json({ success: false, error: 'equipmentVersion and edition are required' }, { status: 400 });
    }

    const existingNames = await EquipmentRateScenario.find({
      projectId: null,
      equipmentVersion,
      edition,
      isActive: true,
    }).select('name').lean();

    const nameSet = new Set(existingNames.map((s: any) => String(s.name || '').toUpperCase()));
    let finalName = name;
    if (nameSet.has(finalName)) {
      let n = 2;
      while (nameSet.has(`${name}-V${n}`)) n += 1;
      finalName = `${name}-V${n}`;
    }

    const scenario = await EquipmentRateScenario.create({
      projectId: null,
      equipmentVersion,
      edition,
      name: finalName,
      fuelPricePerLiter,
      lubePricePerLiter,
      isActive: true,
    });

    return NextResponse.json({ success: true, message: 'Scenario saved', data: scenario, createdName: finalName });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to save scenario' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const equipmentVersion = String(searchParams.get('equipmentVersion') || '').trim().toUpperCase();
    const edition = String(searchParams.get('edition') || '').trim().toUpperCase();
    const name = String(searchParams.get('name') || '').trim().toUpperCase();

    if (!equipmentVersion || !edition || !name) {
      return NextResponse.json(
        { success: false, error: 'equipmentVersion, edition, and name are required' },
        { status: 400 }
      );
    }

    const result = await EquipmentRateScenario.deleteOne({
      projectId: null,
      equipmentVersion,
      edition,
      name,
    });

    if (!result.deletedCount) {
      return NextResponse.json({ success: false, error: 'Scenario not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Scenario deleted successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete scenario' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const equipmentVersion = String(body?.equipmentVersion || '').trim().toUpperCase();
    const edition = String(body?.edition || '').trim().toUpperCase();
    const name = String(body?.name || '').trim().toUpperCase();
    const fuelPricePerLiter = Number(body?.fuelPricePerLiter || 0);
    const lubePricePerLiter = Number(body?.lubePricePerLiter || 0);

    if (!equipmentVersion || !edition || !name) {
      return NextResponse.json(
        { success: false, error: 'equipmentVersion, edition, and name are required' },
        { status: 400 }
      );
    }

    const scenario = await EquipmentRateScenario.findOneAndUpdate(
      { projectId: null, equipmentVersion, edition, name, isActive: true },
      { $set: { fuelPricePerLiter, lubePricePerLiter } },
      { new: true }
    ).lean();

    if (!scenario) {
      return NextResponse.json({ success: false, error: 'Scenario not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Scenario updated', data: scenario });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update scenario' },
      { status: 500 }
    );
  }
}
