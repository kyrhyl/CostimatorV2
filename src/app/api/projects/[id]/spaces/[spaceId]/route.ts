/**
 * API Route: /api/projects/[projectId]/spaces/[spaceId]
 * Manage individual space
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import { computeSpaceGeometry, type GridSystem } from '@/lib/math/finishes';

// GET /api/projects/[projectId]/spaces/[spaceId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; spaceId: string }> }
) {
  try {
    await dbConnect();
    const { id, spaceId } = await params;
    
    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    const space = project.spaces?.find(s => s.id === spaceId);
    if (!space) {
      return NextResponse.json(
        { error: 'Space not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ space });
  } catch (error: any) {
    console.error('Error fetching space:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch space' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[projectId]/spaces/[spaceId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; spaceId: string }> }
) {
  try {
    await dbConnect();
    const { id, spaceId } = await params;
    const body = await request.json();
    
    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    const spaceIndex = project.spaces?.findIndex(s => s.id === spaceId);
    if (spaceIndex === undefined || spaceIndex === -1) {
      return NextResponse.json(
        { error: 'Space not found' },
        { status: 404 }
      );
    }
    
    const space = project.spaces![spaceIndex];
    
    // Update fields
    if (body.name !== undefined) space.name = body.name;
    if (body.levelId !== undefined) {
      const levelExists = project.levels?.some(l => l.label === body.levelId);
      if (!levelExists) {
        return NextResponse.json(
          { error: `Level ${body.levelId} not found` },
          { status: 400 }
        );
      }
      space.levelId = body.levelId;
    }
    if (body.boundary !== undefined) space.boundary = body.boundary;
    if (body.metadata !== undefined) space.metadata = body.metadata;
    if (body.tags !== undefined) space.tags = body.tags;
    
    // Recompute geometry if boundary changed
    if (body.boundary !== undefined) {
      const gridSystem: GridSystem = {
        gridX: project.gridX || [],
        gridY: project.gridY || [],
      };
      
      try {
        const geometry = computeSpaceGeometry(space, gridSystem);
        space.computed = geometry;
      } catch (error: any) {
        return NextResponse.json(
          { error: `Geometry calculation failed: ${error.message}` },
          { status: 400 }
        );
      }
    }
    
    await project.save();
    
    return NextResponse.json({ space });
  } catch (error: any) {
    console.error('Error updating space:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update space' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[projectId]/spaces/[spaceId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; spaceId: string }> }
) {
  try {
    await dbConnect();
    const { id, spaceId } = await params;
    
    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    const spaceIndex = project.spaces?.findIndex(s => s.id === spaceId);
    if (spaceIndex === undefined || spaceIndex === -1) {
      return NextResponse.json(
        { error: 'Space not found' },
        { status: 404 }
      );
    }
    
    // Remove space
    project.spaces!.splice(spaceIndex, 1);
    
    // Also remove related assignments
    if (project.spaceFinishAssignments) {
      project.spaceFinishAssignments = project.spaceFinishAssignments.filter(
        a => a.spaceId !== spaceId
      );
    }
    
    // Remove related openings
    if (project.openings) {
      project.openings = project.openings.filter(
        o => o.spaceId !== spaceId
      );
    }
    
    await project.save();
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting space:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete space' },
      { status: 500 }
    );
  }
}
