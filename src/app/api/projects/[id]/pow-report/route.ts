import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import ProjectBOQ from '@/models/ProjectBOQ';
import Estimate from '@/models/Estimate';
import CostEstimate from '@/models/CostEstimate';
import PayItem from '@/models/PayItem';
import DUPATemplate from '@/models/DUPATemplate';
import mongoose from 'mongoose';
import { getDivisionForPart, getPartKey, normalizePart, PART_DESCRIPTIONS, PART_ORDER } from '@/lib/utils/dpwh-constants';
import { computePercentOfProjectCost } from '@/lib/utils/pow-math';
import { normalizePowMode } from '@/lib/utils/dupa-identity';

interface BOQLineItem {
  payItemNumber: string;
  payItemDescription: string;
  quantity: number;
  unitOfMeasurement: string;
  directCost: number;
  totalAmount: number;
  ocmCost: number;
  cpCost?: number;
  vatCost: number;
  laborItems?: Array<{ amount: number }>;
  equipmentItems?: Array<{ amount: number }>;
  materialItems?: Array<{ amount: number }>;
  part?: string;
  partDescription?: string;
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

    const { searchParams } = new URL(req.url);
    const mode = normalizePowMode(searchParams.get('mode'));
    const estimateId = String(searchParams.get('estimateId') || '').trim();

    const boqItems = await ProjectBOQ.find({ projectId: id }).populate('templateId').lean();
    const estimate = await Estimate.findOne({ projectId: id }).lean();

    let selectedCostEstimate: any = null;
    if (mode === 'takeoff') {
      if (estimateId && mongoose.Types.ObjectId.isValid(estimateId)) {
        selectedCostEstimate = await CostEstimate.findOne({ _id: estimateId, projectId: id }).lean();
      }
      if (!selectedCostEstimate) {
        selectedCostEstimate = await CostEstimate.findOne({ projectId: id }).sort({ createdAt: -1 }).lean();
      }
    }

    const costEstimates = selectedCostEstimate ? [selectedCostEstimate] : [];

    const mapCostEstimateLine = (line: any) => {
      const quantity = Number(line.quantity || 0);
      const directUnit = Number(line.directCost || 0);
      const ocmUnit = Number(line.ocmCost || 0);
      const cpUnit = Number(line.cpCost || 0);
      const vatUnit = Number(line.vatCost || 0);
      const totalAmount = Number(line.totalAmount || 0);

      return {
        payItemNumber: line.payItemNumber || '',
        payItemDescription: line.payItemDescription || '',
        quantity,
        unitOfMeasurement: line.unit || '',
        directCost: directUnit * quantity,
        totalAmount,
        ocmCost: ocmUnit * quantity,
        cpCost: cpUnit * quantity,
        vatCost: vatUnit * quantity,
        laborCost: Number(line.laborCost || 0) * quantity,
        materialCost: Number(line.materialCost || 0) * quantity,
        equipmentCost: Number(line.equipmentCost || 0) * quantity,
        part: line.part || '',
        partDescription: '',
        category: line.category || '',
        subCategory: line.subCategory || '',
        laborItems: line.laborItems || [],
        equipmentItems: line.equipmentItems || [],
        materialItems: line.materialItems || [],
      };
    };

    const mapProjectBoqItem = (item: any) => {
      const quantity = Number(item.quantity || 0);
      const directUnit = Number(item.directCost || 0);
      const ocmUnit = Number(item.ocmCost || 0);
      const cpUnit = Number(item.cpCost || 0);
      const vatUnit = Number(item.vatCost || 0);
      const totalAmount = Number(item.totalAmount || 0);

      return {
        payItemNumber: item.payItemNumber || '',
        payItemDescription: item.payItemDescription || '',
        quantity,
        unitOfMeasurement: item.unitOfMeasurement || item.unit || '',
        directCost: directUnit * quantity,
        totalAmount,
        ocmCost: ocmUnit * quantity,
        cpCost: cpUnit * quantity,
        vatCost: vatUnit * quantity,
        laborCost: Number(item.laborCost || 0) * quantity,
        materialCost: Number(item.materialCost || 0) * quantity,
        equipmentCost: Number(item.equipmentCost || 0) * quantity,
        part: item.part || (item.templateId as any)?.part || '',
        partDescription: (item.templateId as any)?.category || '',
        category: item.category || (item.templateId as any)?.category || '',
        subCategory: item.subCategory || '',
        laborItems: item.laborItems || [],
        equipmentItems: item.equipmentItems || [],
        materialItems: item.materialItems || [],
      };
    };

