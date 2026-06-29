import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import { z } from 'zod';
import mongoose from 'mongoose';
import { getSessionUser, hasRequiredRole } from '@/lib/auth/session';
import { PROJECT_WRITE_ROLES } from '@/lib/auth/roles';

const DuplicateProjectSchema = z.object({
  projectName: z.string().min(1, 'New project name is required'),
  projectLocation: z.string().optional(),
  copySettings: z.boolean().default(true),
});

/**
 * POST /api/projects/:id/duplicate
 * Duplicates a project for Program of Works planning.
 * Does NOT copy BOQ items or estimates.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRequiredRole(user, PROJECT_WRITE_ROLES)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;

    // Validate project ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Get source project
    const sourceProject = await Project.findById(id).lean();

    if (!sourceProject) {
      return NextResponse.json(
        { success: false, error: 'Source project not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const options = DuplicateProjectSchema.parse(body);

    // Check if a project with the same name already exists
    const existingProject = await Project.findOne({ 
      projectName: options.projectName 
    });

    if (existingProject) {
      return NextResponse.json(
        { 
          success: false, 
          error: `A project with the name "${options.projectName}" already exists. Please choose a different name.` 
        },
        { status: 409 }
      );
    }

    // Create new project object
    const newProjectData: any = {
      // Core metadata - copy with new name
      projectName: options.projectName,
      projectLocation: options.projectLocation || sourceProject.projectLocation,
      district: sourceProject.district,
      cmpdVersion: sourceProject.cmpdVersion,
      implementingOffice: sourceProject.implementingOffice,
      appropriation: sourceProject.appropriation,
      projectType: sourceProject.projectType,
      powMode: sourceProject.powMode,
      status: 'Planning', // Always start as Planning
      description: sourceProject.description 
        ? `Duplicated from: ${sourceProject.projectName}. ${sourceProject.description}`
        : `Duplicated from: ${sourceProject.projectName}`,
      
      // Reset dates
      startDate: undefined,
      endDate: undefined,
      targetStartDate: undefined,
      targetCompletionDate: undefined,
      
      // Copy hauling configuration
      haulingCostPerKm: sourceProject.haulingCostPerKm,
      distanceFromOffice: sourceProject.distanceFromOffice,
      haulingConfig: sourceProject.haulingConfig,
      
      // Copy DPWH fields
      address: sourceProject.address,
      contractDurationCD: sourceProject.contractDurationCD,
      workingDays: sourceProject.workingDays,
      unworkableDays: sourceProject.unworkableDays,
      fundSource: sourceProject.fundSource,
      physicalTarget: sourceProject.physicalTarget,
      projectComponent: sourceProject.projectComponent,
      allotedAmount: sourceProject.allotedAmount,
      estimatedComponentCost: sourceProject.estimatedComponentCost,
    };

    if (options.copySettings && sourceProject.settings) {
      newProjectData.settings = JSON.parse(JSON.stringify(sourceProject.settings));
    }

    // Create the new project
    const newProject = await Project.create(newProjectData);

    console.log(`Project duplicated successfully: ${sourceProject.projectName} → ${newProject.projectName}`);
    console.log(`New project ID: ${newProject._id}`);
    return NextResponse.json(
      {
        success: true,
        data: newProject,
        message: `Project duplicated successfully from "${sourceProject.projectName}"`,
        sourceProjectId: id,
        duplicatedItems: {
          settingsCopied: Boolean(newProjectData.settings),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST /api/projects/:id/duplicate error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to duplicate project',
      },
      { status: 500 }
    );
  }
}
