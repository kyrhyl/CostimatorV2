import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import PayItemClassification from '@/models/PayItemClassification';
import { resolveClassificationInput, syncExistingPayItemClassifications } from '@/lib/classifications/pay-item';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    await syncExistingPayItemClassifications();

    const { searchParams } = new URL(request.url);
    const part = String(searchParams.get('part') || '').trim();
    const category = String(searchParams.get('category') || '').trim();
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    const query: Record<string, any> = {};
    if (part) query.part = part;
    if (category) query.category = category;
    if (activeOnly) query.isActive = true;

    const rows = await PayItemClassification.find(query)
      .sort({ part: 1, sortOrder: 1, category: 1, subCategory: 1 })
      .lean();

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch classifications' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const resolved = await resolveClassificationInput(body);
    if (!resolved.displayLabel || !resolved.part) {
      return NextResponse.json({ success: false, error: 'Part and category or sub-category are required' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: resolved }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to save classification' }, { status: 500 });
  }
}
