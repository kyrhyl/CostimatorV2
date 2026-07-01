import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/connect';
import CostEstimate from '@/models/CostEstimate';
import Project from '@/models/Project';
import PowAdjustment from '@/models/PowAdjustment';
import { getSessionUser, hasRequiredRole } from '@/lib/auth/session';
import { PROJECT_WRITE_ROLES } from '@/lib/auth/roles';

const getLineKey = (line: any, index: number) => `${line?._id || line?.payItemNumber || 'line'}-${index}`;

const applyAdjustmentsToLines = (sourceEstimate: any, adjustments: any[]) => {
  const sourceLines = (sourceEstimate?.estimateLines || []).map((line: any) => ({ ...line }));
  if (!adjustments.length) {
    return {
      estimateLines: sourceLines,
      costSummary: sourceEstimate?.costSummary,
      copiedAdjustments: 0,
    };
  }

  const adjustmentMap = new Map<string, any>();
  adjustments.forEach((row: any) => {
    const key = String(row?.lineKey || '').trim();
    if (key) adjustmentMap.set(key, row);
  });

  const adjustedLines = sourceLines.map((line: any, index: number) => {
    const lineKey = getLineKey(line, index);
    const adjustment = adjustmentMap.get(lineKey);
    if (!adjustment) {
      return line;
    }

    const originalQty = Number(line.quantity || 0);
    const quantity = adjustment.quantity ?? originalQty;
    const unitPrice = adjustment.unitCost ?? Number(line.unitPrice || 0);
    const lineMultiplier = originalQty > 0 ? quantity / originalQty : 0;

    return {
      ...line,
      quantity,
      unitPrice,
      totalAmount: quantity * unitPrice,
      laborCost: Number(line.laborCost || 0) * lineMultiplier,
      equipmentCost: Number(line.equipmentCost || 0) * lineMultiplier,
      materialCost: Number(line.materialCost || 0) * lineMultiplier,
      minorToolsCost: Number(line.minorToolsCost || 0) * lineMultiplier,
      consumablesCost: Number(line.consumablesCost || 0) * lineMultiplier,
    };
  });

  const totals = adjustedLines.reduce(
    (acc: any, line: any) => {
      acc.totalDirectCost += Number(line.directCost || 0) * Number(line.quantity || 0);
      acc.grandTotal += Number(line.totalAmount || 0);
      return acc;
    },
    { totalDirectCost: 0, grandTotal: 0 },
  );

  const baseSummary = sourceEstimate?.costSummary || {};
  const baseGrandTotal = Number(baseSummary.grandTotal || 0);
  const scale = baseGrandTotal > 0 ? totals.grandTotal / baseGrandTotal : 1;
  const baseOCM = Number(baseSummary.totalOCM || 0);
  const baseCP = Number(baseSummary.totalCP || 0);
  const baseVAT = Number(baseSummary.totalVAT || 0);

  const costSummary = {
    totalDirectCost: totals.totalDirectCost,
    totalOCM: baseOCM * scale,
    totalCP: baseCP * scale,
    subtotalWithMarkup: totals.totalDirectCost + (baseOCM * scale) + (baseCP * scale),
    totalVAT: baseVAT * scale,
    grandTotal: totals.grandTotal,
    rateItemsCount: adjustedLines.length,
  };

  return {
    estimateLines: adjustedLines,
    costSummary,
    copiedAdjustments: adjustmentMap.size,
  };
};

