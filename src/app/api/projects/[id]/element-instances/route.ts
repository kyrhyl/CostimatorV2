import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';

// PATCH /api/projects/[id]/element-instances - Update project element instances
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { elementInstances } = body;

    if (!elementInstances || !Array.isArray(elementInstances)) {
      return NextResponse.json(
        { success: false, error: 'elementInstances array is required' },
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

    // Update element instances
    project.elementInstances = elementInstances;
    await project.save();

    return NextResponse.json({
      success: true,
      data: project.elementInstances
    });
  } catch (error: any) {
    console.error('Error updating element instances:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update element instances' },
      { status: 500 }
    );
  }
}

// GET /api/projects/[id]/element-instances - Get project element instances
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const project = await Project.findById(id).select('elementInstances');
    
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: project.elementInstances || []
    });
  } catch (error: any) {
    console.error('Error fetching element instances:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch element instances' },
      { status: 500 }
    );
  }
}
