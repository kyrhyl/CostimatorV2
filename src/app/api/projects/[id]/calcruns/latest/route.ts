import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import CalcRunModel from '@/models/CalcRun';

// GET /api/projects/[id]/calcruns/latest - Get latest calc run for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    
    // Find the most recent calc run for this project
    const latestRun = await CalcRunModel.findOne({ projectId: id })
      .sort({ timestamp: -1 })
      .lean();
    
    if (!latestRun) {
      return NextResponse.json(
        { success: false, error: 'No calc runs found for this project' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: latestRun
    });
  } catch (error: any) {
    console.error('Error fetching latest calc run:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch calc run' },
      { status: 500 }
    );
  }
}
