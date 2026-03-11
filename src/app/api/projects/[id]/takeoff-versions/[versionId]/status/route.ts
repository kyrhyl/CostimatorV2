/**
 * TakeoffVersion Status Transition API
 * 
 * PATCH /api/projects/[id]/takeoff-versions/[versionId]/status - Change version status
 * 
 * Supported transitions:
 * - draft → submitted
 * - submitted → approved
 * - submitted → rejected
 * - approved → superseded
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import TakeoffVersion from '@/models/TakeoffVersion';
import Project from '@/models/Project';
import mongoose from 'mongoose';

/**
 * PATCH /api/projects/[id]/takeoff-versions/[versionId]/status
 * Update the status of a takeoff version
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    await dbConnect();
    
    const { id: projectId, versionId } = params;
    const body = await request.json();
    const { action, userId, reason } = body;
    
    if (!action) {
      return NextResponse.json(
        { error: 'Action is required (submit, approve, reject, supersede)' },
        { status: 400 }
      );
    }
    
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
    
    let message = '';
    
    try {
      switch (action) {
        case 'submit':
          if (version.status !== 'draft') {
            return NextResponse.json(
              { error: 'Only draft versions can be submitted' },
              { status: 400 }
            );
          }
          await version.submit(userId || 'system');
          message = 'Version submitted for approval';
          break;
          
        case 'approve':
          if (version.status !== 'submitted') {
            return NextResponse.json(
              { error: 'Only submitted versions can be approved' },
              { status: 400 }
            );
          }
          await version.approve(userId || 'system');
          
          // Set as active version for the project
          const project = await Project.findById(projectId);
          if (project) {
            project.activeTakeoffVersionId = version._id as mongoose.Types.ObjectId;
            await project.save();
          }
          
          message = 'Version approved and set as active';
          break;
          
        case 'reject':
          if (version.status !== 'submitted') {
            return NextResponse.json(
              { error: 'Only submitted versions can be rejected' },
              { status: 400 }
            );
          }
          if (!reason) {
            return NextResponse.json(
              { error: 'Rejection reason is required' },
              { status: 400 }
            );
          }
          await version.reject(userId || 'system', reason);
          message = 'Version rejected';
          break;
          
        case 'supersede':
          if (version.status !== 'approved') {
            return NextResponse.json(
              { error: 'Only approved versions can be superseded' },
              { status: 400 }
            );
          }
          await version.supersede();
          message = 'Version marked as superseded';
          break;
          
        default:
          return NextResponse.json(
            { error: 'Invalid action. Must be: submit, approve, reject, or supersede' },
            { status: 400 }
          );
      }
      
      return NextResponse.json({
        success: true,
        data: version,
        message
      });
      
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
  } catch (error: any) {
    console.error('Error updating version status:', error);
    return NextResponse.json(
      { error: 'Failed to update version status', details: error.message },
      { status: 500 }
    );
  }
}