export async function POST(
  request: NextRequest,
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

    const sourceEstimate = await CostEstimate.findById(id);
    if (!sourceEstimate) {
      return NextResponse.json({ success: false, error: 'Cost estimate not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const copyAdjustments = body?.copyAdjustments !== false;

    let copiedAdjustments = 0;
    let estimateLines = (sourceEstimate.estimateLines || []).map((line: any) => ({ ...line }));
    let costSummary = sourceEstimate.costSummary;

    if (copyAdjustments) {
      const mode = sourceEstimate.boqSource === 'manual' ? 'manual' : 'takeoff';
      const adjustmentQuery: any = {
        projectId: sourceEstimate.projectId,
        mode,
        estimateId: mode === 'takeoff' ? sourceEstimate._id : null,
      };

      const adjustments = await PowAdjustment.find(adjustmentQuery).lean();
      const adjusted = applyAdjustmentsToLines(sourceEstimate, adjustments);
      estimateLines = adjusted.estimateLines;
      costSummary = adjusted.costSummary;
      copiedAdjustments = adjusted.copiedAdjustments;
    }

    const estimateNumber = await CostEstimate.generateEstimateNumber();
    const existingRevisionCount = await CostEstimate.countDocuments({
      projectId: sourceEstimate.projectId,
      baseEstimateId: sourceEstimate._id,
    });
    const nextRevisionNumber = existingRevisionCount + 1;
    const defaultEstimateName = `${sourceEstimate.estimateName} - Rev ${nextRevisionNumber}`;
    const baseGrandTotal = Number(sourceEstimate.costSummary?.grandTotal || 0);
    const currentGrandTotal = Number(costSummary?.grandTotal || 0);
    const delta = currentGrandTotal - baseGrandTotal;
    const deltaPercentage = baseGrandTotal > 0 ? (delta / baseGrandTotal) * 100 : 0;

    const duplicateEstimate = new CostEstimate({
      projectId: sourceEstimate.projectId,
      takeoffVersionId: sourceEstimate.takeoffVersionId,
      estimateNumber,
      estimateName:
        (typeof body?.estimateName === 'string' && body.estimateName.trim())
          || defaultEstimateName,
      estimateType:
        (typeof body?.estimateType === 'string' && body.estimateType.trim())
          || 'revised',
      description:
        (typeof body?.description === 'string' && body.description.trim())
          || `Duplicated from ${sourceEstimate.estimateNumber}${copiedAdjustments ? ' with saved workspace adjustments' : ''}.`,
      boqSource: sourceEstimate.boqSource,
      boqVersion: sourceEstimate.boqVersion,
      boqSourceRef: sourceEstimate.boqSourceRef,
      location: sourceEstimate.location,
      district: sourceEstimate.district,
      cmpdVersion: sourceEstimate.cmpdVersion,
      effectiveDate: new Date(),
      ocmPercentage: sourceEstimate.ocmPercentage,
      cpPercentage: sourceEstimate.cpPercentage,
      vatPercentage: sourceEstimate.vatPercentage,
      haulingCostPerKm: sourceEstimate.haulingCostPerKm,
      distanceFromOffice: sourceEstimate.distanceFromOffice,
      haulingConfig: sourceEstimate.haulingConfig,
      status: 'draft',
      createdBy:
        (typeof body?.createdBy === 'string' && body.createdBy.trim())
          || 'system-duplicate',
      estimateLines,
      laborRateSnapshot: sourceEstimate.laborRateSnapshot,
      costSummary,
      baseEstimateId: sourceEstimate._id,
      priceDelta: {
        baseEstimateId: sourceEstimate._id,
        baseGrandTotal,
        currentGrandTotal,
        delta,
        deltaPercentage,
      },
    });

    await duplicateEstimate.save();
    await Project.findByIdAndUpdate(sourceEstimate.projectId, {
      activeCostEstimateId: duplicateEstimate._id,
    });

    return NextResponse.json({
      success: true,
      data: duplicateEstimate,
      sourceEstimateId: sourceEstimate._id,
      copiedAdjustments,
      message: copiedAdjustments
        ? `Created duplicate version with ${copiedAdjustments} copied adjustment(s).`
        : 'Created duplicate version.',
    });
  } catch (error: any) {
    console.error('POST /api/cost-estimates/[id]/duplicate error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to duplicate estimate version' },
      { status: 500 },
    );
  }
}
