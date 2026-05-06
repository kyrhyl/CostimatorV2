import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import EquipmentRate from '@/models/EquipmentRate';

export async function GET() {
  try {
    await dbConnect();
    const editions = await EquipmentRate.distinct('edition', { isActive: true });
    const sorted = (editions as string[])
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a));

    return NextResponse.json({ success: true, data: sorted });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load ACEL editions' },
      { status: 500 }
    );
  }
}
