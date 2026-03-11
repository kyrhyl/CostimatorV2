/**
 * TakeoffVersion Duplicate API
 * 
 * POST /api/projects/[id]/takeoff-versions/[versionId]/duplicate
 * 
 * Creates a new version based on an existing version
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import TakeoffVersion from '@/models/TakeoffVersion';

/**
 * POST /api/projects/[id]/takeoff-versions/[versionId]/duplicate
 * Duplicate an existing takeoff version
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    await dbConnect();
    
    const { id: projectId, versionId } = params;
    const body = await request.json();
    
    // Find the source version
    const sourceVersion = await TakeoffVersion.findOne({
      _id: versionId,
      projectId
    });
    
    if (!sourceVersion) {
      return NextResponse.json(
        { error: 'Source takeoff version not found' },
        { status: 404 }
      );
    }
    
    // Get next version number
    const versionNumber = await TakeoffVersion.getNextVersionNumber(projectId);
    
    // Create duplicate with new version number
    const duplicateVersion = new TakeoffVersion({
      projectId,
      versionNumber,
      versionLabel: body.versionLabel || `${sourceVersion.versionLabel} (Copy)`,
      versionType: body.versionType || sourceVersion.versionType,
      description: body.description || `Duplicated from version ${sourceVersion.versionNumber}`,
      status: 'draft',
      createdBy: body.createdBy || 'system',
      
      // Copy design data from source
      grid: sourceVersion.grid,
      levels: sourceVersion.levels,
      elementTemplates: sourceVersion.elementTemplates,
      elementInstances: sourceVersion.elementInstances,
      
      // Copy Part E data
      spaces: sourceVersion.spaces,
      openings: sourceVersion.openings,
      finishTypes: sourceVersion.finishTypes,
      spaceFinishAssignments: sourceVersion.spaceFinishAssignments,
      wallSurfaces: sourceVersion.wallSurfaces,
      wallSurfaceFinishAssignments: sourceVersion.wallSurfaceFinishAssignments,
      trussDesign: sourceVersion.trussDesign,
      roofTypes: sourceVersion.roofTypes,
      roofPlanes: sourceVersion.roofPlanes,
      scheduleItems: sourceVersion.scheduleItems,
      
      // Copy BOQ and quantities
      boqLines: sourceVersion.boqLines,
      totalConcrete_m3: sourceVersion.totalConcrete_m3,
      totalRebar_kg: sourceVersion.totalRebar_kg,
      totalFormwork_m2: sourceVersion.totalFormwork_m2,
      boqLineCount: sourceVersion.boqLineCount,
      
      // Set parent reference
      parentVersionId: sourceVersion._id,
      
      // No changes yet since it's a duplicate
      changesSummary: {
        elementsAdded: 0,
        elementsRemoved: 0,
        elementsModified: 0,
      }
    });
    
    await duplicateVersion.save();
    
    return NextResponse.json({
      success: true,
      data: duplicateVersion,
      sourceVersionId: versionId,
      message: `Version ${sourceVersion.versionNumber} duplicated as version ${versionNumber}`
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error duplicating takeoff version:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate takeoff version', details: error.message },
      { status: 500 }
    );
  }
}
