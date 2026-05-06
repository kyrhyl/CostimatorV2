import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import LaborRate from '@/models/LaborRate';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const district = searchParams.get('district');

    const query: Record<string, unknown> = {};
    if (district) query.district = district;

    const rows = await LaborRate.find(query)
      .select('laborVersion status isActive publishedAt district validFrom validTo effectiveDate updatedAt')
      .sort({ laborVersion: -1, updatedAt: -1 })
      .lean();

    const grouped = new Map<string, any>();
    rows.forEach((row: any) => {
      const key = String(row.laborVersion || '').trim() || 'UNVERSIONED';
      const current = grouped.get(key);
      if (!current) {
        grouped.set(key, {
          laborVersion: key,
          status: row.status || 'published',
          isActive: Boolean(row.isActive ?? true),
          publishedAt: row.publishedAt || null,
          validFrom: row.validFrom || null,
          validTo: row.validTo || null,
          district: row.district || null,
          records: 1,
          latestUpdatedAt: row.updatedAt || row.effectiveDate || null,
        });
      } else {
        current.records += 1;
        if (!current.latestUpdatedAt || new Date(row.updatedAt || 0) > new Date(current.latestUpdatedAt)) {
          current.latestUpdatedAt = row.updatedAt || current.latestUpdatedAt;
        }
      }
    });

    const versions = Array.from(grouped.values()).sort((a, b) =>
      String(b.laborVersion).localeCompare(String(a.laborVersion))
    );

    return NextResponse.json({ success: true, count: versions.length, versions });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load labor versions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    if (body?.action === 'publish') {
      const laborVersion = String(body?.laborVersion || '').trim();
      if (!laborVersion) {
        return NextResponse.json({ success: false, error: 'laborVersion is required' }, { status: 400 });
      }

      const updateResult = await LaborRate.updateMany(
        { laborVersion },
        { $set: { status: 'published', isActive: true, publishedAt: new Date() } }
      );

      return NextResponse.json({
        success: true,
        message: `Published ${laborVersion}`,
        matched: updateResult.matchedCount,
        modified: updateResult.modifiedCount,
      });
    }

    if (body?.action === 'clone') {
      const sourceLaborVersion = String(body?.sourceLaborVersion || '').trim();
      const targetLaborVersion = String(body?.targetLaborVersion || '').trim();

      if (!sourceLaborVersion || !targetLaborVersion) {
        return NextResponse.json(
          { success: false, error: 'sourceLaborVersion and targetLaborVersion are required' },
          { status: 400 }
        );
      }

      if (sourceLaborVersion === targetLaborVersion) {
        return NextResponse.json(
          { success: false, error: 'Target version must be different from source version' },
          { status: 400 }
        );
      }

      const sourceRows = await LaborRate.find({ laborVersion: sourceLaborVersion }).lean();
      if (!sourceRows.length) {
        return NextResponse.json(
          { success: false, error: `No labor rates found for ${sourceLaborVersion}` },
          { status: 404 }
        );
      }

      const cloneRows = sourceRows.map((row: any) => {
        const { _id, createdAt, updatedAt, publishedAt, ...rest } = row;
        return {
          ...rest,
          laborVersion: targetLaborVersion,
          status: 'draft',
          isActive: true,
          publishedAt: null,
        };
      });

      try {
        const inserted = await LaborRate.insertMany(cloneRows, { ordered: false });
        return NextResponse.json({
          success: true,
          message: `Cloned ${inserted.length} labor rates from ${sourceLaborVersion} to ${targetLaborVersion}`,
          count: inserted.length,
        });
      } catch (error: any) {
        if (error?.code === 11000) {
          return NextResponse.json(
            { success: false, error: `Target labor version ${targetLaborVersion} already has one or more records` },
            { status: 409 }
          );
        }
        throw error;
      }
    }

    if (body?.action === 'archive') {
      const laborVersion = String(body?.laborVersion || '').trim();
      if (!laborVersion) {
        return NextResponse.json({ success: false, error: 'laborVersion is required' }, { status: 400 });
      }

      const existingCount = await LaborRate.countDocuments({ laborVersion });
      if (!existingCount) {
        return NextResponse.json(
          { success: false, error: `No labor rates found for ${laborVersion}` },
          { status: 404 }
        );
      }

      const updateResult = await LaborRate.updateMany(
        { laborVersion },
        { $set: { status: 'archived', isActive: false } }
      );

      return NextResponse.json({
        success: true,
        message: `Archived ${laborVersion}`,
        matched: updateResult.matchedCount,
        modified: updateResult.modifiedCount,
      });
    }

    return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process labor version action' },
      { status: 500 }
    );
  }
}
