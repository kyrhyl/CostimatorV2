/**
 * API Route: /api/projects/[id]/finish-types
 * Manage finish type templates for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import { v4 as uuidv4 } from 'uuid';
import type { FinishType } from '@/types';
import catalog from '@/data/dpwh-catalog.json';

// GET /api/projects/[id]/finish-types
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
    
    // Filter by category if provided
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    let finishTypes = project.finishTypes || [];
    
    if (category) {
      finishTypes = finishTypes.filter(ft => ft.category === category);
    }
    
    return NextResponse.json({ finishTypes });
  } catch (error: any) {
    console.error('Error fetching finish types:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch finish types' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/finish-types
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
    if (!body.category || !body.finishName || !body.dpwhItemNumberRaw || !body.unit) {
      return NextResponse.json(
        { error: 'Missing required fields: category, finishName, dpwhItemNumberRaw, unit' },
        { status: 400 }
      );
    }
    
    // Validate DPWH item exists in catalog
    const catalogItem = catalog.items.find(
      (item: any) => item.itemNumber === body.dpwhItemNumberRaw
    );
    
    if (!catalogItem) {
      return NextResponse.json(
        { error: `DPWH item ${body.dpwhItemNumberRaw} not found in catalog` },
        { status: 400 }
      );
    }
    
    // Validate unit matches catalog
    if (catalogItem.unit !== body.unit) {
      return NextResponse.json(
        { 
          error: `Unit mismatch: catalog has "${catalogItem.unit}", you provided "${body.unit}"`,
          catalogUnit: catalogItem.unit,
        },
        { status: 400 }
      );
    }
    
    // Create finish type
    const newFinishType: FinishType = {
      id: uuidv4(),
      category: body.category,
      finishName: body.finishName,
      dpwhItemNumberRaw: body.dpwhItemNumberRaw,
      unit: body.unit,
      wallHeightRule: body.wallHeightRule || { mode: 'fullHeight' },
      deductionRule: body.deductionRule || {
        enabled: true,
        minOpeningAreaToDeduct_m2: 0.5,
        includeTypes: ['door', 'window'],
      },
      assumptions: body.assumptions || {},
    };
    
    // Add to project
    if (!project.finishTypes) {
      project.finishTypes = [];
    }
    project.finishTypes.push(newFinishType);
    
    await project.save();
    
    return NextResponse.json({
      finishType: newFinishType,
      catalogItem,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating finish type:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create finish type' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/finish-types/[finishTypeId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const finishTypeId = searchParams.get('finishTypeId');
    
    if (!finishTypeId) {
      return NextResponse.json(
        { error: 'Finish type ID required' },
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
    
    const finishTypeIndex = project.finishTypes?.findIndex(ft => ft.id === finishTypeId);
    if (finishTypeIndex === undefined || finishTypeIndex === -1) {
      return NextResponse.json(
        { error: 'Finish type not found' },
        { status: 404 }
      );
    }
    
    // Remove finish type
    project.finishTypes!.splice(finishTypeIndex, 1);
    
    // Also remove related assignments
    if (project.spaceFinishAssignments) {
      project.spaceFinishAssignments = project.spaceFinishAssignments.filter(
        a => a.finishTypeId !== finishTypeId
      );
    }
    
    await project.save();
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting finish type:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete finish type' },
      { status: 500 }
    );
  }
}
