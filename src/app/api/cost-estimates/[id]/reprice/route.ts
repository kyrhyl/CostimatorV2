import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/connect';
import CostEstimate from '@/models/CostEstimate';
import Project from '@/models/Project';
import { calculateEstimate } from '@/lib/services/estimateCalculator';
import { getSessionUser, hasRequiredRole } from '@/lib/auth/session';
import { PROJECT_WRITE_ROLES } from '@/lib/auth/roles';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
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
      return NextResponse.json({ success: false, error: 'Invalid cost estimate ID' }, { status: 400 });
    }

    const baseEstimate = await CostEstimate.findById(id);
    if (!baseEstimate) {
      return NextResponse.json({ success: false, error: 'Cost estimate not found' }, { status: 404 });
    }

    const project = await Project.findById(baseEstimate.projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const boqLines = (baseEstimate.estimateLines || []).map((line) => ({
      payItemNumber: line.payItemNumber,
      description: line.payItemDescription,
      unit: line.unit,
      quantity: line.quantity,
      part: line.part,
    }));

    if (!boqLines.length) {
      return NextResponse.json({ success: false, error: 'No BOQ lines found for repricing' }, { status: 400 });
    }

    const calculationResult = await calculateEstimate(boqLines, {
      takeoffVersionId: baseEstimate.takeoffVersionId || baseEstimate._id,
      location: baseEstimate.location,
      district: baseEstimate.district || project.district,
      cmpdVersion: baseEstimate.cmpdVersion || project.cmpdVersion,
      ocmPercentage: baseEstimate.ocmPercentage,
      cpPercentage: baseEstimate.cpPercentage,
      vatPercentage: baseEstimate.vatPercentage,
      haulingConfig: project.haulingConfig,
      distanceFromOffice: project.distanceFromOffice,
      haulingCostPerKm: project.haulingCostPerKm,
    });

    const inferredSource =
      baseEstimate.boqSource ||
      (baseEstimate.takeoffVersionId ? 'takeoffVersion' : 'projectBOQ');
    const inferredSourceRef =
      baseEstimate.boqSourceRef ||
      (baseEstimate.takeoffVersionId ? baseEstimate.takeoffVersionId : null);

    const estimateNumber = await CostEstimate.generateEstimateNumber();
    const repricedEstimate = new CostEstimate({
      projectId: baseEstimate.projectId,
      takeoffVersionId: baseEstimate.takeoffVersionId,
      estimateNumber,
      estimateName: `${baseEstimate.estimateName} (Repriced)`,
      estimateType: 'revised',
      description: `Repriced from estimate ${baseEstimate.estimateNumber} using current hauling configuration.`,
      boqSource: inferredSource,
      boqVersion: baseEstimate.boqVersion,
      boqSourceRef: inferredSourceRef,
      location: baseEstimate.location,
      district: baseEstimate.district,
      cmpdVersion: baseEstimate.cmpdVersion,
      effectiveDate: new Date(),
      ocmPercentage: calculationResult.usedMarkups.ocmPercentage,
      cpPercentage: calculationResult.usedMarkups.cpPercentage,
      vatPercentage: calculationResult.usedMarkups.vatPercentage,
      haulingCostPerKm: project.haulingCostPerKm,
      distanceFromOffice: project.distanceFromOffice,
      haulingConfig: project.haulingConfig,
      status: 'draft',
      createdBy: 'system-reprice',
      estimateLines: calculationResult.estimateLines,
      laborRateSnapshot: calculationResult.laborRateSnapshot,
      costSummary: calculationResult.costSummary,
      baseEstimateId: baseEstimate._id,
      priceDelta: {
        baseEstimateId: baseEstimate._id,
        baseGrandTotal: baseEstimate.costSummary?.grandTotal || 0,
        currentGrandTotal: calculationResult.costSummary.grandTotal,
        delta: calculationResult.costSummary.grandTotal - (baseEstimate.costSummary?.grandTotal || 0),
        deltaPercentage:
          (baseEstimate.costSummary?.grandTotal || 0) > 0
            ? ((calculationResult.costSummary.grandTotal - (baseEstimate.costSummary?.grandTotal || 0)) /
                (baseEstimate.costSummary?.grandTotal || 1)) *
              100
            : 0,
      },
    });

    await repricedEstimate.save();

    project.activeCostEstimateId = repricedEstimate._id as mongoose.Types.ObjectId;
    await project.save();

    return NextResponse.json({
      success: true,
      data: repricedEstimate,
      baseEstimateId: baseEstimate._id,
      missingMaterialPrices: calculationResult.missingMaterialPrices,
      warning:
        calculationResult.missingMaterialPrices.length > 0
          ? 'Repriced estimate contains materials without CMPD/canvass prices.'
          : undefined,
      message: 'Created a repriced estimate version using current hauling configuration.',
    });
  } catch (error: any) {
    console.error('POST /api/cost-estimates/[id]/reprice error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reprice estimate' },
      { status: 500 },
    );
  }
}
