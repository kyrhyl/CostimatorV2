import { NextRequest, NextResponse } from 'next/server';
import Project from '@/models/Project';
import dbConnect from '@/lib/db/connect';
import { computeWallSurfaceGeometry, validateWallSurface } from '@/lib/math/finishes/wallSurface';

/**
 * GET /api/projects/[id]/wall-surfaces/[wallSurfaceId]
 * Retrieve a specific wall surface
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; wallSurfaceId: string }> }
) {
  try {
    const { id, wallSurfaceId } = await params;
    await dbConnect();
    const project = await Project.findById(id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const wallSurface = project.wallSurfaces?.find(
      (ws: any) => ws.id === wallSurfaceId
    );

    if (!wallSurface) {
      return NextResponse.json({ error: 'Wall surface not found' }, { status: 404 });
    }

    return NextResponse.json(wallSurface);
  } catch (error) {
    console.error('Error fetching wall surface:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wall surface' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]/wall-surfaces/[wallSurfaceId]
 * Update a wall surface
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; wallSurfaceId: string }> }
) {
  try {
    const { id, wallSurfaceId } = await params;
    await dbConnect();
    const project = await Project.findById(id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();

    // Find wall surface index
    const wallSurfaceIndex = project.wallSurfaces?.findIndex(
      (ws: any) => ws.id === wallSurfaceId
    );

    if (wallSurfaceIndex === -1 || wallSurfaceIndex === undefined) {
      return NextResponse.json({ error: 'Wall surface not found' }, { status: 404 });
    }

    // Get grid data from either location (gridX/gridY or grid.xLines/yLines)
    const gridX = project.gridX || project.grid?.xLines || [];
    const gridY = project.gridY || project.grid?.yLines || [];

    // Validate updated wall surface
    const validation = validateWallSurface(
      body,
      { gridX, gridY },
      project.levels || []
    );

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid wall surface', details: validation.errors },
        { status: 400 }
      );
    }

    // Recompute geometry
    const geometry = computeWallSurfaceGeometry(
      body,
      { gridX, gridY },
      project.levels || []
    );

    // Update wall surface
    if (project.wallSurfaces) {
      project.wallSurfaces[wallSurfaceIndex] = {
        ...project.wallSurfaces[wallSurfaceIndex],
        name: body.name,
        gridLine: body.gridLine,
        levelStart: body.levelStart,
        levelEnd: body.levelEnd,
        surfaceType: body.surfaceType,
        facing: body.facing,
        computed: geometry,
        tags: body.tags || [],
      };
    }

    await project.save();

    return NextResponse.json(project.wallSurfaces?.[wallSurfaceIndex]);
  } catch (error) {
    console.error('Error updating wall surface:', error);
    return NextResponse.json(
      { error: 'Failed to update wall surface' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/wall-surfaces/[wallSurfaceId]
 * Delete a wall surface
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; wallSurfaceId: string }> }
) {
  try {
    const { id, wallSurfaceId } = await params;
    await dbConnect();
    const project = await Project.findById(id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Remove wall surface
    const originalLength = project.wallSurfaces?.length || 0;
    project.wallSurfaces = project.wallSurfaces?.filter(
      (ws: any) => ws.id !== wallSurfaceId
    );

    if (project.wallSurfaces?.length === originalLength) {
      return NextResponse.json({ error: 'Wall surface not found' }, { status: 404 });
    }

    // Also remove related openings
    if (project.openings) {
      project.openings = project.openings.filter(
        (o: any) => o.wallSurfaceId !== wallSurfaceId
      );
    }

    await project.save();

    return NextResponse.json({ success: true, message: 'Wall surface deleted' });
  } catch (error) {
    console.error('Error deleting wall surface:', error);
    return NextResponse.json(
      { error: 'Failed to delete wall surface' },
      { status: 500 }
    );
  }
}
