/**
 * API Route: /api/projects/[id]/finish-assignments
 * Manage finish assignments (space-finish mappings)
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import { v4 as uuidv4 } from 'uuid';
import type { SpaceFinishAssignment } from '@/types';

// GET /api/projects/[id]/finish-assignments
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
    
    // Filter by query parameters
    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get('spaceId');
    
    let assignments = project.spaceFinishAssignments || [];
    
    if (spaceId) {
      assignments = assignments.filter(a => a.spaceId === spaceId);
    }
    
    return NextResponse.json({ assignments });
  } catch (error: any) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/finish-assignments
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
    if (!body.spaceId || !body.finishTypeId || !body.scope) {
      return NextResponse.json(
        { error: 'Missing required fields: spaceId, finishTypeId, scope' },
        { status: 400 }
      );
    }
    
    // Validate space exists
    const spaceExists = project.spaces?.some(s => s.id === body.spaceId);
    if (!spaceExists) {
      return NextResponse.json(
        { error: `Space ${body.spaceId} not found` },
        { status: 400 }
      );
    }
    
    // Validate finish type exists
    const finishTypeExists = project.finishTypes?.some(ft => ft.id === body.finishTypeId);
    if (!finishTypeExists) {
      return NextResponse.json(
        { error: `Finish type ${body.finishTypeId} not found` },
        { status: 400 }
      );
    }
    
    // Create assignment
    const newAssignment: SpaceFinishAssignment = {
      id: uuidv4(),
      spaceId: body.spaceId,
      finishTypeId: body.finishTypeId,
      scope: body.scope,
      overrides: body.overrides || {},
    };
    
    // Add to project
    if (!project.spaceFinishAssignments) {
      project.spaceFinishAssignments = [];
    }
    project.spaceFinishAssignments.push(newAssignment);
    
    await project.save();
    
    return NextResponse.json({ assignment: newAssignment }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating assignment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create assignment' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/finish-assignments/[assignmentId]
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
    
    const assignmentIndex = project.spaceFinishAssignments?.findIndex(
      a => a.id === assignmentId
    );
    if (assignmentIndex === undefined || assignmentIndex === -1) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }
    
    project.spaceFinishAssignments!.splice(assignmentIndex, 1);
    await project.save();
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete assignment' },
      { status: 500 }
    );
  }
}
