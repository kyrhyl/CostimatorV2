import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import MaterialPrice from '@/models/MaterialPrice';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const cmpdVersion = String(body?.cmpd_version || '').trim();
    const district = String(body?.district || '').trim();
    const location = String(body?.location || '').trim();

    if (!cmpdVersion) {
      return NextResponse.json({ success: false, error: 'cmpd_version is required' }, { status: 400 });
    }

    const query: any = {
      $or: [
        { cmpd_version: { $exists: false } },
        { cmpd_version: null },
        { cmpd_version: '' },
      ],
    };

    const update: any = { cmpd_version: cmpdVersion };

    if (district) {
      query.$or = [
        ...query.$or,
        { district: { $exists: false } },
        { district: null },
        { district: '' },
      ];
      update.district = district;
    }

    if (location) {
      query.location = location;
    }

    const result = await MaterialPrice.updateMany(query, { $set: update });

    return NextResponse.json({
      success: true,
      message: `Backfilled metadata for ${result.modifiedCount} record(s)`,
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Backfill failed' }, { status: 500 });
  }
}
