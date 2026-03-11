/**
 * GET /api/master/materials/prices/versions
 * Get available CMPD versions, optionally filtered by district
 * 
 * Query Parameters:
 * - district: Filter by district (optional)
 * 
 * Returns:
 * {
 *   success: true,
 *   versions: ["CMPD-2024-Q1", "CMPD-2023-Q4", ...]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import MaterialPrice from '@/models/MaterialPrice';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const district = searchParams.get('district');
    
    // Build query
    const query: any = {
      cmpd_version: { $exists: true, $ne: '' }
    };
    
    if (district) {
      query.district = district;
    }
    
    // Get distinct CMPD versions
    const versions = await MaterialPrice.distinct('cmpd_version', query);
    
    // Filter out null/empty values and sort in descending order
    const sortedVersions = versions
      .filter(v => v && v.trim() !== '')
      .sort((a: string, b: string) => b.localeCompare(a));
    
    return NextResponse.json({
      success: true,
      count: sortedVersions.length,
      versions: sortedVersions
    });
  } catch (error: any) {
    console.error('GET /api/master/materials/prices/versions error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch CMPD versions' },
      { status: 500 }
    );
  }
}