    console.log('=== POW Report Debug ===');
    console.log('Project ID:', id);
    console.log('ProjectBOQ Items Count:', boqItems.length);
    console.log('Estimate boqLines Count:', estimate?.boqLines?.length || 0);
    console.log('CostEstimate count:', costEstimates.length);
    
    let allItems: any[] = [];
    
    if (mode === 'takeoff' && costEstimates.length > 0 && costEstimates[0].estimateLines?.length > 0) {
      console.log('Using CostEstimate.estimateLines data...');
      allItems = costEstimates[0].estimateLines.map(mapCostEstimateLine);
    } else if (mode === 'takeoff' && estimate?.boqLines && estimate.boqLines.length > 0) {
      console.log('Using Estimate boqLines data...');
      allItems = estimate.boqLines.map((line: any) => ({
        payItemNumber: line.payItemNumber || line.itemNo || '',
        payItemDescription: line.description || '',
        quantity: line.quantity || 0,
        unitOfMeasurement: line.unit || '',
        directCost: line.unitPrice ? line.unitPrice * line.quantity : 0,
        totalAmount: line.totalAmount || 0,
        ocmCost: line.breakdown?.ocmSubmitted || 0,
        cpCost: line.breakdown?.cpSubmitted || 0,
        vatCost: line.breakdown?.vatSubmitted || 0,
        laborCost: line.laborCost || 0,
        materialCost: line.materialCost || 0,
        equipmentCost: line.equipmentCost || 0,
        part: line.part || '',
        partDescription: line.partDescription || '',
        category: line.category || '',
        subCategory: line.subCategory || '',
        laborItems: [],
        equipmentItems: [],
        materialItems: []
      }));
    } else if (boqItems.length > 0) {
      console.log('Using ProjectBOQ data...');
      allItems = boqItems.map(mapProjectBoqItem);
    }
    
    if (allItems.length === 0) {
      console.log('No BOQ items found for this project!');
    } else {
      console.log('Total items to process:', allItems.length);
      console.log('Sample item:', JSON.stringify({
        payItemNumber: allItems[0]?.payItemNumber,
        part: allItems[0]?.part,
        description: allItems[0]?.payItemDescription || allItems[0]?.description
      }, null, 2));
    }
    console.log('========================');
    
    const totalDirectCost = allItems.reduce((sum, item) => sum + (item.directCost || 0), 0);
    const expenditureBreakdown = calculateExpenditureBreakdown(allItems);
    const totalProjectCost = expenditureBreakdown.totalEstimatedCost || 0;
    const partDescriptions = await getPartDescriptionsFromDB();
    const worksItems = groupItemsByPart(allItems, partDescriptions, totalProjectCost);
    const itemizedParts = groupItemsByPartDetailed(allItems, partDescriptions, totalProjectCost);
    const componentBreakdown = groupItemsByComponentBreakdown(allItems, partDescriptions, totalProjectCost);

    console.log('Works Items Grouped:', worksItems.length, 'parts found');
    worksItems.forEach((item: any, idx: number) => {
      console.log(`  Part ${idx + 1}:`, item.part, '-', item.items.length, 'items');
    });
    console.log('Itemized Parts:', itemizedParts.length, 'parts with detailed items');

