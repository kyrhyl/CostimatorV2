/**
 * TakeoffVersion API Routes
 * 
 * POST   /api/projects/[id]/takeoff-versions - Create new version
 * GET    /api/projects/[id]/takeoff-versions - List all versions for project
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import TakeoffVersion from '@/models/TakeoffVersion';
import Project from '@/models/Project';
import mongoose from 'mongoose';

/**
 * POST /api/projects/[id]/takeoff-versions
 * Create a new takeoff version for a project
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const { id: projectId } = await params;
    
    // Validate project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    
    // Get next version number
    const versionNumber = await TakeoffVersion.getNextVersionNumber(projectId);
    
    // Create new takeoff version
    const takeoffVersion = new TakeoffVersion({
      projectId,
      versionNumber,
      versionLabel: body.versionLabel || `Version ${versionNumber}`,
      versionType: body.versionType || 'preliminary',
      description: body.description,
      status: 'draft',
      createdBy: body.createdBy || 'system',
      
      // Design data snapshot
      grid: body.grid || project.grid,
      levels: body.levels || project.levels,
      elementTemplates: body.elementTemplates || project.elementTemplates || [],
      elementInstances: body.elementInstances || project.elementInstances || [],
      
      // Part E data
      spaces: body.spaces || project.spaces,
      openings: body.openings || project.openings,
      finishTypes: body.finishTypes || project.finishTypes,
      spaceFinishAssignments: body.spaceFinishAssignments || project.spaceFinishAssignments,
      wallSurfaces: body.wallSurfaces || project.wallSurfaces,
      wallSurfaceFinishAssignments: body.wallSurfaceFinishAssignments || project.wallSurfaceFinishAssignments,
      trussDesign: body.trussDesign || project.trussDesign,
      roofTypes: body.roofTypes || project.roofTypes,
      roofPlanes: body.roofPlanes || project.roofPlanes,
      scheduleItems: body.scheduleItems || project.scheduleItems,
      
      // BOQ lines
      boqLines: body.boqLines || [],
      
      // Computed quantities
      totalConcrete_m3: body.totalConcrete_m3 || 0,
      totalRebar_kg: body.totalRebar_kg || 0,
      totalFormwork_m2: body.totalFormwork_m2 || 0,
      boqLineCount: body.boqLines?.length || 0,
      
      // Comparison metadata
      parentVersionId: body.parentVersionId,
      changesSummary: body.changesSummary,
    });
    
    await takeoffVersion.save();
    
    // Update project's active version if this is the first version
    if (versionNumber === 1) {
      project.activeTakeoffVersionId = takeoffVersion._id as mongoose.Types.ObjectId;
      await project.save();
    }
    
    return NextResponse.json({
      success: true,
      data: takeoffVersion,
      message: 'Takeoff version created successfully'
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error creating takeoff version:', error);
    return NextResponse.json(
      { error: 'Failed to create takeoff version', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[id]/takeoff-versions
 * Get all takeoff versions for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const includeSuperseded = searchParams.get('includeSuperseded') === 'true';
    
    // Validate project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Get versions
    const versions = await TakeoffVersion.getProjectVersions(projectId, {
      includeSuperseded
    });
    
    return NextResponse.json({
      success: true,
      data: versions,
      count: versions.length,
      projectId,
      activeTakeoffVersionId: project.activeTakeoffVersionId
    });
    
  } catch (error: any) {
    console.error('Error fetching takeoff versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch takeoff versions', details: error.message },
      { status: 500 }
    );
  }
}
