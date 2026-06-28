import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import Estimate from '@/models/Estimate';
import { z } from 'zod';
import mongoose from 'mongoose';
import { getSessionUser, hasRequiredRole } from '@/lib/auth/session';
import { PROJECT_READ_ROLES, PROJECT_WRITE_ROLES, PROJECT_DELETE_ROLES } from '@/lib/auth/roles';
import { buildAuditActor, diffAuditFields, logAuditEvent } from '@/lib/audit/logger';

const ProjectUpdateSchema = z.object({
  projectName: z.string().min(1).optional(),
  projectLocation: z.string().min(1).optional(),
  district: z.string().optional(),
  laborVersion: z.string().optional(),
  equipmentVersion: z.string().optional(),
  implementingOffice: z.string().optional(),
  appropriation: z.union([z.string(), z.number()]).optional(),
  contractId: z.string().optional(),
  projectType: z.string().optional(),
  powMode: z.enum(['takeoff', 'manual']).optional(),
  status: z.enum(['Planning', 'Approved', 'Ongoing', 'Completed', 'Cancelled']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  haulingCostPerKm: z.number().min(0).optional(),
  distanceFromOffice: z.number().min(0).optional(),
  haulingConfig: z.object({
    materialName: z.string().optional(),
    materialSource: z.string().optional(),
    totalDistance: z.number().optional(),
    freeHaulingDistance: z.number().optional(),
    routeSegments: z.array(z.object({
      terrain: z.string().optional(),
      distanceKm: z.number(),
      speedUnloadedKmh: z.number(),
      speedLoadedKmh: z.number(),
    })).optional(),
    equipmentCapacity: z.number().optional(),
    equipmentRentalRate: z.number().optional(),
  }).optional(),
  // DPWH Program of Works fields
  address: z.string().optional(),
  targetStartDate: z.string().optional(),
  targetCompletionDate: z.string().optional(),
  contractDurationCD: z.number().optional(),
  workingDays: z.number().optional(),
  unworkableDays: z.object({
    sundays: z.number().optional(),
    holidays: z.number().optional(),
    rainyDays: z.number().optional(),
  }).optional(),
  fundSource: z.object({
    projectId: z.string().optional(),
    fundingAgreement: z.string().optional(),
    fundingOrganization: z.string().optional(),
  }).optional(),
  physicalTarget: z.object({
    infraType: z.string().optional(),
    projectComponentId: z.string().optional(),
    targetAmount: z.number().optional(),
    unitOfMeasure: z.string().optional(),
  }).optional(),
  projectComponent: z.object({
    componentId: z.string().optional(),
    infraId: z.string().optional(),
    chainage: z.object({
      start: z.string().optional(),
      end: z.string().optional(),
    }).optional(),
    stationLimits: z.object({
      start: z.string().optional(),
      end: z.string().optional(),
    }).optional(),
    coordinates: z.object({
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    }).optional(),
  }).optional(),
  allotedAmount: z.number().optional(),
  estimatedComponentCost: z.number().optional(),
  manualPowMetadata: z.object({
    lastUpdatedBy: z.string().optional(),
    lastUpdatedAt: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
  manualPowConfig: z
    .object({
      laborLocation: z.string().optional(),
      cmpdVersion: z.string().optional(),
      laborVersion: z.string().optional(),
      district: z.string().optional(),
      vatPercentage: z.number().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

// GET /api/projects/:id - Get single project with estimates
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRequiredRole(user, PROJECT_READ_ROLES)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    const project = await Project.findById(id).lean();

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    
    console.log('GET project haulingConfig:', JSON.stringify((project as any).haulingConfig, null, 2));

    // Get associated estimates count
    const estimatesCount = await Estimate.countDocuments({ projectId: id });

    return NextResponse.json({
      success: true,
      data: {
        ...project,
        estimatesCount,
      },
    });
  } catch (error: any) {
    console.error('GET /api/projects/:id error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/:id - Update project
export async function PATCH(
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    const body = await req.json();

    console.log('PATCH /api/projects/:id received body:', JSON.stringify(body, null, 2));
    
    // Validate input
    const validatedData = ProjectUpdateSchema.parse(body);
    
    console.log('Validated data:', JSON.stringify(validatedData, null, 2));

    // Check for duplicate contract ID if being updated
    if (validatedData.contractId) {
      const existing = await Project.findOne({
        contractId: validatedData.contractId,
        _id: { $ne: id },
      });

      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: `Another project with contract ID "${validatedData.contractId}" already exists`,
          },
          { status: 409 }
        );
      }
    }

    const beforeProject = await Project.findById(id).lean();

    if (!beforeProject) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const project = await Project.findByIdAndUpdate(
      id,
      validatedData,
      { new: true, runValidators: true }
    );

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const afterProject = project.toObject();
    await logAuditEvent({
      actor: buildAuditActor(user),
      action: 'update',
      entityType: 'project',
      entityId: id,
      projectId: id,
      summary: `Updated project ${afterProject.projectName || id}`,
      request: req,
      changes: {
        fields: diffAuditFields(beforeProject, afterProject),
      },
    });

    return NextResponse.json({
      success: true,
      data: project,
      message: 'Project updated successfully',
    });
  } catch (error: any) {
    console.error('PATCH /api/projects/:id error:', error);

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
      { success: false, error: error.message || 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/:id - Delete project
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRequiredRole(user, PROJECT_DELETE_ROLES)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Check if project has estimates
    const estimatesCount = await Estimate.countDocuments({ projectId: id });

    if (estimatesCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete project with ${estimatesCount} associated estimate(s). Delete estimates first.`,
        },
        { status: 400 }
      );
    }

    const project = await Project.findById(id).lean();

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    await Project.findByIdAndDelete(id);

    await logAuditEvent({
      actor: buildAuditActor(user),
      action: 'delete',
      entityType: 'project',
      entityId: id,
      projectId: id,
      summary: `Deleted project ${(project as any).projectName || id}`,
      request: req,
      changes: {
        before: project,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error: any) {
    console.error('DELETE /api/projects/:id error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete project' },
      { status: 500 }
    );
  }
}