    const header = {
      implementingOffice: project.implementingOffice || 'DPWH District Engineering Office',
      address: project.address || '',  // NEW
      projectName: project.projectName,
      projectLocation: project.projectLocation,
      datePrepared: new Date().toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      targetStartDate: project.targetStartDate 
        ? new Date(project.targetStartDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
        : '',  // NEW
      targetCompletionDate: project.targetCompletionDate 
        ? new Date(project.targetCompletionDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
        : '',  // NEW
      contractDurationCD: project.contractDurationCD || 0,
      workingDays: project.workingDays || 0,  // NEW
      unworkableDays: {  // NEW
        sundays: (project.unworkableDays as any)?.sundays || 0,
        holidays: (project.unworkableDays as any)?.holidays || 0,
        rainyDays: (project.unworkableDays as any)?.rainyDays || 0,
      },
      totalProjectCost: totalProjectCost
    };

    const projectComponent = {
      componentId: (project.projectComponent as any)?.componentId || '',
      infraId: (project.projectComponent as any)?.infraId || '',
      stationLimits: {
        start: (project.projectComponent as any)?.stationLimits?.start || '-',
        end: (project.projectComponent as any)?.stationLimits?.end || '-'
      },
      chainage: {
        start: (project.projectComponent as any)?.chainage?.start || '-',
        end: (project.projectComponent as any)?.chainage?.end || '-'
      },
      coordinates: {
        latitude: (project.projectComponent as any)?.coordinates?.latitude || 0,
        longitude: (project.projectComponent as any)?.coordinates?.longitude || 0
      }
    };

    const fundingSource = {
      source: (project.fundSource as any)?.fundingOrganization || 'BEFF',
      projectId: (project.fundSource as any)?.projectId || '',  // NEW
      fundingAgreement: (project.fundSource as any)?.fundingAgreement || '',  // NEW
      fundingOrganization: (project.fundSource as any)?.fundingOrganization || '',  // NEW
      fiscalYear: 'FY 2025',
      targetAmount: (project.physicalTarget as any)?.targetAmount || 1,
      unitOfMeasure: (project.physicalTarget as any)?.unitOfMeasure || 'No. of Storey'
    };

    const physicalTarget = {  // NEW
      infraType: (project.physicalTarget as any)?.infraType || '',
      projectComponentId: (project.physicalTarget as any)?.projectComponentId || '',
      targetAmount: (project.physicalTarget as any)?.targetAmount || 0,
      unitOfMeasure: (project.physicalTarget as any)?.unitOfMeasure || '',
    };

    const allottedAmount = project.allotedAmount || 0;  // NEW
    const estimatedComponentCost = project.estimatedComponentCost || 0;  // NEW

    // Calculate EAO (Engineering & Administrative Overhead) - typically 1% of direct cost
    const eaoPercentage = project.manualPowConfig?.eaoPercentage ?? 1;
    const eao = Math.round(totalProjectCost * (eaoPercentage / 100) * 100) / 100;  // Based on Total Construction Cost, 2 decimal places

    const signatories = {
      preparedBy: { name: '', position: '', section: 'Planning and Design Section' },
      checkedBy: { name: '', position: '', section: 'Planning and Design Section' },
      recommendingApproval: { name: '', position: '', section: '' },
      approvedBy: { name: '', position: '', section: 'DPWH District Engineering Office' }
    };

    return NextResponse.json({
      success: true,
      data: {
        header,
        projectComponent,
        fundingSource,
        physicalTarget,
        allottedAmount,
        estimatedComponentCost,
        worksItems,
        itemizedParts,
        componentBreakdown,
        breakdown: {
          ...expenditureBreakdown,
          eao,
          eaoPercentage,
        },
        signatories,
        _debug: {
          source: costEstimates.length > 0 && costEstimates[0].estimateLines?.length > 0 
            ? 'CostEstimate.estimateLines' 
            : (estimate?.boqLines && estimate.boqLines.length > 0 
                ? 'Estimate.boqLines' 
                : (boqItems.length > 0 ? 'ProjectBOQ' : 'none')),
          costEstimatesCount: costEstimates.length,
          allItemsCount: allItems.length,
          sampleItem: allItems[0] ? {
            payItemNumber: allItems[0].payItemNumber,
            part: allItems[0].part,
            description: allItems[0].payItemDescription || allItems[0].description
          } : null
        }
      }
    });
  } catch (error: any) {
    console.error('GET /api/projects/[id]/pow-report error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate POW report' },
      { status: 500 }
    );
  }
}

async function getPartDescriptionsFromDB(): Promise<Record<string, string>> {
  return { ...PART_DESCRIPTIONS, 'PART D': 'REINFORCED CONCRETE / BUILDINGS' };
}

