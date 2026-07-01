/**
 * CostEstimate API Routes
 * 
 * POST /api/projects/[id]/cost-estimates - Create new cost estimate
 * GET  /api/projects/[id]/cost-estimates - List all cost estimates for project
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import CostEstimate from '@/models/CostEstimate';
import BOQ from '@/models/BOQ';  // NEW: Simple BOQ database
import ProjectBOQ from '@/models/ProjectBOQ';  // LEGACY: Keep for backward compatibility
import Project from '@/models/Project';
import { calculateEstimate } from '@/lib/services/estimateCalculator';
import mongoose from 'mongoose';
import { getSessionUser, hasRequiredRole } from '@/lib/auth/session';
import { AUDITOR_ROLE, PROJECT_READ_ROLES, PROJECT_WRITE_ROLES } from '@/lib/auth/roles';

const DEFAULT_LUBE_PRICE_PER_LITER = 280;

/**
 * POST /api/projects/[id]/cost-estimates
 * Create a new cost estimate for a project
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasRequiredRole(user, PROJECT_WRITE_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('[Cost Estimate] Starting cost estimate creation...');
    await dbConnect();
    
    const { id: projectId } = await params;
    console.log('[Cost Estimate] Project ID:', projectId);
    
    // Validate project exists
    const project = await Project.findById(projectId);
    if (!project) {
      console.error('[Cost Estimate] Project not found:', projectId);
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    console.log('[Cost Estimate] Request body:', body);
    
    // Validate required fields
    if (!body.location) {
      console.error('[Cost Estimate] Missing location');
      return NextResponse.json(
        { error: 'location is required for labor rates' },
        { status: 400 }
      );
    }
    
    if (!body.boqSource) {
      console.error('[Cost Estimate] Missing boqSource');
      return NextResponse.json(
        { error: 'boqSource is required (boqDatabase, projectBOQ, or manual)' },
        { status: 400 }
      );
    }

    const resolvedDistrict = body.district || project.district;
    if (!resolvedDistrict) {
      console.error('[Cost Estimate] Missing district');
      return NextResponse.json(
        { error: 'district is required for labor-rate and project pricing context' },
        { status: 400 }
      );
    }

    const resolvedCmpdVersion = body.cmpdVersion || project.cmpdVersion;
    if (!resolvedCmpdVersion) {
      console.error('[Cost Estimate] Missing cmpdVersion');
      return NextResponse.json(
        { error: 'cmpdVersion is required for CMPD pricing' },
        { status: 400 }
      );
    }

    const resolvedLaborVersion = body.laborVersion || project.manualPowConfig?.laborVersion || project.laborVersion || '';
    const resolvedEquipmentRateEdition = body.equipmentRateEdition || project.manualPowConfig?.equipmentRateEdition || '';
    const resolvedEquipmentRateMode = body.withFuelAdjustment
      ? 'variable_fuel_lube'
      : (body.equipmentRateMode || project.manualPowConfig?.equipmentRateMode || 'fixed');
    const resolvedFuelPricePerLiter = resolvedEquipmentRateMode === 'variable_fuel_lube'
      ? Number(body.fuelPricePerLiter ?? project.manualPowConfig?.fuelPricePerLiter ?? 0)
      : 0;
    const resolvedLubePricePerLiter = resolvedEquipmentRateMode === 'variable_fuel_lube'
      ? Number(body.lubePricePerLiter ?? project.manualPowConfig?.lubePricePerLiter ?? DEFAULT_LUBE_PRICE_PER_LITER)
      : 0;

    if (resolvedEquipmentRateMode === 'variable_fuel_lube' && !resolvedEquipmentRateEdition) {
      return NextResponse.json(
        { error: 'ACEL edition is required when fuel adjustment is enabled' },
        { status: 400 }
      );
    }

    if (body.boqSource === 'manual') {
      console.log('[Cost Estimate] Configuring manual Program of Works');
      await ProjectBOQ.deleteMany({ projectId });
      project.powMode = 'manual';
      if (resolvedLaborVersion) {
        project.laborVersion = resolvedLaborVersion;
      }
      project.manualPowConfig = {
        laborLocation: body.location,
        cmpdVersion: resolvedCmpdVersion,
        equipmentRateEdition: resolvedEquipmentRateEdition,
        equipmentRateMode: resolvedEquipmentRateMode,
        fuelPricePerLiter: resolvedFuelPricePerLiter,
        lubePricePerLiter: resolvedLubePricePerLiter,
        laborVersion: resolvedLaborVersion,
        district: resolvedDistrict,
        vatPercentage: body.vatPercentage ?? 12,
        notes: body.manualNotes || '',
      };
      project.manualPowMetadata = {
        lastUpdatedAt: new Date(),
        lastUpdatedBy: body.createdBy || 'manual-boq',
        notes: body.manualNotes || undefined,
      };
      await project.save();

      return NextResponse.json(
        {
          success: true,
          manualMode: true,
          projectId,
          powMode: project.powMode,
          manualPowConfig: project.manualPowConfig,
          message: 'Manual Program of Works enabled. Continue in the workspace to add BOQ items.'
        },
        { status: 201 }
      );
    }

    let boqLines: any[] = [];
    let takeoffVersionId: mongoose.Types.ObjectId | null = null;
    
    console.log('[Cost Estimate] BOQ Source:', body.boqSource);
    
    // User-selected BOQ source
    if (body.boqSource === 'boqDatabase') {
      // Option 1: Use BOQ Database (NEW - Simple persistent BOQ from takeoff)
      const boqVersion = body.boqVersion || null;
      
      console.log('[Cost Estimate] Fetching BOQ from database, version:', boqVersion || 'latest');
      
      const query: any = { projectId };
      if (boqVersion) {
        query.version = boqVersion;
      }
      
      const boqItems = await BOQ.find(query).sort({ payItemNumber: 1 }).lean();
      console.log('[Cost Estimate] Found BOQ items:', boqItems?.length || 0);
      
      if (!boqItems || boqItems.length === 0) {
        console.error('[Cost Estimate] BOQ database is empty');
        return NextResponse.json(
          { error: 'BOQ database is empty. Please save BOQ from takeoff first.' },
          { status: 400 }
        );
      }
      
      // Convert BOQ to BOQ line format
      boqLines = boqItems.map(item => ({
        payItemNumber: item.payItemNumber,
        description: item.payItemDescription,
        unit: item.unit,
        quantity: item.quantity,
        part: item.part,
      }));
      console.log(`[Cost Estimate] Using BOQ Database (${boqLines.length} items, version ${boqVersion || 'latest'})`);
    }
    else if (body.boqSource === 'projectBOQ') {
      // Option 2: Use persistent ProjectBOQ (LEGACY - for backward compatibility)
      const projectBOQItems = await ProjectBOQ.find({ projectId }).lean();
      
      if (!projectBOQItems || projectBOQItems.length === 0) {
        return NextResponse.json(
          { error: 'Project BOQ is empty. Please add BOQ items to the project first.' },
          { status: 400 }
        );
      }
      
      // Convert ProjectBOQ to BOQ line format
      boqLines = projectBOQItems.map(item => ({
        payItemNumber: item.payItemNumber,
        description: item.payItemDescription,
        unit: item.unitOfMeasurement,
        quantity: item.quantity,
        part: item.payItemNumber.split(' ')[0], // Extract part from pay item number
      }));
      console.log(`Using ProjectBOQ (${boqLines.length} items)`);
    }
    else {
      return NextResponse.json(
        { error: 'Invalid boqSource. Must be "projectBOQ", "boqDatabase", or "manual"' },
        { status: 400 }
      );
    }
    
    // Validate we have BOQ data
    if (!boqLines || boqLines.length === 0) {
      console.error('[Cost Estimate] No BOQ lines found');
      return NextResponse.json(
        { error: 'No BOQ data found. Please add BOQ items first.' },
        { status: 400 }
      );
    }
    
    console.log('[Cost Estimate] BOQ lines ready:', boqLines.length);
    console.log('[Cost Estimate] Sample BOQ line:', boqLines[0]);
    
    // Generate estimate number
    const estimateNumber = await CostEstimate.generateEstimateNumber();
    console.log('[Cost Estimate] Generated estimate number:', estimateNumber);
    
    const boqSourceRef = null;

    // Calculate estimate lines from BOQ
    console.log('[Cost Estimate] Starting calculation...');
    console.log('[Cost Estimate] Calculation config:', {
      location: body.location,
      district: resolvedDistrict,
      cmpdVersion: resolvedCmpdVersion,
      equipmentRateEdition: resolvedEquipmentRateEdition,
      equipmentRateMode: resolvedEquipmentRateMode,
      fuelPricePerLiter: resolvedFuelPricePerLiter,
    });
    
    const calculationResult = await calculateEstimate(
      boqLines,
      {
        takeoffVersionId: projectId,
        location: body.location,
        district: resolvedDistrict,
        laborVersion: resolvedLaborVersion,
        cmpdVersion: resolvedCmpdVersion,
        equipmentRateEdition: resolvedEquipmentRateEdition,
        equipmentRateMode: resolvedEquipmentRateMode,
        fuelPricePerLiter: resolvedFuelPricePerLiter,
        lubePricePerLiter: resolvedLubePricePerLiter,
        ocmPercentage: body.ocmPercentage ?? 12,
        cpPercentage: body.cpPercentage ?? 10,
        vatPercentage: body.vatPercentage ?? 12,
        haulingConfig: body.haulingConfig ?? project.haulingConfig,
        distanceFromOffice: body.distanceFromOffice ?? project.distanceFromOffice,
        haulingCostPerKm: body.haulingCostPerKm ?? project.haulingCostPerKm,
      }
    );
    
    console.log('[Cost Estimate] Calculation complete');
    console.log('[Cost Estimate] Estimate lines:', calculationResult.estimateLines?.length || 0);
    
    // Create cost estimate with calculated data
    const costEstimate = new CostEstimate({
      projectId,
      takeoffVersionId: takeoffVersionId,
      estimateNumber,
      estimateName: body.name || body.estimateName || `Estimate ${estimateNumber}`,
      estimateType: body.estimateType || 'preliminary',
      description: body.description,
      boqSource: body.boqSource,
      boqVersion: body.boqSource === 'boqDatabase' && typeof body.boqVersion === 'number' ? body.boqVersion : undefined,
      boqSourceRef,
      
      // Pricing configuration
      location: body.location,
      district: resolvedDistrict,
      cmpdVersion: resolvedCmpdVersion,
      equipmentRateEdition: resolvedEquipmentRateEdition,
      equipmentRateMode: resolvedEquipmentRateMode,
      fuelPricePerLiter: resolvedFuelPricePerLiter,
      lubePricePerLiter: resolvedLubePricePerLiter,
      laborVersion: resolvedLaborVersion,
      effectiveDate: body.effectiveDate || new Date(),
      
      // Markup percentages (use the actual percentages calculated by estimateCalculator)
      ocmPercentage: calculationResult.usedMarkups.ocmPercentage,
      cpPercentage: calculationResult.usedMarkups.cpPercentage,
      vatPercentage: calculationResult.usedMarkups.vatPercentage,
      
      // Hauling configuration (snapshot from project)
      haulingCostPerKm: body.haulingCostPerKm ?? project.haulingCostPerKm,
      distanceFromOffice: body.distanceFromOffice ?? project.distanceFromOffice,
      haulingConfig: body.haulingConfig ?? project.haulingConfig,
      
      // Status
      status: 'draft',
      createdBy: body.createdBy || 'system',
      
      // Calculated data
      estimateLines: calculationResult.estimateLines,
      laborRateSnapshot: calculationResult.laborRateSnapshot,
      costSummary: calculationResult.costSummary,
      
      // Comparison metadata
      baseEstimateId: body.baseEstimateId,
    });
    
    await costEstimate.save();
    
    // Set as active cost estimate if this is the first one for the project
    const estimateCount = await CostEstimate.countDocuments({ projectId });
    if (estimateCount === 1) {
      project.activeCostEstimateId = costEstimate._id as mongoose.Types.ObjectId;
      if (resolvedLaborVersion && !project.laborVersion) {
        project.laborVersion = resolvedLaborVersion;
      }
      await project.save();
    }
    
    const warningMessage = calculationResult.missingMaterialPrices.length > 0
      ? 'Estimate created with missing CMPD prices. Add canvass prices to finalize.'
      : undefined;

    return NextResponse.json({
      success: true,
      data: costEstimate,
      unmappedLines: calculationResult.unmappedLines,
      missingMaterialPrices: calculationResult.missingMaterialPrices,
      warning: warningMessage,
      message: 'Cost estimate created successfully'
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('[Cost Estimate] Error creating cost estimate:', error);
    console.error('[Cost Estimate] Error stack:', error.stack);
    console.error('[Cost Estimate] Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
    });
    return NextResponse.json(
      { error: 'Failed to create cost estimate', details: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[id]/cost-estimates
 * Get all cost estimates for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasRequiredRole(user, PROJECT_READ_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const cmpdVersion = searchParams.get('cmpdVersion');
    
    // Validate project exists
    const project = await Project.findById(projectId).select('activeCostEstimateId finalCostEstimateId');
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Get estimates with optional filtering
    const query: any = { projectId };
    const isAuditorOnly = user.roles?.includes(AUDITOR_ROLE)
      && !user.roles?.includes('admin')
      && !user.roles?.includes('master_admin')
      && !user.roles?.includes('project_creator');
    if (isAuditorOnly) {
      if (project.finalCostEstimateId) {
        query._id = project.finalCostEstimateId;
      } else {
        query._id = null;
      }
    }
    if (cmpdVersion) {
      query.cmpdVersion = cmpdVersion;
    }
    const estimates = await CostEstimate.find(query).lean();
    
    // Format estimates to match frontend expectations
    const finalId = project.finalCostEstimateId ? String(project.finalCostEstimateId) : '';
    const formattedEstimates = estimates.map(est => ({
      ...est,
      name: est.estimateName,
      isFinalSubmission: finalId ? String((est as any)._id) === finalId : Boolean((est as any).isFinalSubmission),
    }));
    
    return NextResponse.json({
      success: true,
      estimates: formattedEstimates,
      count: formattedEstimates.length,
      projectId,
      activeCostEstimateId: project.activeCostEstimateId,
      finalCostEstimateId: project.finalCostEstimateId,
    });
    
  } catch (error: any) {
    console.error('Error fetching cost estimates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cost estimates', details: error.message },
      { status: 500 }
    );
  }
}
