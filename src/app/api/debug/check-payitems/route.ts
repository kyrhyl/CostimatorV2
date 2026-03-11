import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import PayItem from '@/models/PayItem';

/**
 * GET /api/debug/check-payitems
 * Debug endpoint to check PayItem collection status
 */
export async function GET() {
  try {
    await dbConnect();
    
    // Count total pay items
    const total = await PayItem.countDocuments();
    
    // Count active pay items
    const activeCount = await PayItem.countDocuments({ isActive: true });
    
    // Get sample pay items
    const samples = await PayItem.find().limit(10).lean();
    
    // Get unique parts
    const parts = await PayItem.distinct('part');
    
    // Get parts with counts
    const partCounts: any = {};
    for (const part of parts) {
      if (part) {
        partCounts[part] = await PayItem.countDocuments({ part, isActive: true });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total,
        activeCount,
        inactiveCount: total - activeCount,
        samples: samples.map(item => ({
          payItemNumber: item.payItemNumber,
          description: item.description,
          unit: item.unit,
          part: item.part,
          isActive: item.isActive,
        })),
        parts: parts.filter(Boolean).sort(),
        partCounts,
      },
    });

  } catch (error: any) {
    console.error('Error checking pay items:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to check pay items' 
      },
      { status: 500 }
    );
  }
}
