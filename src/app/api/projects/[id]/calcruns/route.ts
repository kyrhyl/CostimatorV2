import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import CalcRunModel from '@/models/CalcRun';

// GET /api/projects/[id]/calcruns - Get all calc runs for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    
    // Find all calc runs for this project, sorted by most recent first
    const calcRuns = await CalcRunModel.find({ projectId: id })
      .sort({ timestamp: -1 })
      .select('runId projectId timestamp status summary errors')
      .lean();

    return NextResponse.json({
      success: true,
      data: calcRuns
    });
  } catch (error: any) {
    console.error('Error fetching calc runs:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch calc runs' },
      { status: 500 }
    );
  }
}
