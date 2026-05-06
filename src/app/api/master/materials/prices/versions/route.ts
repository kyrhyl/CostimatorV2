import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import MaterialPrice from '@/models/MaterialPrice';

export async function GET() {
  try {
    await dbConnect();
    const versions = await MaterialPrice.distinct('cmpd_version', {
      cmpd_version: { $exists: true, $ne: '' },
    });
    return NextResponse.json({
      success: true,
      data: versions.sort((a, b) => String(b).localeCompare(String(a))),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to load CMPD versions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const targetVersion = String(body?.targetVersion || '').trim();
    const sourceVersion = String(body?.sourceVersion || '').trim();

    if (!targetVersion) {
      return NextResponse.json({ success: false, error: 'targetVersion is required' }, { status: 400 });
    }
    if (!sourceVersion) {
      return NextResponse.json({ success: false, error: 'sourceVersion is required' }, { status: 400 });
    }
    if (sourceVersion === targetVersion) {
      return NextResponse.json({ success: false, error: 'targetVersion must be different from sourceVersion' }, { status: 400 });
    }

    const existingTarget = await MaterialPrice.countDocuments({ cmpd_version: targetVersion });
    if (existingTarget > 0) {
      return NextResponse.json({ success: false, error: `CMPD version ${targetVersion} already has records` }, { status: 409 });
    }

    const sourceRows = await MaterialPrice.find({ cmpd_version: sourceVersion }).lean();
    if (!sourceRows.length) {
      return NextResponse.json({ success: false, error: `No records found for source version ${sourceVersion}` }, { status: 404 });
    }

    const cloned = sourceRows.map((row: any) => {
      const { _id, createdAt, updatedAt, ...rest } = row;
      return {
        ...rest,
        cmpd_version: targetVersion,
        isActive: true,
      };
    });

    const inserted = await MaterialPrice.insertMany(cloned, { ordered: false });
    return NextResponse.json({
      success: true,
      message: `Created CMPD version ${targetVersion} from ${sourceVersion}`,
      count: inserted.length,
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json({ success: false, error: 'Duplicate records encountered while cloning version' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message || 'Failed to create CMPD version' }, { status: 500 });
  }
}
