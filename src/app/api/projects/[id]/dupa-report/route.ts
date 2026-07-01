import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import ProjectBOQ from '@/models/ProjectBOQ';
import CostEstimate from '@/models/CostEstimate';
import DUPATemplate from '@/models/DUPATemplate';
import DupaAdjustment from '@/models/DupaAdjustment';
import { getPartKey, normalizePart, PART_ORDER } from '@/lib/utils/dpwh-constants';
import { ensureEstimateLineId, makeDupaItemId, normalizePowMode } from '@/lib/utils/dupa-identity';

function getPartOrder(part: string): number {
  const key = getPartKey(part).replace('PART ', '').trim();
  const index = PART_ORDER.indexOf(key);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function comparePayItemNumbers(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid project ID' }, { status: 400 });
    }

    const project = await Project.findById(id).lean();
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const mode = normalizePowMode(searchParams.get('mode'));
    const estimateId = String(searchParams.get('estimateId') || '').trim();
    const estimateRef = mode === 'manual' ? 'manual' : estimateId;

    let sourceItems: any[] = [];
    let selectedEstimate: any = null;

    if (mode === 'takeoff') {
      if (estimateId && mongoose.Types.ObjectId.isValid(estimateId)) {
        selectedEstimate = await CostEstimate.findOne({ _id: estimateId, projectId: id }).lean();
      }
      if (!selectedEstimate) {
        selectedEstimate = await CostEstimate.findOne({ projectId: id }).sort({ createdAt: -1 }).lean();
      }
      const estimateLines = Array.isArray(selectedEstimate?.estimateLines) ? selectedEstimate.estimateLines : [];
      sourceItems = estimateLines.map((line: any, index: number) => ({
        sourceType: 'estimateLine' as const,
        sourceId: ensureEstimateLineId(line, index),
        payItemNumber: line.payItemNumber || '',
        payItemDescription: line.payItemDescription || '',
        templateId: String(line.dupaTemplateId || ''),
        part: normalizePart(line.part || '') || 'UNASSIGNED PART',
        unitOfMeasurement: line.unit || '',
        outputPerHour: Number(line.outputPerHour || 0),
        quantity: line.quantity || 0,
        laborItems: line.laborItems || [],
        equipmentItems: line.equipmentItems || [],
        materialItems: line.materialItems || [],
        ocmPercentage: selectedEstimate?.ocmPercentage || 0,
        cpPercentage: selectedEstimate?.cpPercentage || 0,
        vatPercentage: selectedEstimate?.vatPercentage || 0,
      }));
    } else {
      const boqItems = await ProjectBOQ.find({ projectId: id }).lean();
      sourceItems = boqItems.map((item: any) => ({
        sourceType: 'projectBoq' as const,
        sourceId: String(item?._id || ''),
        payItemNumber: item.payItemNumber || '',
        payItemDescription: item.payItemDescription || '',
        templateId: String(item.templateId || ''),
        part: normalizePart(item.part || '') || 'UNASSIGNED PART',
        unitOfMeasurement: item.unitOfMeasurement || '',
        outputPerHour: Number(item.outputPerHour || 0),
        quantity: item.quantity || 0,
        laborItems: item.laborItems || [],
        equipmentItems: item.equipmentItems || [],
        materialItems: item.materialItems || [],
        ocmPercentage: item.ocmPercentage || 0,
        cpPercentage: item.cpPercentage || 0,
        vatPercentage: item.vatPercentage || 0,
        ocmCost: item.ocmCost || 0,
        cpCost: item.cpCost || 0,
        vatCost: item.vatCost || 0,
        totalCost: item.totalCost || 0,
      }));
    }

    const templateIds = Array.from(
      new Set(
        sourceItems
          .map((item) => String(item.templateId || '').trim())
          .filter((value) => mongoose.Types.ObjectId.isValid(value)),
      ),
    );

    const [templates, adjustments] = await Promise.all([
      templateIds.length
        ? DUPATemplate.find({ _id: { $in: templateIds } }, { outputPerHour: 1 }).lean()
        : Promise.resolve([]),
      DupaAdjustment.find({ projectId: id, estimateRef }, { sourceType: 1, sourceId: 1, outputPerHour: 1 }).lean(),
    ]);

    const templateOutputMap = new Map(
      templates.map((template: any) => [String(template._id), Number(template.outputPerHour || 0)]),
    );
    const adjustmentOutputMap = new Map(
      adjustments.map((adjustment: any) => [
        `${String(adjustment.sourceType || '')}:${String(adjustment.sourceId || '')}`,
        Number(adjustment.outputPerHour || 0),
      ]),
    );

    const items = sourceItems
      .map((item) => {
        const part = normalizePart(item.part || '') || 'UNASSIGNED PART';
        const dupaItemId = makeDupaItemId({
          sourceType: item.sourceType,
          sourceId: item.sourceId,
          payItemNumber: item.payItemNumber,
        });
        const laborSubmitted = (item.laborItems || []).reduce((sum: number, row: any) => sum + (row.amount || 0), 0);
        const equipmentSubmitted = (item.equipmentItems || []).reduce((sum: number, row: any) => sum + (row.amount || 0), 0);
        const directCostSubmitted = laborSubmitted + equipmentSubmitted;
        const templateOutput = templateOutputMap.get(String(item.templateId || '')) || 0;
        const adjustmentOutput = adjustmentOutputMap.get(`${item.sourceType}:${item.sourceId}`) || 0;
        const storedOutput = Number(item.outputPerHour || 0);
        const outputSubmitted = adjustmentOutput > 0
          ? adjustmentOutput
          : templateOutput > 0
            ? templateOutput
            : storedOutput > 0
              ? storedOutput
              : 0;
        const directUnitCostSubmitted = outputSubmitted > 0 ? directCostSubmitted / outputSubmitted : 0;
        const materialsSubmitted = (item.materialItems || []).reduce((sum: number, row: any) => sum + (row.amount || 0), 0);
        const directUnitPlusMaterialsSubmitted = directUnitCostSubmitted + materialsSubmitted;
        const ocmPercent = Number(item.ocmPercentage || 0);
        const cpPercent = Number(item.cpPercentage || 0);
        const vatPercent = Number(item.vatPercentage || 0);

        // Always derive indirect costs at unit level from percentage inputs.
        // This keeps DUPA display consistent with workspace recomputation and
        // avoids mixing potentially stale/non-unit stored absolute costs.
        const ocmValue = directUnitPlusMaterialsSubmitted * (ocmPercent / 100);
        const cpValue = directUnitPlusMaterialsSubmitted * (cpPercent / 100);
        const vatValue = (directUnitPlusMaterialsSubmitted + ocmValue + cpValue) * (vatPercent / 100);
        const totalUnitCostSubmitted = directUnitPlusMaterialsSubmitted + ocmValue + cpValue + vatValue;

        return {
          dupaItemId,
          sourceType: item.sourceType,
          sourceId: item.sourceId,
          estimateLineId: item.sourceType === 'estimateLine' ? item.sourceId : undefined,
          payItemNumber: item.payItemNumber || '',
          payItemDescription: item.payItemDescription || '',
          part,
          unitOfMeasurement: item.unitOfMeasurement || '',
          outputPerHour: outputSubmitted,
          quantity: item.quantity || 0,
          laborItems: (item.laborItems || []).map((row: any) => ({
            designation: row.designation || '',
            noOfPersons: row.noOfPersons || 0,
            noOfHours: row.noOfHours || 0,
            hourlyRate: row.hourlyRate || 0,
            amount: row.amount || 0,
          })),
          equipmentItems: (item.equipmentItems || []).map((row: any) => ({
            description: row.completeDescription || row.description || '',
            noOfUnits: row.noOfUnits || 0,
            noOfHours: row.noOfHours || 0,
            hourlyRate: row.hourlyRate || 0,
            amount: row.amount || 0,
          })),
          materialItems: (item.materialItems || []).map((row: any) => ({
            materialCode: row.materialCode || '',
            description: row.description || '',
            unit: row.unit || '',
            quantity: row.quantity || 0,
            basePrice: row.basePrice || 0,
            haulingCost: row.haulingCost || 0,
            unitCost: row.unitCost || 0,
            amount: row.amount || 0,
          })),
          totals: {
            laborSubmitted,
            equipmentSubmitted,
            directCostSubmitted,
            outputSubmitted,
            directUnitCostSubmitted,
            materialsSubmitted,
            directUnitPlusMaterialsSubmitted,
            ocmPercent,
            ocmValue,
            cpPercent,
            cpValue,
            vatPercent,
            vatValue,
            totalUnitCostSubmitted,
          },
        };
      })
      .sort((a, b) => {
        const byPart = getPartOrder(a.part) - getPartOrder(b.part);
        if (byPart !== 0) return byPart;

        const byNumber = comparePayItemNumbers(a.payItemNumber, b.payItemNumber);
        if (byNumber !== 0) return byNumber;

        return a.payItemDescription.localeCompare(b.payItemDescription, undefined, { sensitivity: 'base' });
      });

    const header = {
      implementingOffice: project.implementingOffice || 'DPWH District Engineering Office',
      address: project.address || '',
      projectName: project.projectName,
      projectLocation: project.projectLocation,
      datePrepared: new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
      targetStartDate: project.targetStartDate
        ? new Date(project.targetStartDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
        : '',
      targetCompletionDate: project.targetCompletionDate
        ? new Date(project.targetCompletionDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
        : '',
      contractDurationCD: project.contractDurationCD || 0,
      workingDays: project.workingDays || 0,
      unworkableDays: {
        sundays: (project.unworkableDays as any)?.sundays || 0,
        holidays: (project.unworkableDays as any)?.holidays || 0,
        rainyDays: (project.unworkableDays as any)?.rainyDays || 0,
      },
      totalProjectCost: 0,
    };

    const signatories = {
      preparedBy: { name: '', position: '', section: 'Planning and Design Section' },
      checkedBy: { name: '', position: '', section: 'Planning and Design Section' },
      recommendingApproval: { name: '', position: '', section: '' },
      approvedBy: { name: '', position: '', section: 'DPWH District Engineering Office' },
    };

    const pricing = {
      equipmentRateEdition:
        selectedEstimate?.equipmentRateEdition ||
        project.manualPowConfig?.equipmentRateEdition ||
        '',
      equipmentRateMode:
        selectedEstimate?.equipmentRateMode ||
        project.manualPowConfig?.equipmentRateMode ||
        'fixed',
    };

    return NextResponse.json({ success: true, data: { header, signatories, pricing, items } });
  } catch (error: any) {
    console.error('GET /api/projects/[id]/dupa-report error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to generate DUPA report' }, { status: 500 });
  }
}
