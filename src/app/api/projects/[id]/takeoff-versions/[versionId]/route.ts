/**
 * Individual TakeoffVersion API Routes
 * 
 * GET    /api/projects/[id]/takeoff-versions/[versionId] - Get specific version
 * PUT    /api/projects/[id]/takeoff-versions/[versionId] - Update version
 * DELETE /api/projects/[id]/takeoff-versions/[versionId] - Delete version
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import TakeoffVersion from '@/models/TakeoffVersion';
import CostEstimate from '@/models/CostEstimate';
import Project from '@/models/Project';

/**
 * GET /api/projects/[id]/takeoff-versions/[versionId]
 * Get a specific takeoff version
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    await dbConnect();
    
    const { id: projectId, versionId } = params;
    
    const version = await TakeoffVersion.findOne({
      _id: versionId,
      projectId
    });
    
    if (!version) {
      return NextResponse.json(
        { error: 'Takeoff version not found' },
        { status: 404 }
      );
    }
    
    // Get associated cost estimates
    const costEstimates = await CostEstimate.getEstimatesForTakeoff(versionId);
    
    return NextResponse.json({
      success: true,
      data: {
        ...version.toObject(),
        costEstimates
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching takeoff version:', error);
    return NextResponse.json(
      { error: 'Failed to fetch takeoff version', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]/takeoff-versions/[versionId]
 * Update a takeoff version (only allowed for draft/rejected versions)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    await dbConnect();
    
    const { id: projectId, versionId } = params;
    const body = await request.json();
    
    const version = await TakeoffVersion.findOne({
      _id: versionId,
      projectId
    });
    
    if (!version) {
      return NextResponse.json(
        { error: 'Takeoff version not found' },
        { status: 404 }
      );
    }
    
    // Only draft and rejected versions can be edited
    if (version.status !== 'draft' && version.status !== 'rejected') {
      return NextResponse.json(
        { error: 'Only draft or rejected versions can be edited' },
        { status: 400 }
      );
    }
    
    // Update allowed fields
    const updateFields = [
      'versionLabel',
      'description',
      'grid',
      'levels',
      'elementTemplates',
      'elementInstances',
      'spaces',
      'openings',
      'finishTypes',
      'spaceFinishAssignments',
      'wallSurfaces',
      'wallSurfaceFinishAssignments',
      'trussDesign',
      'roofTypes',
      'roofPlanes',
      'scheduleItems',
      'boqLines',
      'totalConcrete_m3',
      'totalRebar_kg',
      'totalFormwork_m2',
      'boqLineCount',
      'changesSummary'
    ];
    
    updateFields.forEach(field => {
      if (body[field] !== undefined) {
        (version as any)[field] = body[field];
      }
    });
    
    await version.save();
    
    return NextResponse.json({
      success: true,
      data: version,
      message: 'Takeoff version updated successfully'
    });
    
  } catch (error: any) {
    console.error('Error updating takeoff version:', error);
    return NextResponse.json(
      { error: 'Failed to update takeoff version', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/takeoff-versions/[versionId]
 * Delete a takeoff version (only allowed for draft/rejected versions)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    await dbConnect();
    
    const { id: projectId, versionId } = params;
    
    const version = await TakeoffVersion.findOne({
      _id: versionId,
      projectId
    });
    
    if (!version) {
      return NextResponse.json(
        { error: 'Takeoff version not found' },
        { status: 404 }
      );
    }
    
    // Only draft and rejected versions can be deleted
    if (version.status !== 'draft' && version.status !== 'rejected') {
      return NextResponse.json(
        { error: 'Only draft or rejected versions can be deleted' },
        { status: 400 }
      );
    }
    
    // Check if this version has cost estimates
    const estimateCount = await CostEstimate.countDocuments({ takeoffVersionId: versionId });
    if (estimateCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete version with associated cost estimates' },
        { status: 400 }
      );
    }
    
    // Update project if this was the active version
    const project = await Project.findById(projectId);
    if (project?.activeTakeoffVersionId?.toString() === versionId) {
      project.activeTakeoffVersionId = undefined;
      await project.save();
    }
    
    await version.deleteOne();
    
    return NextResponse.json({
      success: true,
      message: 'Takeoff version deleted successfully'
    });
    
  } catch (error: any) {
    console.error('Error deleting takeoff version:', error);
    return NextResponse.json(
      { error: 'Failed to delete takeoff version', details: error.message },
      { status: 500 }
    );
  }
}
