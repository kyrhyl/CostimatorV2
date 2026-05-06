import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Material from '@/models/Material';
import MaterialPrice from '@/models/MaterialPrice';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const district = String(searchParams.get('district') || '').trim();
    const cmpdVersion = String(searchParams.get('cmpd_version') || '').trim();
    const location = String(searchParams.get('location') || '').trim();

    if (!district || !cmpdVersion) {
      return NextResponse.json(
        { success: false, error: 'district and cmpd_version are required' },
        { status: 400 }
      );
    }

    const activeMaterials = await Material.find({ isActive: true })
      .select('materialCode materialDescription unit category')
      .lean();

    const priceQuery: Record<string, unknown> = {
      cmpd_version: cmpdVersion,
      district,
      isActive: true,
    };
    if (location) {
      priceQuery.location = location;
    }

    const prices = await MaterialPrice.find(priceQuery)
      .select('materialCode priceSource')
      .lean();

    const coverageByCode = new Map<string, { hasCmpd: boolean; hasCanvass: boolean }>();
    for (const row of prices as any[]) {
      const code = String(row.materialCode || '').trim().toUpperCase();
      if (!code) continue;
      const current = coverageByCode.get(code) || { hasCmpd: false, hasCanvass: false };
      if ((row.priceSource || 'cmpd') === 'canvass') {
        current.hasCanvass = true;
      } else {
        current.hasCmpd = true;
      }
      coverageByCode.set(code, current);
    }

    let cmpdCount = 0;
    let canvassOnlyCount = 0;
    const missingMaterials: Array<{ materialCode: string; description: string; unit: string; category: string }> = [];

    for (const material of activeMaterials as any[]) {
      const code = String(material.materialCode || '').trim().toUpperCase();
      const coverage = coverageByCode.get(code);
      if (coverage?.hasCmpd) {
        cmpdCount += 1;
      } else if (coverage?.hasCanvass) {
        canvassOnlyCount += 1;
      } else {
        missingMaterials.push({
          materialCode: code,
          description: String(material.materialDescription || ''),
          unit: String(material.unit || ''),
          category: String(material.category || ''),
        });
      }
    }

    const totalMaterials = activeMaterials.length;
    const missingCount = missingMaterials.length;
    const coveredCount = totalMaterials - missingCount;
    const coveragePercent = totalMaterials > 0 ? Number(((coveredCount / totalMaterials) * 100).toFixed(2)) : 0;

    return NextResponse.json({
      success: true,
      data: {
        district,
        cmpd_version: cmpdVersion,
        location,
        totalMaterials,
        cmpdCount,
        canvassOnlyCount,
        missingCount,
        coveragePercent,
        missingMaterials,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load CMPD coverage' },
      { status: 500 }
    );
  }
}
