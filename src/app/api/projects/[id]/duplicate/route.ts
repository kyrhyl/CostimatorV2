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
  copyGrid: z.boolean().default(true),
  copyLevels: z.boolean().default(true),
  copyElementTemplates: z.boolean().default(true),
  copyElementInstances: z.boolean().default(true),
  copySettings: z.boolean().default(true),
  copySpaces: z.boolean().default(true),
  copyWallSurfaces: z.boolean().default(true),
  copyRoofPlanes: z.boolean().default(true),
});

/**
 * POST /api/projects/:id/duplicate
 * Duplicates a project with its structural data (grid, levels, elements)
 * Does NOT copy calculation runs, BOQ items, or estimates
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

    // Validate that source project has structural data if user wants to copy it
    if (options.copyElementTemplates && (!sourceProject.elementTemplates || sourceProject.elementTemplates.length === 0)) {
      console.warn('Source project has no element templates to copy');
    }

    if (options.copyElementInstances && (!sourceProject.elementInstances || sourceProject.elementInstances.length === 0)) {
      console.warn('Source project has no element instances to copy');
    }

    // Create new project object
    const newProjectData: any = {
      // Core metadata - copy with new name
      projectName: options.projectName,
      projectLocation: options.projectLocation || sourceProject.projectLocation,
      district: sourceProject.district,
      implementingOffice: sourceProject.implementingOffice,
      appropriation: sourceProject.appropriation,
      projectType: sourceProject.projectType,
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

    // Conditionally copy structural data
    if (options.copyGrid && sourceProject.grid) {
      newProjectData.grid = {
        xLines: sourceProject.grid.xLines ? [...sourceProject.grid.xLines] : [],
        yLines: sourceProject.grid.yLines ? [...sourceProject.grid.yLines] : [],
      };
    }

    if (options.copyLevels && sourceProject.levels) {
      newProjectData.levels = sourceProject.levels.map((level: any) => ({
        label: level.label,
        elevation: level.elevation,
      }));
    }

    if (options.copyElementTemplates && sourceProject.elementTemplates) {
      // Deep copy element templates with new IDs
      newProjectData.elementTemplates = sourceProject.elementTemplates.map((template: any) => ({
        id: new mongoose.Types.ObjectId().toString(), // New ID for template
        type: template.type,
        name: template.name,
        properties: new Map(template.properties),
        dpwhItemNumber: template.dpwhItemNumber,
        rebarConfig: template.rebarConfig ? JSON.parse(JSON.stringify(template.rebarConfig)) : undefined,
      }));

      // If copying instances, we need to remap template IDs
      if (options.copyElementInstances && sourceProject.elementInstances) {
        // Create mapping from old template IDs to new ones
        const templateIdMap = new Map<string, string>();
        sourceProject.elementTemplates.forEach((oldTemplate: any, index: number) => {
          templateIdMap.set(oldTemplate.id, newProjectData.elementTemplates[index].id);
        });

        // Copy instances with remapped template IDs
        newProjectData.elementInstances = sourceProject.elementInstances.map((instance: any) => ({
          id: new mongoose.Types.ObjectId().toString(), // New ID for instance
          templateId: templateIdMap.get(instance.templateId) || instance.templateId,
          placement: {
            gridRef: instance.placement.gridRef ? [...instance.placement.gridRef] : undefined,
            levelId: instance.placement.levelId,
            endLevelId: instance.placement.endLevelId,
            customGeometry: instance.placement.customGeometry 
              ? new Map(instance.placement.customGeometry)
              : undefined,
          },
          tags: instance.tags ? [...instance.tags] : undefined,
        }));
      }
    }

    if (options.copySettings && sourceProject.settings) {
      newProjectData.settings = JSON.parse(JSON.stringify(sourceProject.settings));
    }

    // Create the new project
    const newProject = await Project.create(newProjectData);

    console.log(`Project duplicated successfully: ${sourceProject.projectName} → ${newProject.projectName}`);
    console.log(`New project ID: ${newProject._id}`);
    console.log(`Copied ${newProjectData.elementTemplates?.length || 0} element templates`);
    console.log(`Copied ${newProjectData.elementInstances?.length || 0} element instances`);
    console.log(`Copied ${newProjectData.levels?.length || 0} levels`);
    console.log(`Copied grid: ${newProjectData.grid?.xLines?.length || 0} x-lines, ${newProjectData.grid?.yLines?.length || 0} y-lines`);

    return NextResponse.json(
      {
        success: true,
        data: newProject,
        message: `Project duplicated successfully from "${sourceProject.projectName}"`,
        sourceProjectId: id,
        duplicatedItems: {
          elementTemplates: newProjectData.elementTemplates?.length || 0,
          elementInstances: newProjectData.elementInstances?.length || 0,
          levels: newProjectData.levels?.length || 0,
          gridLines: (newProjectData.grid?.xLines?.length || 0) + (newProjectData.grid?.yLines?.length || 0),
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
          details: error.errors,
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
