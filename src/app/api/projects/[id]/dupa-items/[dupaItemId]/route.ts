import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/connect';
import ProjectBOQ from '@/models/ProjectBOQ';
import CostEstimate from '@/models/CostEstimate';
import DupaAdjustment from '@/models/DupaAdjustment';
import PowAdjustment from '@/models/PowAdjustment';
import { ensureEstimateLineId, normalizePowMode } from '@/lib/utils/dupa-identity';

function asNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeLaborItems(items: any[]) {
  return (Array.isArray(items) ? items : []).map((row) => ({
    designation: String(row?.designation || '').trim() || 'Labor',
    noOfPersons: asNumber(row?.noOfPersons, 0),
    noOfHours: asNumber(row?.noOfHours, 0),
    hourlyRate: asNumber(row?.hourlyRate, 0),
    amount: asNumber(row?.amount, asNumber(row?.noOfPersons, 0) * asNumber(row?.noOfHours, 0) * asNumber(row?.hourlyRate, 0)),
  }));
}

function normalizeEquipmentItems(items: any[]) {
  return (Array.isArray(items) ? items : []).map((row) => ({
    equipmentId: row?.equipmentId || undefined,
    description: String(row?.description || '').trim() || 'Equipment',
    noOfUnits: asNumber(row?.noOfUnits, 0),
    noOfHours: asNumber(row?.noOfHours, 0),
    hourlyRate: asNumber(row?.hourlyRate, 0),
    amount: asNumber(row?.amount, asNumber(row?.noOfUnits, 0) * asNumber(row?.noOfHours, 0) * asNumber(row?.hourlyRate, 0)),
  }));
}

function normalizeMaterialItems(items: any[]) {
  return (Array.isArray(items) ? items : []).map((row) => {
    const basePrice = asNumber(row?.basePrice, asNumber(row?.unitCost, 0));
    const haulingCost = asNumber(row?.haulingCost, 0);
    const unitCost = asNumber(row?.unitCost, basePrice + haulingCost);
    const quantity = asNumber(row?.quantity, 0);
    return {
      materialCode: String(row?.materialCode || '').trim() || 'UNKNOWN',
      description: String(row?.description || '').trim() || 'Material',
      unit: String(row?.unit || '').trim() || 'unit',
      quantity,
      basePrice,
      haulingCost,
      unitCost,
      amount: asNumber(row?.amount, quantity * unitCost),
      priceSource: row?.priceSource === 'canvass' || row?.priceSource === 'missing' ? row.priceSource : 'cmpd',
      requiresCanvass: Boolean(row?.requiresCanvass),
    };
  });
}

function computeEstimateSummary(estimateLines: any[]) {
  const totals = estimateLines.reduce(
    (acc, line) => {
      const quantity = asNumber(line.quantity, 0);
      acc.totalDirectCost += asNumber(line.directCost, 0) * quantity;
      acc.totalOCM += asNumber(line.ocmCost, 0) * quantity;
      acc.totalCP += asNumber(line.cpCost, 0) * quantity;
      acc.totalVAT += asNumber(line.vatCost, 0) * quantity;
      acc.grandTotal += asNumber(line.totalAmount, asNumber(line.unitPrice, 0) * quantity);
      return acc;
    },
    { totalDirectCost: 0, totalOCM: 0, totalCP: 0, totalVAT: 0, grandTotal: 0 },
  );

  return {
    ...totals,
    subtotalWithMarkup: totals.totalDirectCost + totals.totalOCM + totals.totalCP,
    rateItemsCount: estimateLines.length,
  };
}

function findEstimateLineIndex(estimateLines: any[], sourceId: string, payItemNumber: string): number {
  const byLineId = estimateLines.findIndex((line, index) => ensureEstimateLineId(line, index) === sourceId);
  if (byLineId >= 0) return byLineId;
  return estimateLines.findIndex((line) => String(line.payItemNumber || '') === String(payItemNumber || ''));
}

