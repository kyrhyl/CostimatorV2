import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Equipment from '@/models/Equipment';
import EquipmentRate from '@/models/EquipmentRate';

export async function GET() {
  try {
    await dbConnect();

    const [totalEquipment, editions] = await Promise.all([
      Equipment.countDocuments({}),
      EquipmentRate.distinct('edition', { isActive: true }),
    ]);

    const latestEdition = (editions as string[])
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a))[0] || '';

    let fixedCoveragePercent = 0;
    let variableCoveragePercent = 0;
    let lastImportAt: Date | null = null;

    if (latestEdition && totalEquipment > 0) {
      const [fixedCount, variableCount, latestRate] = await Promise.all([
        EquipmentRate.countDocuments({ edition: latestEdition, mode: 'fixed', isActive: true }),
        EquipmentRate.countDocuments({ edition: latestEdition, mode: 'variable_fuel_lube', isActive: true }),
        EquipmentRate.findOne({ edition: latestEdition, isActive: true }).sort({ updatedAt: -1 }).select('updatedAt').lean(),
      ]);

      fixedCoveragePercent = Number(((fixedCount / totalEquipment) * 100).toFixed(2));
      variableCoveragePercent = Number(((variableCount / totalEquipment) * 100).toFixed(2));
      lastImportAt = latestRate?.updatedAt || null;
    }

    return NextResponse.json({
      success: true,
      data: {
        totalEquipment,
        editionsCount: (editions as string[]).length,
        latestEdition,
        fixedCoveragePercent,
        variableCoveragePercent,
        lastImportAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load equipment rate status' },
      { status: 500 }
    );
  }
}
