/**
 * API Route: /api/projects/[id]/wall-surface-assignments
 * Manage wall surface finish assignments
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import { v4 as uuidv4 } from 'uuid';

// GET /api/projects/[id]/wall-surface-assignments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    
    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      assignments: project.wallSurfaceFinishAssignments || [] 
    });
  } catch (error: any) {
    console.error('Error fetching wall surface assignments:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/wall-surface-assignments
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    
    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Validate required fields
    if (!body.wallSurfaceId || !body.finishTypeId || !body.scope) {
      return NextResponse.json(
        { error: 'Missing required fields: wallSurfaceId, finishTypeId, scope' },
        { status: 400 }
      );
    }
    
    // Validate wall surface exists
    const wallSurfaceExists = project.wallSurfaces?.some((ws: any) => ws.id === body.wallSurfaceId);
    if (!wallSurfaceExists) {
      return NextResponse.json(
        { error: `Wall surface ${body.wallSurfaceId} not found` },
        { status: 400 }
      );
    }
    
    // Validate finish type exists
    const finishTypeExists = project.finishTypes?.some((ft: any) => ft.id === body.finishTypeId);
    if (!finishTypeExists) {
      return NextResponse.json(
        { error: `Finish type ${body.finishTypeId} not found` },
        { status: 400 }
      );
    }
    
    // Create assignment
    const newAssignment = {
      id: uuidv4(),
      wallSurfaceId: body.wallSurfaceId,
      finishTypeId: body.finishTypeId,
      scope: body.scope,
      side: body.side || 'single',
      overrides: body.overrides || {},
    };
    
    // Add to project
    if (!project.wallSurfaceFinishAssignments) {
      project.wallSurfaceFinishAssignments = [];
    }
    project.wallSurfaceFinishAssignments.push(newAssignment);
    
    await project.save();
    
    return NextResponse.json({ assignment: newAssignment }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating wall surface assignment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create assignment' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/wall-surface-assignments
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');
    
    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Assignment ID required' },
        { status: 400 }
      );
    }
    
    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    const assignmentIndex = project.wallSurfaceFinishAssignments?.findIndex(
      (a: any) => a.id === assignmentId
    );
    if (assignmentIndex === undefined || assignmentIndex === -1) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }
    
    project.wallSurfaceFinishAssignments!.splice(assignmentIndex, 1);
    await project.save();
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting wall surface assignment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete assignment' },
      { status: 500 }
    );
  }
}
