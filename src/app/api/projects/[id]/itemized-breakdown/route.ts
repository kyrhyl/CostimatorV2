import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import ProjectBOQ from '@/models/ProjectBOQ';
import Estimate from '@/models/Estimate';
import CostEstimate from '@/models/CostEstimate';
import mongoose from 'mongoose';
import { getDivisionForPart, getPartKey, normalizePart, PART_DESCRIPTIONS, PART_ORDER } from '@/lib/utils/dpwh-constants';

interface ItemizedLineItem {
  payItemNumber: string;
  payItemDescription: string;
  subGroup?: string;
  quantity: number;
  quantityEvaluated: number;
  unitOfMeasurement: string;
  directCostTotal: number;
  directCostTotalEvaluated: number;
  directCostUnit: number;
  directCostUnitEvaluated: number;
  totalUnitCost: number;
  totalUnitCostEvaluated: number;
  percentDirectCost: number;
}

interface PartGroup {
  part: string;
  partDescription: string;
  division: string;
  items: ItemizedLineItem[];
  partTotal: number;
  partPercent: number;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    const project = await Project.findById(id).lean();
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const boqItems = await ProjectBOQ.find({ projectId: id })
      .populate('templateId')
      .lean();

    const estimate = await Estimate.findOne({ projectId: id }).lean();
    
    const costEstimates = await CostEstimate.find({ projectId: id })
      .sort({ createdAt: -1 })
      .lean();

    let allItems: any[] = [];
    
    if (costEstimates.length > 0 && costEstimates[0].estimateLines?.length > 0) {
      allItems = costEstimates[0].estimateLines.map((line: any) => ({
        payItemNumber: line.payItemNumber || '',
        payItemDescription: line.payItemDescription || '',
        quantity: line.quantity || 0,
        unitOfMeasurement: line.unit || '',
        directCost: line.directCost || 0,
        totalAmount: line.totalAmount || 0,
        ocmCost: line.ocmCost || 0,
        vatCost: line.vatCost || 0,
        part: line.part || '',
        category: line.category || '',
        subCategory: line.subCategory || '',
        partDescription: '',
        laborItems: line.laborItems || [],
        equipmentItems: line.equipmentItems || [],
        materialItems: line.materialItems || []
      }));
    } else if (estimate?.boqLines && estimate.boqLines.length > 0) {
      allItems = estimate.boqLines.map((line: any) => ({
        payItemNumber: line.payItemNumber || line.itemNo || '',
        payItemDescription: line.description || '',
        quantity: line.quantity || 0,
        unitOfMeasurement: line.unit || '',
        directCost: line.unitPrice ? line.unitPrice * line.quantity : 0,
        totalAmount: line.totalAmount || 0,
        ocmCost: line.breakdown?.ocmSubmitted || 0,
        vatCost: line.breakdown?.vatSubmitted || 0,
        part: line.part || '',
        category: line.category || '',
        subCategory: line.subCategory || '',
        partDescription: line.partDescription || '',
        laborItems: [],
        equipmentItems: [],
        materialItems: []
      }));
    } else if (boqItems.length > 0) {
      allItems = boqItems.map((item: any) => ({
        payItemNumber: item.payItemNumber || '',
        payItemDescription: item.payItemDescription || '',
        quantity: item.quantity || 0,
        unitOfMeasurement: item.unitOfMeasurement || '',
        directCost: item.directCost || 0,
        totalAmount: item.totalAmount || 0,
        ocmCost: item.ocmCost || 0,
        vatCost: item.vatCost || 0,
        part: item.part || (item.templateId as any)?.part || '',
        category: item.category || (item.templateId as any)?.category || '',
        subCategory: item.subCategory || (item.templateId as any)?.subCategory || '',
        partDescription: (item.templateId as any)?.category || '',
        laborItems: [],
        equipmentItems: [],
        materialItems: []
      }));
    }
    
    const partDescriptions = await getPartDescriptionsFromDB();
    const groupedItems = groupItemsByPartDetailed(allItems, partDescriptions);
    
    const totalDirectCost = allItems.reduce((sum, item) => sum + (item.directCost || 0), 0);

    const header = {
      implementingOffice: project.implementingOffice || 'DPWH District Engineering Office',
      address: project.address || '',
      projectName: project.projectName,
      projectLocation: project.projectLocation,
      datePrepared: new Date().toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
    };

    return NextResponse.json({
      success: true,
      data: {
        header,
        parts: groupedItems,
        summary: {
          totalDirectCost,
          totalParts: groupedItems.length,
          totalItems: allItems.length
        }
      }
    });
  } catch (error: any) {
    console.error('GET /api/projects/[id]/itemized-breakdown error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate itemized breakdown' },
      { status: 500 }
    );
  }
}

async function getPartDescriptionsFromDB(): Promise<Record<string, string>> {
  return { ...PART_DESCRIPTIONS, 'PART D': 'REINFORCED CONCRETE' };
}

function groupItemsByPartDetailed(boqItems: any[], partDescriptions: Record<string, string>): PartGroup[] {
  const partMap = new Map<string, { items: ItemizedLineItem[]; partTotal: number }>();

  boqItems.forEach((item) => {
    const part = normalizePart(item.part || (item.templateId && (item.templateId as any)?.part) || '') || 'UNASSIGNED PART';
    
    const partKey = part;

    if (!partMap.has(partKey)) {
      partMap.set(partKey, { items: [], partTotal: 0 });
    }

    const partData = partMap.get(partKey)!;
    const directCost = item.directCost || 0;
    const quantity = item.quantity || 0;
    const ocmCost = item.ocmCost || 0;
    const vatCost = item.vatCost || 0;
    const totalWithOverhead = directCost + ocmCost + vatCost;
    
    const unitCost = quantity > 0 ? directCost / quantity : 0;
    const totalUnitCost = quantity > 0 ? totalWithOverhead / quantity : 0;
    
    partData.items.push({
      payItemNumber: item.payItemNumber || '',
      payItemDescription: item.payItemDescription || '',
      subGroup: getPartKey(part) === 'PART E' ? String(item.subCategory || item.category || '') : '',
      quantity: quantity,
      quantityEvaluated: quantity,
      unitOfMeasurement: item.unitOfMeasurement || '',
      directCostTotal: directCost,
      directCostTotalEvaluated: directCost,
      directCostUnit: unitCost,
      directCostUnitEvaluated: unitCost,
      totalUnitCost: totalUnitCost,
      totalUnitCostEvaluated: totalUnitCost,
      percentDirectCost: 0
    });
    partData.partTotal += directCost;
  });

  const totalDirectCost = boqItems.reduce((sum, item) => sum + (item.directCost || 0), 0);

  const result: PartGroup[] = Array.from(partMap.entries())
    .map(([part, data]) => ({
      part,
      partDescription: partDescriptions[getPartKey(part)] || 'Other Works',
      division: getDivisionForPart(part),
      items: data.items.map(item => ({
        ...item,
        percentDirectCost: totalDirectCost > 0 ? (item.directCostTotal / totalDirectCost) * 100 : 0
      })),
      partTotal: data.partTotal,
      partPercent: totalDirectCost > 0 ? (data.partTotal / totalDirectCost) * 100 : 0
    }))
    .sort((a, b) => {
      const aOrder = PART_ORDER.indexOf(getPartKey(a.part).replace('PART ', ''));
      const bOrder = PART_ORDER.indexOf(getPartKey(b.part).replace('PART ', ''));
      if (aOrder !== -1 && bOrder !== -1) return aOrder - bOrder;
      return a.part.localeCompare(b.part);
    });

  return result;
}
