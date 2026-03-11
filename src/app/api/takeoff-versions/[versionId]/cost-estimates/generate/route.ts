/**
 * Generate Cost Estimate from Takeoff Version API
 * 
 * POST /api/takeoff-versions/[versionId]/cost-estimates/generate
 * 
 * Generates a fully-priced cost estimate from a takeoff version by:
 * 1. Creating a new CostEstimate record
 * 2. Processing each BOQ line item
 * 3. Instantiating DUPA templates with district/CMPD-specific pricing
 * 4. Creating EstimateRateItem records for each BOQ line
 * 5. Calculating cost summary
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import TakeoffVersion from '@/models/TakeoffVersion';
import CostEstimate from '@/models/CostEstimate';
import EstimateRateItem from '@/models/EstimateRateItem';
import Project from '@/models/Project';
import DUPATemplate from '@/models/DUPATemplate';
import MaterialPrice, { IMaterialPrice } from '@/models/MaterialPrice';
import LaborRate from '@/models/LaborRate';
import Equipment from '@/models/Equipment';
import mongoose from 'mongoose';

/**
 * POST /api/takeoff-versions/[versionId]/cost-estimates/generate
 * Generate a cost estimate from a takeoff version
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { versionId: string } }
) {
  try {
    await dbConnect();
    
    const { versionId } = params;
    const body = await request.json();
    
    // Validate takeoff version exists
    const takeoffVersion = await TakeoffVersion.findById(versionId);
    if (!takeoffVersion) {
      return NextResponse.json(
        { error: 'Takeoff version not found' },
        { status: 404 }
      );
    }
    
    // Get project
    const project = await Project.findById(takeoffVersion.projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Validate required pricing configuration
    const cmpdVersion = body.cmpdVersion || project.cmpdVersion;
    const district = body.district || project.district;
    const location = body.location || project.projectLocation;
    
    if (!cmpdVersion) {
      return NextResponse.json(
        { error: 'CMPD version is required for pricing' },
        { status: 400 }
      );
    }
    
    if (!district) {
      return NextResponse.json(
        { error: 'District is required for pricing' },
        { status: 400 }
      );
    }
    
    // Generate estimate number
    const estimateNumber = await CostEstimate.generateEstimateNumber();
    
    // Create cost estimate record
    const costEstimate = new CostEstimate({
      projectId: project._id,
      takeoffVersionId: versionId,
      boqSource: 'takeoffVersion',
      boqSourceRef: takeoffVersion._id,
      estimateNumber,
      estimateName: body.estimateName || `${cmpdVersion} - ${district}`,
      estimateType: body.estimateType || 'preliminary',
      description: body.description || `Generated from takeoff version ${takeoffVersion.versionNumber}`,
      
      location,
      district,
      cmpdVersion,
      effectiveDate: new Date(),
      
      ocmPercentage: body.ocmPercentage ?? 10,
      cpPercentage: body.cpPercentage ?? 10,
      vatPercentage: body.vatPercentage ?? 12,
      
      haulingCostPerKm: body.haulingCostPerKm ?? project.haulingCostPerKm,
      distanceFromOffice: body.distanceFromOffice ?? project.distanceFromOffice,
      haulingConfig: body.haulingConfig ?? project.haulingConfig,
      
      status: 'draft',
      createdBy: body.createdBy || 'system',
      
      costSummary: {
        totalDirectCost: 0,
        totalOCM: 0,
        totalCP: 0,
        subtotalWithMarkup: 0,
        totalVAT: 0,
        grandTotal: 0,
        rateItemsCount: 0,
      },
    });
    
    await costEstimate.save();
    const costEstimateId = costEstimate._id as mongoose.Types.ObjectId;
    
    // Process BOQ lines
    const boqLines = takeoffVersion.boqLines || [];
    let processedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    for (const boqLine of boqLines) {
      try {
        // Find DUPA template for this pay item
        const dupaTemplate = await DUPATemplate.findOne({
          dpwhItemNumber: boqLine.payItemNumber
        });
        
        if (!dupaTemplate) {
          errors.push(`No DUPA template found for ${boqLine.payItemNumber}`);
          errorCount++;
          continue;
        }
        
        // Get labor rates for the location
        const laborRates = await LaborRate.find({ location }).lean();
        const laborRateMap = new Map(
          laborRates.map(lr => [lr.occupation, lr.hourlyRate])
        );
        
        // Get equipment rates
        const equipment = await Equipment.find().lean();
        const equipmentRateMap = new Map(
          equipment.map(eq => [eq.equipmentName, eq.rentalRatePerHour])
        );
        
        // Process labor items
        const laborItems = (dupaTemplate.laborItems || []).map((item: any) => ({
          designation: item.designation,
          noOfPersons: item.noOfPersons || 1,
          noOfHours: item.noOfHours || 0,
          hourlyRate: laborRateMap.get(item.designation) || 0,
          amount: (item.noOfPersons || 1) * (item.noOfHours || 0) * (laborRateMap.get(item.designation) || 0),
        }));
        
        // Process equipment items
        const equipmentItems = (dupaTemplate.equipmentItems || []).map((item: any) => ({
          description: item.description,
          noOfUnits: item.noOfUnits || 1,
          noOfHours: item.noOfHours || 0,
          hourlyRate: equipmentRateMap.get(item.description) || 0,
          amount: (item.noOfUnits || 1) * (item.noOfHours || 0) * (equipmentRateMap.get(item.description) || 0),
        }));
        
        // Process material items with district-specific pricing
        const materialItems = await Promise.all(
          (dupaTemplate.materialItems || []).map(async (item: any) => {
            let materialPrice = await MaterialPrice.findOne({
              materialCode: item.materialCode,
              district,
              cmpd_version: cmpdVersion,
              isActive: true,
              $or: [
                { priceSource: { $exists: false } },
                { priceSource: 'cmpd' }
              ]
            })
              .sort({ effectiveDate: -1 })
              .lean() as IMaterialPrice | null;

            let priceSource: 'cmpd' | 'canvass' | 'missing' = 'missing';
            let requiresCanvass = false;

            if (materialPrice) {
              priceSource = materialPrice.priceSource || 'cmpd';
            } else {
              materialPrice = await MaterialPrice.findOne({
                materialCode: item.materialCode,
                district,
                cmpd_version: cmpdVersion,
                isActive: true,
                priceSource: 'canvass'
              })
                .sort({ effectiveDate: -1 })
                .lean() as IMaterialPrice | null;

              if (materialPrice) {
                priceSource = 'canvass';
              }
            }

            if (!materialPrice) {
              requiresCanvass = true;
            }

            const unitCost = materialPrice?.unitCost || 0;
            const quantity = item.quantity || 0;
            
            return {
              materialCode: item.materialCode,
              description: item.description,
              unit: item.unit,
              quantity,
              unitCost,
              amount: quantity * unitCost,
              haulingIncluded: false,
              basePrice: unitCost,
              haulingCost: 0,
              priceSource,
              requiresCanvass,
            };
          })
        );
        
        // Create EstimateRateItem
        const rateItem = new EstimateRateItem({
          costEstimateId,
          projectId: project._id,
          payItemNumber: boqLine.payItemNumber,
          description: boqLine.description,
          unit: boqLine.unit,
          quantity: boqLine.quantity,
          
          laborItems,
          equipmentItems,
          materialItems,
          
          location,
          district,
          cmpdVersion,
          effectiveDate: new Date(),
          ratesAppliedAt: new Date(),
          
          sourceBoqLineId: boqLine._id?.toString(),
          dupaTemplateId: dupaTemplate._id,
          
          costBreakdown: {
            laborCost: 0,
            equipmentCost: 0,
            materialCost: 0,
            directCost: 0,
            ocmPercentage: costEstimate.ocmPercentage,
            ocmCost: 0,
            cpPercentage: costEstimate.cpPercentage,
            cpCost: 0,
            vatPercentage: costEstimate.vatPercentage,
            vatCost: 0,
            subtotalWithMarkup: 0,
            totalUnitCost: 0,
            totalAmount: 0,
          },
        });
        
        // Calculate costs
        rateItem.calculateCosts(
          costEstimate.ocmPercentage,
          costEstimate.cpPercentage,
          costEstimate.vatPercentage
        );
        
        await rateItem.save();
        processedCount++;
        
      } catch (error: any) {
        console.error(`Error processing BOQ line ${boqLine.payItemNumber}:`, error);
        errors.push(`Error processing ${boqLine.payItemNumber}: ${error.message}`);
        errorCount++;
      }
    }
    
    // Calculate and update cost summary
    const costSummary = await EstimateRateItem.getCostSummary(costEstimateId.toString());
    costEstimate.costSummary = costSummary;
    await costEstimate.save();
    
    return NextResponse.json({
      success: true,
      data: costEstimate,
      processing: {
        totalBoqLines: boqLines.length,
        processed: processedCount,
        errors: errorCount,
        errorDetails: errors.length > 0 ? errors : undefined,
      },
      message: `Cost estimate generated successfully. Processed ${processedCount}/${boqLines.length} BOQ lines.`
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error generating cost estimate:', error);
    return NextResponse.json(
      { error: 'Failed to generate cost estimate', details: error.message },
      { status: 500 }
    );
  }
}
