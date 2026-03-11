import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import ProjectBOQ from '@/models/ProjectBOQ';
import { normalizePart, PART_ORDER } from '@/lib/utils/dpwh-constants';

function getPartOrder(part: string): number {
  const key = part.replace('PART ', '').trim();
  const index = PART_ORDER.indexOf(key);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function comparePayItemNumbers(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
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

    const items = boqItems
      .map((item) => {
        const part = normalizePart(item.part || 'PART C');
        const laborSubmitted = (item.laborItems || []).reduce((sum: number, row: any) => sum + (row.amount || 0), 0);
        const equipmentSubmitted = (item.equipmentItems || []).reduce((sum: number, row: any) => sum + (row.amount || 0), 0);
        const directCostSubmitted = laborSubmitted + equipmentSubmitted;
        const outputSubmitted = item.outputPerHour || 1;
        const directUnitCostSubmitted = outputSubmitted > 0 ? directCostSubmitted / outputSubmitted : 0;
        const materialsSubmitted = (item.materialItems || []).reduce((sum: number, row: any) => sum + (row.amount || 0), 0);
        const directUnitPlusMaterialsSubmitted = directUnitCostSubmitted + materialsSubmitted;
        const ocmValue = item.ocmCost || 0;
        const cpValue = item.cpCost || 0;
        const vatValue = item.vatCost || 0;
        const totalUnitCostSubmitted = item.totalCost || (directUnitPlusMaterialsSubmitted + ocmValue + cpValue + vatValue);

        return {
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
            description: row.description || '',
            noOfUnits: row.noOfUnits || 0,
            noOfHours: row.noOfHours || 0,
            hourlyRate: row.hourlyRate || 0,
            amount: row.amount || 0,
          })),
          materialItems: (item.materialItems || []).map((row: any) => ({
            description: row.description || '',
            unit: row.unit || '',
            quantity: row.quantity || 0,
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
            ocmPercent: item.ocmPercentage || 0,
            ocmValue,
            cpPercent: item.cpPercentage || 0,
            cpValue,
            vatPercent: item.vatPercentage || 0,
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

    return NextResponse.json({ success: true, data: { header, signatories, items } });
  } catch (error: any) {
    console.error('GET /api/projects/[id]/dupa-report error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to generate DUPA report' }, { status: 500 });
  }
}
