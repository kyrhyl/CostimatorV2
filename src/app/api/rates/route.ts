/**
 * GET /api/rates
 * Returns list of Rate Items (DUPA templates) for estimate BOQ dropdowns
 */

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import RateItem from '@/models/RateItem';

export async function GET() {
  try {
    await dbConnect();

    // Fetch all rate items, sorted by pay item number
    const rateItems = await RateItem.find({})
      .select('payItemNumber payItemDescription unitOfMeasurement')
      .sort({ payItemNumber: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: rateItems,
      count: rateItems.length
    });
  } catch (error: any) {
    console.error('Error fetching rate items:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch rate items',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
