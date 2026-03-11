import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import CalcRunModel from '@/models/CalcRun';

// GET /api/projects/[id]/calcruns/[runId] - Get specific calc run
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  try {
    await dbConnect();
    const { id, runId } = await params;
    
    // Find specific calc run
    const calcRun = await CalcRunModel.findOne({ projectId: id, runId })
      .lean();
    
    if (!calcRun) {
      return NextResponse.json(
        { success: false, error: 'Calc run not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: calcRun
    });
  } catch (error: any) {
    console.error('Error fetching calc run:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch calc run' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/calcruns/[runId] - Delete specific calc run
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  try {
    await dbConnect();
    const { id, runId } = await params;
    
    // Delete the calc run
    const result = await CalcRunModel.deleteOne({ projectId: id, runId });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Calc run not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Calc run deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting calc run:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete calc run' },
      { status: 500 }
    );
  }
}
