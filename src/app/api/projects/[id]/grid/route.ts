import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';

// PATCH /api/projects/[id]/grid - Update project grid
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { xLines, yLines } = body;

    if (!xLines || !yLines) {
      return NextResponse.json(
        { success: false, error: 'xLines and yLines are required' },
        { status: 400 }
      );
    }

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Update grid
    project.grid = { xLines, yLines };
    await project.save();

    return NextResponse.json({
      success: true,
      data: project.grid
    });
  } catch (error: any) {
    console.error('Error updating grid:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update grid' },
      { status: 500 }
    );
  }
}

// GET /api/projects/[id]/grid - Get project grid
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const project = await Project.findById(id).select('grid');
    
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const gridData = project.grid || { xLines: [], yLines: [] };
    
    return NextResponse.json({
      success: true,
      data: {
        ...gridData,
        gridX: gridData.xLines,
        gridY: gridData.yLines,
      }
    });
  } catch (error: any) {
    console.error('Error fetching grid:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch grid' },
      { status: 500 }
    );
  }
}
