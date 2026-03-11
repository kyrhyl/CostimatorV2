import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import ProjectBOQ from '@/models/ProjectBOQ';
import DUPATemplate from '@/models/DUPATemplate';
import LaborRate from '@/models/LaborRate';
import Equipment from '@/models/Equipment';
import Material from '@/models/Material';
import MaterialPrice from '@/models/MaterialPrice';
import { computeHaulingCost, type HaulingTemplate } from '@/lib/calc/hauling';

const laborRateMap: Record<string, string> = {
  'Foreman': 'foreman',
  'Leadman': 'leadman',
  'Equipment Operator - Heavy': 'equipmentOperatorHeavy',
  'Equipment Operator - High Skilled': 'equipmentOperatorHighSkilled',
  'Equipment Operator - Light Skilled': 'equipmentOperatorLightSkilled',
  'Driver': 'driver',
  'Skilled Labor': 'laborSkilled',
  'Semi-Skilled Labor': 'laborSemiSkilled',
  'Unskilled Labor': 'laborUnskilled',
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();

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

    const boqItems = await ProjectBOQ.find({ projectId: id }).lean();
    if (!boqItems.length) {
      return NextResponse.json(
        { success: true, updatedCount: 0, message: 'No BOQ items to recalculate' },
        { status: 200 }
      );
    }

    const laborRates = await LaborRate.findOne({ location: project.projectLocation })
      .sort({ effectiveDate: -1 })
      .lean();

    if (!laborRates) {
      return NextResponse.json(
        { success: false, error: `No labor rates found for location: ${project.projectLocation}` },
        { status: 404 }
      );
    }

    let haulingCostPerCuM = 0;
    if (project.haulingConfig) {
      const haulingTemplate: HaulingTemplate = {
        totalDistanceKm: project.haulingConfig.totalDistance || 0,
        freeHaulingDistanceKm: project.haulingConfig.freeHaulingDistance || 0,
        routeSegments: project.haulingConfig.routeSegments || [],
        equipmentHourlyRatePhp: project.haulingConfig.equipmentRentalRate || 1420,
        equipmentCapacityCuM: project.haulingConfig.equipmentCapacity || 10,
      };
      const haulingResult = computeHaulingCost(haulingTemplate);
      haulingCostPerCuM = haulingResult.costPerCuMPhp;
    } else if (project.distanceFromOffice && project.haulingCostPerKm) {
      haulingCostPerCuM = project.distanceFromOffice * project.haulingCostPerKm;
    }

    const templateIds = Array.from(new Set(boqItems.map((item: any) => item.templateId?.toString()).filter(Boolean)));
    const templates = await DUPATemplate.find({ _id: { $in: templateIds } }).lean();
    const templateMap = new Map<string, any>(templates.map((template: any) => [template._id.toString(), template]));

    const equipmentIds = new Set<string>();
    const materialCodes = new Set<string>();
    templates.forEach((template: any) => {
      template.equipmentTemplate?.forEach((equip: any) => {
        if (equip.equipmentId) equipmentIds.add(equip.equipmentId.toString());
      });
      template.materialTemplate?.forEach((mat: any) => {
        if (mat.materialCode) materialCodes.add(mat.materialCode.toString());
      });
    });

    const equipmentDocs = equipmentIds.size > 0
      ? await Equipment.find({ _id: { $in: Array.from(equipmentIds) } }).lean()
      : [];
    const equipmentMap = new Map<string, any>(equipmentDocs.map((item: any) => [item._id.toString(), item]));

    const materialDocs = materialCodes.size > 0
      ? await Material.find({ materialCode: { $in: Array.from(materialCodes) } }).lean()
      : [];
    const materialMap = new Map<string, any>(materialDocs.map((item: any) => [item.materialCode, item]));

    const materialPriceMap = new Map<string, { cmpd?: any; canvass?: any }>();
    if (project.cmpdVersion && project.projectLocation && materialCodes.size > 0) {
      const materialPrices = await MaterialPrice.find({
        materialCode: { $in: Array.from(materialCodes) },
        cmpd_version: project.cmpdVersion,
        location: project.projectLocation,
        isActive: true,
      }).sort({ effectiveDate: -1 }).lean();

      for (const price of materialPrices) {
        const key = `${price.materialCode}|${price.location}|${price.cmpd_version}`;
        const source = price.priceSource || 'cmpd';
        const existing = materialPriceMap.get(key) || {};
        if (source === 'canvass') {
          if (!existing.canvass) existing.canvass = price;
        } else {
          if (!existing.cmpd) existing.cmpd = price;
        }
        materialPriceMap.set(key, existing);
      }
    }

    let updatedCount = 0;

    for (const item of boqItems) {
      const template = item.templateId ? templateMap.get(item.templateId.toString()) : null;
      if (!template) continue;

      const laborItems = [] as any[];
      let laborCost = 0;
      for (const labor of template.laborTemplate || []) {
        const rateField = laborRateMap[labor.designation] || labor.designation;
        const hourlyRate = (laborRates as any)[rateField] || 0;
        const amount = labor.noOfPersons * labor.noOfHours * hourlyRate;
        laborCost += amount;
        laborItems.push({
          designation: labor.designation,
          noOfPersons: labor.noOfPersons,
          noOfHours: labor.noOfHours,
          hourlyRate,
          amount,
        });
      }

      const equipmentItems = [] as any[];
      let equipmentCost = 0;
      for (const equip of template.equipmentTemplate || []) {
        let hourlyRate = 0;
        if (equip.equipmentId) {
          const equipment = equipmentMap.get(equip.equipmentId.toString());
          hourlyRate = equipment?.hourlyRate || 0;
        }
        const amount = equip.noOfUnits * equip.noOfHours * hourlyRate;
        equipmentCost += amount;
        equipmentItems.push({
          equipmentId: equip.equipmentId,
          description: equip.description,
          noOfUnits: equip.noOfUnits,
          noOfHours: equip.noOfHours,
          hourlyRate,
          amount,
        });
      }

      const includeMinorTools = template.includeMinorTools === true;
      const minorToolsPercentage = typeof template.minorToolsPercentage === 'number'
        ? template.minorToolsPercentage
        : 10;
      const minorToolsCost = includeMinorTools ? laborCost * (minorToolsPercentage / 100) : 0;
      if (includeMinorTools) {
        equipmentItems.push({
          equipmentId: undefined,
          description: `Minor Tools (${minorToolsPercentage}% of Labor Cost)`,
          noOfUnits: 1,
          noOfHours: 1,
          hourlyRate: minorToolsCost,
          amount: minorToolsCost,
        });
        equipmentCost += minorToolsCost;
      }

      const materialItems = [] as any[];
      let materialCost = 0;
      for (const mat of template.materialTemplate || []) {
        let basePrice = 0;
        let priceSource: 'cmpd' | 'canvass' | 'missing' = 'missing';
        let requiresCanvass = false;
        const materialCode = mat.materialCode ? mat.materialCode.toString() : '';

        if (project.cmpdVersion && project.projectLocation && materialCode) {
          const key = `${materialCode}|${project.projectLocation}|${project.cmpdVersion}`;
          const priceEntry = materialPriceMap.get(key);
          const cmpdPrice = priceEntry?.cmpd;
          const canvassPrice = priceEntry?.canvass;
          if (cmpdPrice) {
            basePrice = cmpdPrice.unitCost;
            priceSource = 'cmpd';
          } else if (canvassPrice) {
            basePrice = canvassPrice.unitCost;
            priceSource = 'canvass';
          } else {
            requiresCanvass = true;
          }
        } else {
          requiresCanvass = true;
        }

        let unitCost = basePrice;
        const materialDoc = materialMap.get(materialCode);
        const includeHauling = basePrice > 0 && materialDoc?.includeHauling !== false && haulingCostPerCuM > 0;
        if (includeHauling) {
          unitCost += haulingCostPerCuM;
        }

        const quantity = mat.quantity || 0;
        const amount = quantity * unitCost;
        materialCost += amount;

        materialItems.push({
          materialCode: materialCode || '',
          description: mat.description,
          unit: mat.unit,
          quantity,
          basePrice,
          haulingCost: includeHauling ? haulingCostPerCuM : 0,
          unitCost,
          amount,
          priceSource,
          requiresCanvass,
        });
      }

      const directCost = laborCost + equipmentCost + materialCost;
      const ocmCost = directCost * (template.ocmPercentage / 100);
      const cpCost = directCost * (template.cpPercentage / 100);
      const subtotalWithMarkup = directCost + ocmCost + cpCost;
      const vatCost = subtotalWithMarkup * (template.vatPercentage / 100);
      const totalCost = subtotalWithMarkup + vatCost;
      const unitCost = totalCost;
      const totalAmount = totalCost * (item.quantity || 1);

      await ProjectBOQ.findByIdAndUpdate(item._id, {
        $set: {
          laborItems,
          equipmentItems,
          materialItems,
          directCost,
          ocmPercentage: template.ocmPercentage,
          ocmCost,
          cpPercentage: template.cpPercentage,
          cpCost,
          subtotalWithMarkup,
          vatPercentage: template.vatPercentage,
          vatCost,
          totalCost,
          unitCost,
          totalAmount,
        }
      });

      updatedCount += 1;
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `Recalculated ${updatedCount} BOQ item(s)`,
    });
  } catch (error: any) {
    console.error('Error recalculating BOQ items:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to recalculate BOQ items' },
      { status: 500 }
    );
  }
}
