import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import EquipmentRateScenario from '@/models/EquipmentRateScenario';

export async function GET() {
  try {
    await dbConnect();
    const versions = await EquipmentRateScenario.distinct('equipmentVersion', { projectId: null, isActive: true });
    const sorted = (versions as string[]).filter(Boolean).sort((a, b) => b.localeCompare(a));
    return NextResponse.json({ success: true, data: sorted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to load equipment versions' }, { status: 500 });
  }
}
