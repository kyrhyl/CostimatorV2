import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import ProjectBOQ from '@/models/ProjectBOQ';
import {
  getDivisionForPart,
  getPartDescription,
  normalizePart,
  PART_ORDER,
} from '@/lib/utils/dpwh-constants';

function sortByPart(a: { part: string }, b: { part: string }) {
  const aKey = a.part.replace('PART ', '').trim();
  const bKey = b.part.replace('PART ', '').trim();
  return PART_ORDER.indexOf(aKey) - PART_ORDER.indexOf(bKey);
}

export async function GET(
  _req: NextRequest,
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

    const boqItems = await ProjectBOQ.find({ projectId: id }).lean();

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

    for (const item of boqItems) {
      const part = normalizePart(item.part || 'PART C');
      const division = getDivisionForPart(part);
      const partDescription = getPartDescription(part);
      const directCost = item.directCost || 0;
      const markupValue = (item.ocmCost || 0) + (item.cpCost || 0);
      const vat = item.vatCost || 0;
      const totalIndirectCost = markupValue + vat;
      const totalCost = item.totalCost || directCost + totalIndirectCost;
      const markupPercent = directCost > 0 ? (markupValue / directCost) * 100 : 0;
      const unitCost = (item.quantity || 0) > 0 ? totalCost / item.quantity : 0;

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
