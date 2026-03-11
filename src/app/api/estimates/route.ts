import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Estimate from '@/models/Estimate';

// GET /api/estimates - List all estimates
export async function GET() {
  try {
    await dbConnect();
    
    const estimates = await Estimate.find()
      .select('projectName projectLocation implementingOffice grandTotalSubmitted grandTotalEvaluated createdAt')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({
      success: true,
      data: estimates
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
