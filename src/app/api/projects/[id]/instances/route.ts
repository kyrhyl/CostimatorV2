import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import { z } from 'zod';

// Validation schema for element instances
const ElementInstanceSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  placement: z.object({
    gridRef: z.array(z.string()).optional(),
    levelId: z.string(),
    endLevelId: z.string().optional(),
    customGeometry: z.record(z.number()).optional(),
  }),
  tags: z.array(z.string()).optional(),
});

const UpdateInstancesSchema = z.object({
  instances: z.array(ElementInstanceSchema),
});

// PUT /api/projects/[id]/instances - Update project element instances
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    
    // Validate request body
    const validatedData = UpdateInstancesSchema.parse(body);

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Convert customGeometry from object to Map for Mongoose
    const instancesWithMaps = validatedData.instances.map((instance: any) => ({
      ...instance,
      placement: {
        ...instance.placement,
        customGeometry: instance.placement.customGeometry 
          ? new Map(Object.entries(instance.placement.customGeometry))
          : undefined,
      },
    }));

    // Update element instances
    project.elementInstances = instancesWithMaps;
    await project.save();

    console.log(`Updated ${validatedData.instances.length} element instances for project ${id}`);

    // Convert Maps to plain objects for JSON response
    const responseInstances = (project.elementInstances || []).map((instance: any) => ({
      id: instance.id,
      templateId: instance.templateId,
      placement: {
        gridRef: instance.placement.gridRef,
        levelId: instance.placement.levelId,
        endLevelId: instance.placement.endLevelId,
        customGeometry: instance.placement.customGeometry instanceof Map
          ? Object.fromEntries(instance.placement.customGeometry)
          : instance.placement.customGeometry,
      },
      tags: instance.tags,
    }));

    return NextResponse.json({
      success: true,
      instances: responseInstances,
      message: 'Instances updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating element instances:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update element instances' },
      { status: 500 }
    );
  }
}

// GET /api/projects/[id]/instances - Get project element instances
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

    // Convert Maps to plain objects for JSON serialization
    const instances = (project.elementInstances || []).map((instance: any) => ({
      id: instance.id,
      templateId: instance.templateId,
      placement: {
        gridRef: instance.placement.gridRef,
        levelId: instance.placement.levelId,
        endLevelId: instance.placement.endLevelId,
        customGeometry: instance.placement.customGeometry instanceof Map
          ? Object.fromEntries(instance.placement.customGeometry)
          : instance.placement.customGeometry,
      },
      tags: instance.tags,
    }));

    return NextResponse.json({
      success: true,
      instances,
    });
  } catch (error: any) {
    console.error('Error fetching element instances:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch element instances' },
      { status: 500 }
    );
  }
}