function groupItemsByPart(
  boqItems: any[],
  partDescriptions: Record<string, string>,
  totalProjectCost: number,
): Array<{
  part: string;
  partDescription: string;
  division: string;
  items: BOQLineItem[];
  asSubmitted: number;
  percent: number;
}> {
  const partMap = new Map<string, { items: BOQLineItem[]; asSubmitted: number }>();

  console.log('Processing', boqItems.length, 'BOQ items...');
  
  boqItems.forEach((item, index) => {
    const part = normalizePart(item.part || (item.templateId && (item.templateId as any)?.part) || '') || 'UNASSIGNED PART';
    
    const partKey = part;

    if (!partMap.has(partKey)) {
      partMap.set(partKey, { items: [], asSubmitted: 0 });
    }

    const partData = partMap.get(partKey)!;
    partData.items.push({
      payItemNumber: item.payItemNumber || '',
      payItemDescription: item.payItemDescription || '',
      quantity: item.quantity || 0,
      unitOfMeasurement: item.unitOfMeasurement || '',
      directCost: item.directCost || 0,
      totalAmount: item.totalAmount || 0,
      ocmCost: item.ocmCost || 0,
      cpCost: item.cpCost || 0,
      vatCost: item.vatCost || 0,
      laborItems: item.laborItems || [],
      equipmentItems: item.equipmentItems || [],
      materialItems: item.materialItems || [],
      part: item.part || (item.templateId as any)?.part || '',
      partDescription: (item.templateId as any)?.category || ''
    });
    partData.asSubmitted += item.directCost || 0;
  });

  console.log('Part map created:', partMap.size, 'unique parts');

  return Array.from(partMap.entries())
    .map(([part, data]) => ({
      part,
      partDescription: partDescriptions[getPartKey(part)] || 'Other Works',
      division: getDivisionForPart(part),
      items: data.items,
      asSubmitted: data.asSubmitted,
      percent: computePercentOfProjectCost(data.asSubmitted, totalProjectCost)
    }))
    .sort((a, b) => {
      const aOrder = PART_ORDER.indexOf(getPartKey(a.part).replace('PART ', ''));
      const bOrder = PART_ORDER.indexOf(getPartKey(b.part).replace('PART ', ''));
      if (aOrder !== -1 && bOrder !== -1) return aOrder - bOrder;
      return a.part.localeCompare(b.part);
    });
}

interface DetailedLineItem {
  payItemNumber: string;
  payItemDescription: string;
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
  subGroup: string;
}

interface DetailedPartGroup {
  part: string;
  partDescription: string;
  division: string;
  items: DetailedLineItem[];
  partTotal: number;
  partPercent: number;
}

function groupItemsByPartDetailed(
  boqItems: any[],
  partDescriptions: Record<string, string>,
  totalProjectCost: number,
): DetailedPartGroup[] {
  const partMap = new Map<string, { items: DetailedLineItem[]; partTotal: number }>();

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
    const cpCost = item.cpCost || 0;
    const vatCost = item.vatCost || 0;
    const totalWithOverhead = directCost + ocmCost + cpCost + vatCost;
    
    const unitCost = quantity > 0 ? directCost / quantity : 0;
    const totalUnitCost = quantity > 0 ? totalWithOverhead / quantity : 0;
    
    partData.items.push({
      payItemNumber: item.payItemNumber || '',
      payItemDescription: item.payItemDescription || '',
      quantity: quantity,
      quantityEvaluated: quantity,
      unitOfMeasurement: item.unitOfMeasurement || '',
      directCostTotal: directCost,
      directCostTotalEvaluated: directCost,
      directCostUnit: unitCost,
      directCostUnitEvaluated: unitCost,
      totalUnitCost: totalUnitCost,
      totalUnitCostEvaluated: totalUnitCost,
      percentDirectCost: 0,
      subGroup: String(item.subCategory || item.category || '')
    });
    partData.partTotal += directCost;
  });

  return Array.from(partMap.entries())
    .map(([part, data]) => ({
      part,
      partDescription: partDescriptions[getPartKey(part)] || 'Other Works',
      division: getDivisionForPart(part),
      items: data.items.map(item => ({
        ...item,
        percentDirectCost: computePercentOfProjectCost(item.directCostTotal, totalProjectCost)
      })),
      partTotal: data.partTotal,
      partPercent: computePercentOfProjectCost(data.partTotal, totalProjectCost)
    }))
    .sort((a, b) => {
      const aOrder = PART_ORDER.indexOf(getPartKey(a.part).replace('PART ', ''));
      const bOrder = PART_ORDER.indexOf(getPartKey(b.part).replace('PART ', ''));
      if (aOrder !== -1 && bOrder !== -1) return aOrder - bOrder;
      return a.part.localeCompare(b.part);
    });
}

interface ComponentBreakdownItem {
  itemNumber: string;
  description: string;
  subGroup: string;
  asSubmitted: {
    percent: number;
    quantity: number;
    unit: string;
    material: number;
    labor: number;
    equipment: number;
    totalDirectCost: number;
    markupPercent: number;
    markupValue: number;
    vat: number;
    totalCost: number;
  };
}

