import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import { z } from 'zod';

// Validation schema for element templates
const ElementTemplateSchema = z.object({
  id: z.string(),
  type: z.enum(['beam', 'slab', 'column', 'foundation']),
  name: z.string().min(1, 'Template name is required'),
  properties: z.record(z.number()),
  dpwhItemNumber: z.string().optional(),
  rebarConfig: z.object({
    mainBars: z.object({
      count: z.number().optional(),
      diameter: z.number().optional(),
      spacing: z.number().optional(),
    }).optional(),
    stirrups: z.object({
      diameter: z.number().optional(),
      spacing: z.number().optional(),
    }).optional(),
    secondaryBars: z.object({
      diameter: z.number().optional(),
      spacing: z.number().optional(),
    }).optional(),
    dpwhRebarItem: z.string().optional(),
  }).optional(),
});

const UpdateTemplatesSchema = z.object({
  templates: z.array(ElementTemplateSchema),
});

// GET /api/projects/[id]/templates - Get project element templates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const project = await Project.findById(id).select('elementTemplates');
    
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Convert Maps to plain objects for JSON serialization
    const templates = (project.elementTemplates || []).map((template: any) => ({
      id: template.id,
      type: template.type,
      name: template.name,
      properties: template.properties instanceof Map 
        ? Object.fromEntries(template.properties)
        : template.properties,
      dpwhItemNumber: template.dpwhItemNumber,
      rebarConfig: template.rebarConfig,
    }));

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error: any) {
    console.error('Error fetching element templates:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch element templates' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/templates - Update project element templates
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    // Get request body
    const body = await request.json();
    
    // Validate request body
    const validatedData = UpdateTemplatesSchema.parse(body);

    // Find and update project
    const project = await Project.findById(id);
    
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Update element templates
    // Convert properties from object to Map for Mongoose
    const templatesWithMaps = validatedData.templates.map((template: any) => ({
      ...template,
      properties: new Map(Object.entries(template.properties)),
      placement: template.placement ? {
        ...template.placement,
        customGeometry: template.placement.customGeometry 
          ? new Map(Object.entries(template.placement.customGeometry))
          : undefined,
      } : undefined,
    }));

    project.elementTemplates = templatesWithMaps;
    await project.save();

    console.log(`Updated ${validatedData.templates.length} element templates for project ${id}`);

    // Convert Maps to plain objects for JSON response
    const responseTemplates = (project.elementTemplates || []).map((template: any) => ({
      id: template.id,
      type: template.type,
      name: template.name,
      properties: template.properties instanceof Map 
        ? Object.fromEntries(template.properties)
        : template.properties,
      dpwhItemNumber: template.dpwhItemNumber,
      rebarConfig: template.rebarConfig,
    }));

    return NextResponse.json({
      success: true,
      templates: responseTemplates,
      message: 'Templates updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating element templates:', error);

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
      { success: false, error: error.message || 'Failed to update element templates' },
      { status: 500 }
    );
  }
}
