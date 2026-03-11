import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import ProjectBOQ from '@/models/ProjectBOQ';
import ProjectEstimate, { IProjectEstimate } from '@/models/ProjectEstimate';
import { z } from 'zod';

const GenerateEstimateSchema = z.object({
  estimateType: z.enum(['preliminary', 'detailed', 'revised', 'final']).default('detailed'),
  notes: z.string().optional(),
  revisionReason: z.string().optional(),
  preparedBy: z.string().optional(),
  ocmPercentage: z.number().min(0).max(100).default(10),
  cpPercentage: z.number().min(0).max(100).default(10),
  vatPercentage: z.number().min(0).max(100).default(12),
});

// GET /api/projects/:id/estimates - List all estimates for a project
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    // Verify project exists
    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get all estimates for this project
    const estimates = await ProjectEstimate.find({ projectId: id })
      .sort({ version: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: estimates,
    });
  } catch (error: any) {
    console.error('GET /api/projects/:id/estimates error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch estimates',
      },
      { status: 500 }
    );
  }
}

// POST /api/projects/:id/estimates - Generate new estimate from project BOQ
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    // Validate input
    const validatedData = GenerateEstimateSchema.parse(body);

    // Verify project exists
    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get all BOQ items for this project
    const boqItems = await ProjectBOQ.find({ projectId: id }).lean();

    if (boqItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No BOQ items found for this project. Add BOQ items before generating an estimate.',
        },
        { status: 400 }
      );
    }

    // Calculate totals
    let totalDirectCost = 0;
    const boqSnapshot = boqItems.map((item) => {
      const directCost = item.directCost || 0;
      totalDirectCost += directCost * item.quantity;

      return {
        projectBOQId: item._id,
        payItemNumber: item.payItemNumber,
        description: item.payItemDescription,
        quantity: item.quantity,
        unitCost: item.unitCost || 0,
        totalAmount: item.totalAmount || 0,
        category: item.category,
      };
    });

    // Calculate markup costs
    const totalOCM = totalDirectCost * (validatedData.ocmPercentage / 100);
    const subtotalAfterOCM = totalDirectCost + totalOCM;
    const totalCP = subtotalAfterOCM * (validatedData.cpPercentage / 100);
    const subtotalAfterCP = subtotalAfterOCM + totalCP;
    const totalVAT = subtotalAfterCP * (validatedData.vatPercentage / 100);
    const grandTotal = subtotalAfterCP + totalVAT;

    // Get next version number
    const lastEstimate = await ProjectEstimate.findOne({ projectId: id })
      .sort({ version: -1 })
      .lean() as IProjectEstimate | null;
    const nextVersion = lastEstimate ? lastEstimate.version + 1 : 1;

    // Create estimate
    const estimate = await ProjectEstimate.create({
      projectId: id,
      version: nextVersion,
      estimateType: validatedData.estimateType,
      status: 'draft',
      preparedBy: validatedData.preparedBy,
      preparedDate: new Date(),
      totalDirectCost,
      totalOCM,
      totalCP,
      totalVAT,
      grandTotal,
      ocmPercentage: validatedData.ocmPercentage,
      cpPercentage: validatedData.cpPercentage,
      vatPercentage: validatedData.vatPercentage,
      notes: validatedData.notes,
      revisionReason: validatedData.revisionReason,
      boqSnapshot,
      totalItems: boqItems.length,
    });

    return NextResponse.json({
      success: true,
      data: estimate,
      message: `Estimate version ${nextVersion} generated successfully`,
    });
  } catch (error: any) {
    console.error('POST /api/projects/:id/estimates error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate estimate',
      },
      { status: 500 }
    );
  }
}
