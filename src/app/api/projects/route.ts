import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import { z } from 'zod';
import { getSessionUser, hasRequiredRole } from '@/lib/auth/session';
import { PROJECT_READ_ROLES, PROJECT_WRITE_ROLES } from '@/lib/auth/roles';
import { buildAuditActor, logAuditEvent } from '@/lib/audit/logger';

const ProjectSchema = z.object({
  projectName: z.string().min(1, 'Project name is required'),
  projectLocation: z.string().min(1, 'Project location is required'),
  district: z.string().default('Bukidnon 1st'),
  cmpdVersion: z.string().optional(),
  laborVersion: z.string().optional(),
  equipmentVersion: z.string().optional(),
  implementingOffice: z.string().default('DPWH Bukidnon 1st District Engineering Office'),
  appropriation: z.coerce.number().min(0).default(0),
  contractId: z.string().optional(),
  projectType: z.string().optional(),
  powMode: z.enum(['takeoff', 'manual']).optional().default('takeoff'),
  status: z
    .enum(['Planning', 'Approved', 'Ongoing', 'Completed', 'Cancelled'])
    .default('Planning'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  haulingCostPerKm: z.coerce.number().min(0).default(0),
  distanceFromOffice: z.coerce.number().min(0).default(0),
  address: z.string().optional(),
  targetStartDate: z.string().optional(),
  targetCompletionDate: z.string().optional(),
  contractDurationCD: z.coerce.number().optional(),
  workingDays: z.coerce.number().optional(),
  unworkableDays: z
    .object({
      sundays: z.coerce.number().optional(),
      holidays: z.coerce.number().optional(),
      rainyDays: z.coerce.number().optional(),
    })
    .optional(),
  fundSource: z
    .object({
      projectId: z.string().optional(),
      fundingAgreement: z.string().optional(),
      fundingOrganization: z.string().optional(),
    })
    .optional(),
  physicalTarget: z
    .object({
      infraType: z.string().optional(),
      projectComponentId: z.string().optional(),
      targetAmount: z.coerce.number().optional(),
      unitOfMeasure: z.string().optional(),
    })
    .optional(),
  projectComponent: z
    .object({
      componentId: z.string().optional(),
      infraId: z.string().optional(),
      coordinates: z
        .object({
          latitude: z.coerce.number().optional(),
          longitude: z.coerce.number().optional(),
        })
        .optional(),
    })
    .optional(),
  allotedAmount: z.coerce.number().optional(),
  estimatedComponentCost: z.coerce.number().optional(),
  manualPowConfig: z
    .object({
      laborLocation: z.string().optional(),
      cmpdVersion: z.string().optional(),
      laborVersion: z.string().optional(),
      equipmentVersion: z.string().optional(),
      district: z.string().optional(),
      vatPercentage: z.number().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

// GET /api/projects - List projects with filtering
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRequiredRole(user, PROJECT_READ_ROLES)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const location = searchParams.get('location') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build filter
    const filter: any = {};

    if (search) {
      filter.$or = [
        { projectName: { $regex: search, $options: 'i' } },
        { contractId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (location) {
      filter.projectLocation = { $regex: location, $options: 'i' };
    }

    // Get total count
    const total = await Project.countDocuments(filter);

    // Get projects with pagination
    const projects = await Project.find(filter)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('GET /api/projects error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch projects',
      },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create new project
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRequiredRole(user, PROJECT_WRITE_ROLES)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const body = await req.json();

    // Validate input
    const validatedData = ProjectSchema.parse(body);

    // Check for duplicate contract ID if provided
    if (validatedData.contractId) {
      const existing = await Project.findOne({
        contractId: validatedData.contractId,
      });

      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: `Project with contract ID "${validatedData.contractId}" already exists`,
          },
          { status: 409 }
        );
      }
    }

    // Create project
    const project = await Project.create(validatedData);

    await logAuditEvent({
      actor: buildAuditActor(user),
      action: 'create',
      entityType: 'project',
      entityId: String(project._id),
      projectId: String(project._id),
      summary: `Created project ${project.projectName}`,
      request: req,
      changes: {
        after: project.toObject(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: project,
        message: 'Project created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST /api/projects error:', error);

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
      {
        success: false,
        error: error.message || 'Failed to create project',
      },
      { status: 500 }
    );
  }
}
