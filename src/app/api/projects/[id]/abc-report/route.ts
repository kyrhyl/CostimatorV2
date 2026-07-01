import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import ProjectBOQ from '@/models/ProjectBOQ';
import CostEstimate from '@/models/CostEstimate';
import {
  getDivisionForPart,
  getPartKey,
  getPartDescription,
  normalizePart,
  PART_ORDER,
} from '@/lib/utils/dpwh-constants';
import { normalizePowMode } from '@/lib/utils/dupa-identity';

function sortByPart(a: { part: string }, b: { part: string }) {
  const aKey = getPartKey(a.part).replace('PART ', '').trim();
  const bKey = getPartKey(b.part).replace('PART ', '').trim();
  return PART_ORDER.indexOf(aKey) - PART_ORDER.indexOf(bKey);
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

    let sourceItems: any[] = [];

    if (mode === 'takeoff') {
      let estimate: any = null;
      if (estimateId && mongoose.Types.ObjectId.isValid(estimateId)) {
        estimate = await CostEstimate.findOne({ _id: estimateId, projectId: id }).lean();
      }
      if (!estimate) {
        estimate = await CostEstimate.findOne({ projectId: id }).sort({ createdAt: -1 }).lean();
      }

      const estimateLines = Array.isArray(estimate?.estimateLines) ? estimate.estimateLines : [];
      sourceItems = estimateLines.map((line: any) => {
        const quantity = Number(line.quantity || 0);
        const directTotal = Number(line.directCost || 0) * quantity;
        const markupValue = (Number(line.ocmCost || 0) + Number(line.cpCost || 0)) * quantity;
        const vat = Number(line.vatCost || 0) * quantity;
        const totalCost = Number(line.totalAmount || 0) || (directTotal + markupValue + vat);
        const unitCost = quantity > 0 ? totalCost / quantity : 0;

        return {
          part: normalizePart(line.part || '') || 'UNASSIGNED PART',
          payItemNumber: line.payItemNumber || '',
          payItemDescription: line.payItemDescription || '',
          quantity,
          unitOfMeasurement: line.unit || '',
          directCost: directTotal,
          markupValue,
          vat,
          totalIndirectCost: markupValue + vat,
          totalCost,
          unitCost,
        };
      });
    } else {
      const boqItems = await ProjectBOQ.find({ projectId: id }).lean();
      sourceItems = boqItems.map((item: any) => {
        const quantity = Number(item.quantity || 0);
        const directTotal = Number(item.directCost || 0) * quantity;
        const markupValue = (Number(item.ocmCost || 0) + Number(item.cpCost || 0)) * quantity;
        const vat = Number(item.vatCost || 0) * quantity;
        const totalCost = Number(item.totalAmount || 0) || (directTotal + markupValue + vat);
        const unitCost = quantity > 0 ? totalCost / quantity : 0;

        return {
          part: normalizePart(item.part || '') || 'UNASSIGNED PART',
          payItemNumber: item.payItemNumber || '',
          payItemDescription: item.payItemDescription || '',
          quantity,
          unitOfMeasurement: item.unitOfMeasurement || '',
          directCost: directTotal,
          markupValue,
          vat,
          totalIndirectCost: markupValue + vat,
          totalCost,
          unitCost,
        };
      });
    }

    const partMap = new Map<string, {
      part: string;
      partDescription: string;
      division: string;
      items: Array<{
        payItemNumber: string;
        payItemDescription: string;
        quantity: number;
        unitOfMeasurement: string;
        directCost: number;
        markupPercent: number;
        markupValue: number;
        vat: number;
        totalIndirectCost: number;
        totalCost: number;
        unitCost: number;
      }>;
      totals: {
        directCost: number;
        markupValue: number;
        vat: number;
        totalIndirectCost: number;
        totalCost: number;
      };
    }>();

    for (const item of sourceItems) {
      const part = normalizePart(item.part || '') || 'UNASSIGNED PART';
      const division = getDivisionForPart(part);
      const partDescription = getPartDescription(part);
      const directCost = item.directCost || 0;
      const markupValue = item.markupValue || 0;
      const vat = item.vat || 0;
      const totalIndirectCost = item.totalIndirectCost || (markupValue + vat);
      const totalCost = item.totalCost || (directCost + totalIndirectCost);
      const markupPercent = directCost > 0 ? (markupValue / directCost) * 100 : 0;
      const unitCost = item.unitCost || ((item.quantity || 0) > 0 ? totalCost / item.quantity : 0);

      if (!partMap.has(part)) {
        partMap.set(part, {
          part,
          partDescription,
          division,
          items: [],
          totals: {
            directCost: 0,
            markupValue: 0,
            vat: 0,
            totalIndirectCost: 0,
            totalCost: 0,
          },
        });
      }

      const partData = partMap.get(part)!;
      partData.items.push({
        payItemNumber: item.payItemNumber || '',
        payItemDescription: item.payItemDescription || '',
        quantity: item.quantity || 0,
        unitOfMeasurement: item.unitOfMeasurement || '',
        directCost,
        markupPercent,
        markupValue,
        vat,
        totalIndirectCost,
        totalCost,
        unitCost,
      });

      partData.totals.directCost += directCost;
      partData.totals.markupValue += markupValue;
      partData.totals.vat += vat;
      partData.totals.totalIndirectCost += totalIndirectCost;
      partData.totals.totalCost += totalCost;
    }

    const parts = Array.from(partMap.values()).sort(sortByPart);

    const divisionMap = new Map<string, {
      division: string;
      directCost: number;
      markupValue: number;
      vat: number;
      totalIndirectCost: number;
      totalCost: number;
    }>();

    for (const part of parts) {
      if (!divisionMap.has(part.division)) {
        divisionMap.set(part.division, {
          division: part.division,
          directCost: 0,
          markupValue: 0,
          vat: 0,
          totalIndirectCost: 0,
          totalCost: 0,
        });
      }

      const division = divisionMap.get(part.division)!;
      division.directCost += part.totals.directCost;
      division.markupValue += part.totals.markupValue;
      division.vat += part.totals.vat;
      division.totalIndirectCost += part.totals.totalIndirectCost;
      division.totalCost += part.totals.totalCost;
    }

    const divisionTotals = Array.from(divisionMap.values());

    const totals = parts.reduce(
      (acc, part) => {
        acc.directCost += part.totals.directCost;
        acc.markupValue += part.totals.markupValue;
        acc.vat += part.totals.vat;
        acc.totalIndirectCost += part.totals.totalIndirectCost;
        acc.totalCost += part.totals.totalCost;
        return acc;
      },
      { directCost: 0, markupValue: 0, vat: 0, totalIndirectCost: 0, totalCost: 0 },
    );

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
      totalProjectCost: totals.totalCost,
    };

    const signatories = {
      preparedBy: { name: '', position: '', section: 'Planning and Design Section' },
      checkedBy: { name: '', position: '', section: 'Planning and Design Section' },
      recommendingApproval: { name: '', position: '', section: '' },
      approvedBy: { name: '', position: '', section: 'DPWH District Engineering Office' },
    };

    return NextResponse.json({
      success: true,
      data: {
        header,
        parts,
        divisionTotals,
        totals,
        signatories,
      },
    });
  } catch (error: any) {
    console.error('GET /api/projects/[id]/abc-report error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to generate ABC report' }, { status: 500 });
  }
}