function computeAuthoritativeTotals(input: {
  laborItems: any[];
  equipmentItems: any[];
  materialItems: any[];
  outputPerHour: number;
  ocmPercent: number;
  cpPercent: number;
  vatPercent: number;
}) {
  const laborSubmitted = (input.laborItems || []).reduce((sum, row) => sum + asNumber(row.amount, 0), 0);
  const equipmentSubmitted = (input.equipmentItems || []).reduce((sum, row) => sum + asNumber(row.amount, 0), 0);
  const directCostSubmitted = laborSubmitted + equipmentSubmitted;
  const outputSubmitted = input.outputPerHour > 0 ? input.outputPerHour : 1;
  const directUnitCostSubmitted = directCostSubmitted / outputSubmitted;
  const materialsSubmitted = (input.materialItems || []).reduce((sum, row) => sum + asNumber(row.amount, 0), 0);
  const directUnitPlusMaterialsSubmitted = directUnitCostSubmitted + materialsSubmitted;
  const ocmValue = directUnitPlusMaterialsSubmitted * (input.ocmPercent / 100);
  const cpValue = directUnitPlusMaterialsSubmitted * (input.cpPercent / 100);
  const vatValue = (directUnitPlusMaterialsSubmitted + ocmValue + cpValue) * (input.vatPercent / 100);
  const totalUnitCostSubmitted = directUnitPlusMaterialsSubmitted + ocmValue + cpValue + vatValue;

  return {
    laborSubmitted,
    equipmentSubmitted,
    directCostSubmitted,
    outputSubmitted,
    directUnitCostSubmitted,
    materialsSubmitted,
    directUnitPlusMaterialsSubmitted,
    ocmPercent: input.ocmPercent,
    ocmValue,
    cpPercent: input.cpPercent,
    cpValue,
    vatPercent: input.vatPercent,
    vatValue,
    totalUnitCostSubmitted,
  };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; dupaItemId: string }> },
) {
  try {
    await dbConnect();
    const { id, dupaItemId } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid project ID' }, { status: 400 });
    }

    const body = await request.json();
    const mode = normalizePowMode(body?.mode);
    const estimateId = String(body?.estimateId || '').trim();
    const estimateRef = mode === 'manual' ? 'manual' : estimateId;
    const sourceType = body?.sourceType === 'estimateLine' ? 'estimateLine' : 'projectBoq';
    const sourceId = String(body?.sourceId || '').trim();
    const itemKey = String(body?.itemKey || '').trim();

    if (!sourceId) {
      return NextResponse.json({ success: false, error: 'sourceId is required' }, { status: 400 });
    }
    if (mode === 'takeoff' && !mongoose.Types.ObjectId.isValid(estimateId)) {
      return NextResponse.json({ success: false, error: 'estimateId is required for takeoff mode' }, { status: 400 });
    }

    const item = body?.item || body;
    const payload = {
      payItemNumber: String(item?.payItemNumber || ''),
      payItemDescription: String(item?.payItemDescription || ''),
      part: String(item?.part || ''),
      unitOfMeasurement: String(item?.unitOfMeasurement || ''),
      outputPerHour: asNumber(item?.outputPerHour, 1),
      quantity: asNumber(item?.quantity, 0),
      laborItems: normalizeLaborItems(item?.laborItems),
      equipmentItems: normalizeEquipmentItems(item?.equipmentItems),
      materialItems: normalizeMaterialItems(item?.materialItems),
      totals: item?.totals || {},
      reason: String(body?.reason || 'DUPA adjustment'),
      updatedBy: String(body?.updatedBy || 'workspace-user'),
    };

    let canonicalResult: any = null;
    let baseSnapshot: any = null;
    let resolvedSourceType: 'projectBoq' | 'estimateLine' = sourceType;
    let authoritativeTotals: any = payload.totals || {};

    if (mode === 'manual') {
      const boqItem = await ProjectBOQ.findOne({ _id: sourceId, projectId: id });
      if (!boqItem) {
        return NextResponse.json({ success: false, error: 'Manual BOQ item not found' }, { status: 404 });
      }

      baseSnapshot = {
        outputPerHour: boqItem.outputPerHour,
        laborItems: boqItem.laborItems,
        equipmentItems: boqItem.equipmentItems,
        materialItems: boqItem.materialItems,
        directCost: boqItem.directCost,
        ocmPercentage: boqItem.ocmPercentage,
        ocmCost: boqItem.ocmCost,
        cpPercentage: boqItem.cpPercentage,
        cpCost: boqItem.cpCost,
        subtotalWithMarkup: boqItem.subtotalWithMarkup,
        vatPercentage: boqItem.vatPercentage,
        vatCost: boqItem.vatCost,
        totalCost: boqItem.totalCost,
        unitCost: boqItem.unitCost,
        totalAmount: boqItem.totalAmount,
      };

      const quantity = asNumber(payload.quantity, asNumber(boqItem.quantity, 0));
      authoritativeTotals = computeAuthoritativeTotals({
        laborItems: payload.laborItems,
        equipmentItems: payload.equipmentItems,
        materialItems: payload.materialItems,
        outputPerHour: payload.outputPerHour,
        ocmPercent: asNumber(payload.totals?.ocmPercent, asNumber(boqItem.ocmPercentage, 0)),
        cpPercent: asNumber(payload.totals?.cpPercent, asNumber(boqItem.cpPercentage, 0)),
        vatPercent: asNumber(payload.totals?.vatPercent, asNumber(boqItem.vatPercentage, 0)),
      });
      const directCost = authoritativeTotals.directUnitPlusMaterialsSubmitted;
      const ocmCost = authoritativeTotals.ocmValue;
      const cpCost = authoritativeTotals.cpValue;
      const vatCost = authoritativeTotals.vatValue;
      const totalCost = authoritativeTotals.totalUnitCostSubmitted;

      boqItem.outputPerHour = payload.outputPerHour;
      boqItem.quantity = quantity;
      boqItem.laborItems = payload.laborItems as any;
      boqItem.equipmentItems = payload.equipmentItems as any;
      boqItem.materialItems = payload.materialItems as any;
      boqItem.directCost = directCost;
      boqItem.ocmPercentage = authoritativeTotals.ocmPercent;
      boqItem.ocmCost = ocmCost;
      boqItem.cpPercentage = authoritativeTotals.cpPercent;
      boqItem.cpCost = cpCost;
      boqItem.subtotalWithMarkup = directCost + ocmCost + cpCost;
      boqItem.vatPercentage = authoritativeTotals.vatPercent;
      boqItem.vatCost = vatCost;
      boqItem.totalCost = totalCost;
      boqItem.unitCost = totalCost;
      boqItem.totalAmount = totalCost * quantity;
      await boqItem.save();

      canonicalResult = boqItem.toObject();
      resolvedSourceType = 'projectBoq';
    } else {
      const estimate = await CostEstimate.findOne({ _id: estimateId, projectId: id });
      if (!estimate) {
        return NextResponse.json({ success: false, error: 'Cost estimate not found' }, { status: 404 });
      }

      const estimateLines = Array.isArray(estimate.estimateLines) ? estimate.estimateLines : [];
      const lineIndex = findEstimateLineIndex(estimateLines as any[], sourceId, payload.payItemNumber);
      if (lineIndex < 0) {
        return NextResponse.json({ success: false, error: 'Estimate line not found' }, { status: 404 });
      }

      const current = estimateLines[lineIndex] as any;
      const lineId = ensureEstimateLineId(current, lineIndex);
      const quantity = asNumber(payload.quantity, asNumber(current.quantity, 0));
      authoritativeTotals = computeAuthoritativeTotals({
        laborItems: payload.laborItems,
        equipmentItems: payload.equipmentItems,
        materialItems: payload.materialItems,
        outputPerHour: payload.outputPerHour,
        ocmPercent: asNumber(payload.totals?.ocmPercent, asNumber(estimate.ocmPercentage, 0)),
        cpPercent: asNumber(payload.totals?.cpPercent, asNumber(estimate.cpPercentage, 0)),
        vatPercent: asNumber(payload.totals?.vatPercent, asNumber(estimate.vatPercentage, 0)),
      });
      const laborCost = authoritativeTotals.laborSubmitted;
      const equipmentCost = authoritativeTotals.equipmentSubmitted;
      const materialCost = authoritativeTotals.materialsSubmitted;
      const directCost = authoritativeTotals.directUnitPlusMaterialsSubmitted;
      const ocmCost = authoritativeTotals.ocmValue;
      const cpCost = authoritativeTotals.cpValue;
      const vatCost = authoritativeTotals.vatValue;
      const unitPrice = authoritativeTotals.totalUnitCostSubmitted;

      baseSnapshot = {
        lineId,
        outputPerHour: 1,
        laborItems: current.laborItems,
        equipmentItems: current.equipmentItems,
        materialItems: current.materialItems,
        laborCost: current.laborCost,
        equipmentCost: current.equipmentCost,
        materialCost: current.materialCost,
        directCost: current.directCost,
        ocmCost: current.ocmCost,
        cpCost: current.cpCost,
        vatCost: current.vatCost,
        unitPrice: current.unitPrice,
        totalAmount: current.totalAmount,
      };

      const updatedLine = {
        ...current,
        lineId,
        payItemNumber: String(payload.payItemNumber || current.payItemNumber || ''),
        payItemDescription: String(payload.payItemDescription || current.payItemDescription || ''),
        unit: String(current.unit || payload.unitOfMeasurement || ''),
        part: String(payload.part || current.part || ''),
        quantity,
        laborItems: payload.laborItems,
        equipmentItems: payload.equipmentItems,
        materialItems: payload.materialItems,
        laborCost,
        equipmentCost,
        materialCost,
        directCost,
        ocmCost,
        cpCost,
        vatCost,
        unitPrice,
        totalAmount: unitPrice * quantity,
      };

      estimate.set(`estimateLines.${lineIndex}`, updatedLine);
      estimateLines[lineIndex] = updatedLine as any;
      estimate.costSummary = computeEstimateSummary(estimateLines as any) as any;
      await estimate.save({ validateModifiedOnly: true });

      canonicalResult = (estimateLines[lineIndex] as any);
      resolvedSourceType = 'estimateLine';
    }

    const adjustmentFilter: any = itemKey
      ? { projectId: id, estimateRef, itemKey }
      : { projectId: id, estimateRef, dupaItemId };
    const existingAdjustment = await DupaAdjustment.findOne(adjustmentFilter).lean();

    const adjustmentPayload: any = {
      projectId: id,
      estimateRef,
      itemKey: itemKey || String(existingAdjustment?.itemKey || dupaItemId),
      dupaItemId,
      sourceType: resolvedSourceType,
      sourceId,
      migrationVersion: 1,
      payItemNumber: payload.payItemNumber,
      payItemDescription: payload.payItemDescription,
      part: payload.part,
      unitOfMeasurement: payload.unitOfMeasurement,
      outputPerHour: payload.outputPerHour,
      quantity: payload.quantity,
      laborItems: payload.laborItems,
      equipmentItems: payload.equipmentItems,
      materialItems: payload.materialItems,
      totals: authoritativeTotals,
      reason: payload.reason,
      updatedBy: payload.updatedBy,
    };
    if (!existingAdjustment?.baseSnapshot) {
      adjustmentPayload.baseSnapshot = baseSnapshot;
    }

    const adjustment = await DupaAdjustment.findOneAndUpdate(
      { projectId: id, estimateRef, itemKey: adjustmentPayload.itemKey },
      { $set: adjustmentPayload },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const powMode = mode;
    const powEstimateId = mode === 'takeoff' ? new mongoose.Types.ObjectId(estimateId) : null;
    const lineKey = sourceId;
    await PowAdjustment.findOneAndUpdate(
      { projectId: id, mode: powMode, estimateId: powEstimateId, lineKey },
      {
        $set: {
          projectId: id,
          mode: powMode,
          estimateId: powEstimateId,
          lineKey,
          dupaItemId,
          sourceType: resolvedSourceType,
          sourceId,
          migrationVersion: 1,
          payItemNumber: payload.payItemNumber,
          quantity: payload.quantity,
          unitCost: asNumber(authoritativeTotals?.totalUnitCostSubmitted, 0),
          reason: payload.reason,
          updatedBy: payload.updatedBy,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return NextResponse.json({
      success: true,
      data: {
        dupaItemId,
        sourceType: resolvedSourceType,
        sourceId,
        estimateRef,
        canonical: canonicalResult,
        adjustment,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to update DUPA item' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; dupaItemId: string }> },
) {
  try {
    await dbConnect();
    const { id, dupaItemId } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid project ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const mode = normalizePowMode(searchParams.get('mode'));
    const estimateId = String(searchParams.get('estimateId') || '').trim();
    const sourceType = searchParams.get('sourceType') === 'estimateLine' ? 'estimateLine' : 'projectBoq';
    const sourceId = String(searchParams.get('sourceId') || '').trim();
    const estimateRef = mode === 'manual' ? 'manual' : estimateId;

    if (!sourceId) {
      return NextResponse.json({ success: false, error: 'sourceId is required' }, { status: 400 });
    }
    if (mode === 'takeoff' && !mongoose.Types.ObjectId.isValid(estimateId)) {
      return NextResponse.json({ success: false, error: 'estimateId is required for takeoff mode' }, { status: 400 });
    }

    const adjustment = await DupaAdjustment.findOne({ projectId: id, estimateRef, dupaItemId });
    if (!adjustment?.baseSnapshot) {
      await DupaAdjustment.deleteOne({ projectId: id, estimateRef, dupaItemId });
      return NextResponse.json({ success: true, restored: false });
    }

    const base = adjustment.baseSnapshot as any;

    if (sourceType === 'projectBoq') {
      const boqItem = await ProjectBOQ.findOne({ _id: sourceId, projectId: id });
      if (!boqItem) {
        return NextResponse.json({ success: false, error: 'Manual BOQ item not found' }, { status: 404 });
      }
      boqItem.outputPerHour = asNumber(base.outputPerHour, boqItem.outputPerHour);
      boqItem.laborItems = Array.isArray(base.laborItems) ? base.laborItems : boqItem.laborItems;
      boqItem.equipmentItems = Array.isArray(base.equipmentItems) ? base.equipmentItems : boqItem.equipmentItems;
      boqItem.materialItems = Array.isArray(base.materialItems) ? base.materialItems : boqItem.materialItems;
      boqItem.directCost = asNumber(base.directCost, boqItem.directCost);
      boqItem.ocmPercentage = asNumber(base.ocmPercentage, boqItem.ocmPercentage);
      boqItem.ocmCost = asNumber(base.ocmCost, boqItem.ocmCost);
      boqItem.cpPercentage = asNumber(base.cpPercentage, boqItem.cpPercentage);
      boqItem.cpCost = asNumber(base.cpCost, boqItem.cpCost);
      boqItem.subtotalWithMarkup = asNumber(base.subtotalWithMarkup, boqItem.subtotalWithMarkup);
      boqItem.vatPercentage = asNumber(base.vatPercentage, boqItem.vatPercentage);
      boqItem.vatCost = asNumber(base.vatCost, boqItem.vatCost);
      boqItem.totalCost = asNumber(base.totalCost, boqItem.totalCost);
      boqItem.unitCost = asNumber(base.unitCost, boqItem.unitCost);
      boqItem.totalAmount = asNumber(base.totalAmount, boqItem.totalAmount);
      await boqItem.save();
    } else {
      const estimate = await CostEstimate.findOne({ _id: estimateId, projectId: id });
      if (!estimate) {
        return NextResponse.json({ success: false, error: 'Cost estimate not found' }, { status: 404 });
      }

      const estimateLines = Array.isArray(estimate.estimateLines) ? estimate.estimateLines : [];
      const lineIndex = findEstimateLineIndex(estimateLines as any[], sourceId, adjustment.payItemNumber);
      if (lineIndex < 0) {
        return NextResponse.json({ success: false, error: 'Estimate line not found' }, { status: 404 });
      }

      const current = estimateLines[lineIndex] as any;
      const lineId = ensureEstimateLineId(current, lineIndex);
      const restoredLine = {
        ...current,
        lineId,
        payItemNumber: String(current.payItemNumber || adjustment.payItemNumber || ''),
        payItemDescription: String(current.payItemDescription || adjustment.payItemDescription || ''),
        unit: String(current.unit || adjustment.unitOfMeasurement || ''),
        part: String(current.part || adjustment.part || ''),
        laborItems: Array.isArray(base.laborItems) ? base.laborItems : current.laborItems,
        equipmentItems: Array.isArray(base.equipmentItems) ? base.equipmentItems : current.equipmentItems,
        materialItems: Array.isArray(base.materialItems) ? base.materialItems : current.materialItems,
        laborCost: asNumber(base.laborCost, current.laborCost),
        equipmentCost: asNumber(base.equipmentCost, current.equipmentCost),
        materialCost: asNumber(base.materialCost, current.materialCost),
        directCost: asNumber(base.directCost, current.directCost),
        ocmCost: asNumber(base.ocmCost, current.ocmCost),
        cpCost: asNumber(base.cpCost, current.cpCost),
        vatCost: asNumber(base.vatCost, current.vatCost),
        unitPrice: asNumber(base.unitPrice, current.unitPrice),
        totalAmount: asNumber(base.totalAmount, current.totalAmount),
      };
      estimate.set(`estimateLines.${lineIndex}`, restoredLine);
      estimateLines[lineIndex] = restoredLine as any;
      estimate.costSummary = computeEstimateSummary(estimateLines as any) as any;
      await estimate.save({ validateModifiedOnly: true });
    }

    await DupaAdjustment.deleteOne({ projectId: id, estimateRef, dupaItemId });

    const powEstimateId = mode === 'takeoff' ? new mongoose.Types.ObjectId(estimateId) : null;
    await PowAdjustment.deleteOne({ projectId: id, mode, estimateId: powEstimateId, lineKey: sourceId });

    return NextResponse.json({ success: true, restored: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to reset DUPA item' }, { status: 500 });
  }
}
