/**
 * GET /api/dupa-templates
 * List all DUPA templates with filtering and search
 * 
 * POST /api/dupa-templates
 * Create new DUPA template
 */

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import DUPATemplate from '@/models/DUPATemplate';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { buildAuditActor, logAuditEvent } from '@/lib/audit/logger';

// Zod schemas for validation
const LaborTemplateSchema = z.object({
  designation: z.string().min(1, 'Designation is required'),
  noOfPersons: z.number().min(0, 'Number of persons must be non-negative'),
  noOfHours: z.number().min(0, 'Number of hours must be non-negative'),
});

const EquipmentTemplateSchema = z.object({
  equipmentId: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  noOfUnits: z.number().min(0, 'Number of units must be non-negative'),
  noOfHours: z.number().min(0, 'Number of hours must be non-negative'),
});

const MaterialTemplateSchema = z.object({
  materialCode: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  unit: z.string().min(1, 'Unit is required'),
  quantity: z.number().min(0, 'Quantity must be non-negative'),
});

const DUPATemplateSchema = z.object({
  payItemId: z.string().optional(),
  payItemNumber: z.string().min(1, 'Pay item number is required'),
  payItemDescription: z.string().min(1, 'Description is required'),
  unitOfMeasurement: z.string().min(1, 'Unit of measurement is required'),
  outputPerHour: z.number().min(0).default(1.0),
  laborTemplate: z.array(LaborTemplateSchema).default([]),
  equipmentTemplate: z.array(EquipmentTemplateSchema).default([]),
  materialTemplate: z.array(MaterialTemplateSchema).default([]),
  ocmPercentage: z.number().min(0).max(100).default(15),
  cpPercentage: z.number().min(0).max(100).default(10),
  vatPercentage: z.number().min(0).max(100).default(12),
  includeMinorTools: z.boolean().default(false),
  minorToolsPercentage: z.number().min(0).max(100).default(10),
  category: z.string().optional(),
  specification: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);

    const view = searchParams.get('view') === 'all' ? 'all' : 'common';
    const maxLimit = view === 'all' ? 5000 : 200;
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), maxLimit);
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    const search = searchParams.get('search');
    if (search) {
      filter.$or = [
        { payItemNumber: { $regex: search, $options: 'i' } },
        { payItemDescription: { $regex: search, $options: 'i' } },
      ];
    }

    const part = searchParams.get('part');
    if (part) {
      filter.part = part;
    }

    const category = searchParams.get('category');
    if (category) {
      filter.category = category;
    }

    const isPinnedCommon = searchParams.get('isPinnedCommon');
    if (isPinnedCommon !== null) {
      filter.isPinnedCommon = isPinnedCommon === 'true';
    }
    
    const isActive = searchParams.get('isActive');
    const status = searchParams.get('status');
    let hasExplicitStatusFilter = false;

    if (isActive !== null) {
      filter.isActive = isActive === 'true';
      hasExplicitStatusFilter = true;
    } else if (status) {
      if (status.toLowerCase() === 'active') {
        filter.isActive = true;
        hasExplicitStatusFilter = true;
      }
      if (status.toLowerCase() === 'inactive') {
        filter.isActive = false;
        hasExplicitStatusFilter = true;
      }
    }

    const sortBy = searchParams.get('sortBy');
    const order = searchParams.get('order') === 'desc' ? -1 : 1;
    let sort: Record<string, 1 | -1>;
    if (sortBy) {
      sort = { [sortBy]: order as 1 | -1 };
    } else if (view === 'all' && !search) {
      sort = { part: 1, payItemNumber: 1 };
    } else {
      sort = { payItemNumber: 1 };
    }

    if (view === 'common') {
      filter.isPinnedCommon = true;
    }

    const hasSearch = Boolean(search?.trim());
    const projection = {
      payItemNumber: 1,
      payItemDescription: 1,
      unitOfMeasurement: 1,
      outputPerHour: 1,
      part: 1,
      category: 1,
      laborTemplate: 1,
      equipmentTemplate: 1,
      materialTemplate: 1,
      ocmPercentage: 1,
      cpPercentage: 1,
      vatPercentage: 1,
      isActive: 1,
      isPinnedCommon: 1,
      updatedAt: 1,
    };

    const listFilter = { ...filter };

    if (hasSearch && !hasExplicitStatusFilter) {
      listFilter.isActive = true;
    }

    const templates = await DUPATemplate.find(listFilter)
      .select(projection)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
    const total = await DUPATemplate.countDocuments(listFilter);

    return NextResponse.json({
      success: true,
      data: templates,
      count: templates.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: skip + templates.length < total,
      },
      meta: {
        view,
        modeUsed: view,
      },
    });
  } catch (error: any) {
    console.error('Error fetching DUPA templates:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch DUPA templates',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    await dbConnect();

    const body = await request.json();
    
    // Handle both single and bulk create
    const isArray = Array.isArray(body);
    const templates = isArray ? body : [body];
    
    // Validate each template
    const validatedTemplates = [];
    for (const template of templates) {
      try {
        const validated = DUPATemplateSchema.parse(template);
        validatedTemplates.push(validated);
      } catch (validationError: any) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation error',
            details: validationError.errors,
          },
          { status: 400 }
        );
      }
    }
    
    // Check for duplicate pay item numbers
    const payItemNumbers = validatedTemplates.map(t => t.payItemNumber);
    const existing = await DUPATemplate.find({
      payItemNumber: { $in: payItemNumbers }
    }).lean();
    
    if (existing.length > 0) {
      const duplicates = existing.map(t => t.payItemNumber).join(', ');
      return NextResponse.json(
        {
          success: false,
          error: `Pay item number(s) already exist: ${duplicates}`,
        },
        { status: 409 }
      );
    }
    
    // Create templates
    const created = await DUPATemplate.insertMany(validatedTemplates);

    await logAuditEvent({
      actor: buildAuditActor(user),
      action: isArray ? 'create_bulk' : 'create',
      entityType: 'dupa_template',
      entityId: isArray ? '' : String(created[0]?._id || ''),
      summary: isArray
        ? `Created ${created.length} DUPA templates`
        : `Created DUPA template ${created[0]?.payItemNumber || ''}`,
      request,
      changes: {
        after: isArray
          ? created.map(item => ({ _id: item._id, payItemNumber: item.payItemNumber }))
          : created[0]?.toObject?.() || created[0],
      },
      metadata: {
        count: created.length,
      },
    });
    
    return NextResponse.json(
      {
        success: true,
        data: isArray ? created : created[0],
        count: created.length,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating DUPA template:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create DUPA template',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
