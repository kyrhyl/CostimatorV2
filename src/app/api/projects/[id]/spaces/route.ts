/**
 * API Route: /api/projects/[id]/spaces
 * Manage spaces for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import { computeSpaceGeometry, type GridSystem } from '@/lib/math/finishes';
import { v4 as uuidv4 } from 'uuid';
import type { Space } from '@/types';

// GET /api/projects/[id]/spaces - List all spaces
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
    
    // Ensure gridX/gridY are set from grid.xLines/grid.yLines if needed
    const responseProject = {
      ...project.toObject(),
      gridX: project.gridX || project.grid?.xLines || [],
      gridY: project.gridY || project.grid?.yLines || [],
    };
    
    return NextResponse.json({
      spaces: responseProject.spaces || [],
    });
  } catch (error: any) {
    console.error('Error fetching spaces:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch spaces' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/spaces - Create a new space
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
    if (!body.name || !body.levelId || !body.boundary) {
      return NextResponse.json(
        { error: 'Missing required fields: name, levelId, boundary' },
        { status: 400 }
      );
    }
    
    // Validate level exists
    const levelExists = project.levels?.some(l => l.label === body.levelId);
    if (!levelExists) {
      return NextResponse.json(
        { error: `Level ${body.levelId} not found` },
        { status: 400 }
      );
    }
    
    // Create grid system for geometry calculation
    // Check both possible locations for grid data
    const gridSystem: GridSystem = {
      gridX: project.gridX || project.grid?.xLines || [],
      gridY: project.gridY || project.grid?.yLines || [],
    };
    
    console.log('Creating space for project:', id);
    console.log('Request body:', body);
    console.log('Project.gridX:', project.gridX);
    console.log('Project.gridY:', project.gridY);
    console.log('Project.grid.xLines:', project.grid?.xLines);
    console.log('Project.grid.yLines:', project.grid?.yLines);
    console.log('Grid system used:', gridSystem);
    console.log('Looking for gridX labels:', body.boundary.data.gridX);
    console.log('Looking for gridY labels:', body.boundary.data.gridY);
    
    // Create space
    const newSpace: Space = {
      id: uuidv4(),
      name: body.name,
      levelId: body.levelId,
      boundary: body.boundary,
      computed: { area_m2: 0, perimeter_m: 0 },
      metadata: body.metadata || {},
      tags: body.tags || [],
    };
    
    // Compute geometry
    try {
      const geometry = computeSpaceGeometry(newSpace, gridSystem);
      console.log('Geometry computed:', geometry);
      newSpace.computed = geometry;
    } catch (error: any) {
      console.error('Geometry calculation error:', error);
      return NextResponse.json(
        { error: `Geometry calculation failed: ${error.message}` },
        { status: 400 }
      );
    }
    
    // Add to project
    if (!project.spaces) {
      project.spaces = [];
    }
    project.spaces.push(newSpace);
    
    console.log('Saving project with new space...');
    await project.save();
    console.log('Project saved successfully');
    
    return NextResponse.json({
      space: newSpace,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating space:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create space' },
      { status: 500 }
    );
  }
}
