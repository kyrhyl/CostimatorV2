import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';

// PATCH /api/projects/[id]/levels - Update project levels
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { levels } = body;

    if (!levels || !Array.isArray(levels)) {
      return NextResponse.json(
        { success: false, error: 'levels array is required' },
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

    // Update levels
    project.levels = levels;
    await project.save();

    return NextResponse.json({
      success: true,
      data: project.levels
    });
  } catch (error: any) {
    console.error('Error updating levels:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update levels' },
      { status: 500 }
    );
  }
}

// GET /api/projects/[id]/levels - Get project levels
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const project = await Project.findById(id).select('levels');
    
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: project.levels || []
    });
  } catch (error: any) {
    console.error('Error fetching levels:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch levels' },
      { status: 500 }
    );
  }
}