interface ComponentBreakdownPart {
  part: string;
  partDescription: string;
  division: string;
  items: ComponentBreakdownItem[];
  totals: {
    material: number;
    labor: number;
    equipment: number;
    totalDirectCost: number;
    markupValue: number;
    vat: number;
    totalCost: number;
  };
}

function groupItemsByComponentBreakdown(
  boqItems: any[],
  partDescriptions: Record<string, string>,
  totalProjectCost: number,
): ComponentBreakdownPart[] {
  const partMap = new Map<string, { items: ComponentBreakdownItem[]; totals: ComponentBreakdownPart['totals'] }>();

  boqItems.forEach((item) => {
    const part = normalizePart(item.part || (item.templateId && (item.templateId as any)?.part) || '') || 'UNASSIGNED PART';

    const partKey = part;

    if (!partMap.has(partKey)) {
      partMap.set(partKey, {
        items: [],
        totals: { material: 0, labor: 0, equipment: 0, totalDirectCost: 0, markupValue: 0, vat: 0, totalCost: 0 }
      });
    }

    const partData = partMap.get(partKey)!;
    const directCost = item.directCost || 0;
    const material = item.materialCost || item.materialItems?.reduce((sum: number, mi: any) => sum + (mi.amount || 0), 0) || 0;
    const labor = item.laborCost || item.laborItems?.reduce((sum: number, li: any) => sum + (li.amount || 0), 0) || 0;
    const equipment = item.equipmentCost || item.equipmentItems?.reduce((sum: number, ei: any) => sum + (ei.amount || 0), 0) || 0;
    const ocm = (item.ocmCost || 0) + (item.cpCost || 0);
    const vat = item.vatCost || 0;
    const totalCost = item.totalAmount || (directCost + ocm + vat);
    const markupPercent = directCost > 0 ? (ocm / directCost) * 100 : 0;

    const componentItem: ComponentBreakdownItem = {
      itemNumber: item.payItemNumber || '',
      description: item.payItemDescription || '',
      subGroup: String(item.subCategory || item.category || ''),
      asSubmitted: {
        percent: computePercentOfProjectCost(directCost, totalProjectCost),
        quantity: item.quantity || 0,
        unit: item.unitOfMeasurement || item.unit || '',
        material,
        labor,
        equipment,
        totalDirectCost: directCost,
        markupPercent,
        markupValue: ocm,
        vat,
        totalCost
      }
    };

    partData.items.push(componentItem);
    partData.totals.material += material;
    partData.totals.labor += labor;
    partData.totals.equipment += equipment;
    partData.totals.totalDirectCost += directCost;
    partData.totals.markupValue += ocm;
    partData.totals.vat += vat;
    partData.totals.totalCost += totalCost;
  });

  return Array.from(partMap.entries())
    .map(([part, data]) => ({
      part,
      partDescription: partDescriptions[getPartKey(part)] || 'Other Works',
      division: getDivisionForPart(part),
      items: data.items,
      totals: data.totals
    }))
    .sort((a, b) => {
      const aOrder = PART_ORDER.indexOf(getPartKey(a.part).replace('PART ', ''));
      const bOrder = PART_ORDER.indexOf(getPartKey(b.part).replace('PART ', ''));
      if (aOrder !== -1 && bOrder !== -1) return aOrder - bOrder;
      return a.part.localeCompare(b.part);
    });
}

function calculateExpenditureBreakdown(boqItems: any[]): {
  labor: number;
  materials: number;
  equipment: number;
  directCost: number;
  ocm: number;
  vat: number;
  totalEstimatedCost: number;
} {
  let labor = 0;
  let materials = 0;
  let equipment = 0;
  let directCost = 0;
  let ocm = 0;
  let vat = 0;

  boqItems.forEach((item) => {
    directCost += item.directCost || 0;
    ocm += (item.ocmCost || 0) + (item.cpCost || 0);
    vat += item.vatCost || 0;

    item.laborItems?.forEach((li: any) => {
      labor += li.amount || 0;
    });
    item.equipmentItems?.forEach((ei: any) => {
      equipment += ei.amount || 0;
    });
    item.materialItems?.forEach((mi: any) => {
      materials += mi.amount || 0;
    });
  });

  const totalEstimatedCost = directCost + ocm + vat;

  return {
    labor,
    materials,
    equipment,
    directCost,
    ocm,
    vat,
    totalEstimatedCost
  };
}
