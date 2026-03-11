import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import CalcRunModel from '@/models/CalcRun';
import { v4 as uuidv4 } from 'uuid';
import { calculateStructuralElements } from '@/lib/logic/calculateElements';
import { calculateFinishingWorks } from '@/lib/logic/calculateFinishes';
import { calculateRoofing } from '@/lib/logic/calculateRoofing';
import { calculateScheduleItems } from '@/lib/logic/calculateScheduleItems';
import type { TakeoffLine } from '@/types';

// POST /api/projects/[id]/takeoff - Generate takeoff for a project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const project = await Project.findById(id);
    
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Generate a new calc run
    const runId = uuidv4();
    const allTakeoffLines: TakeoffLine[] = [];
    const errors: string[] = [];

    // Extract grid arrays (handle both new and legacy formats)
    const gridX = project.grid?.xLines || project.gridX || [];
    const gridY = project.grid?.yLines || project.gridY || [];

    // Summary accumulators
    let totalConcreteVolume = 0;
    let totalRebarWeight = 0;
    let totalFormworkArea = 0;

    // ===================================
    // 1. STRUCTURAL ELEMENTS CALCULATION
    // ===================================
    if (project.elementInstances && project.elementInstances.length > 0) {
      try {
        const elementsResult = calculateStructuralElements({
          elementInstances: project.elementInstances,
          elementTemplates: project.elementTemplates || [],
          levels: project.levels || [],
          gridX,
          gridY,
          settings: project.settings,
        });

        allTakeoffLines.push(...elementsResult.takeoffLines);
        errors.push(...elementsResult.errors);

        totalConcreteVolume += elementsResult.summary.totalConcreteVolume;
        totalRebarWeight += elementsResult.summary.totalRebarWeight;
        totalFormworkArea += elementsResult.summary.totalFormworkArea;

        console.log(`✓ Structural elements calculated: ${elementsResult.takeoffLines.length} takeoff lines`);
      } catch (err) {
        const errorMsg = `Structural elements calculation failed: ${err instanceof Error ? err.message : String(err)}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // ===================================
    // 2. FINISHING WORKS CALCULATION
    // ===================================
    if (project.spaces && project.spaces.length > 0) {
      try {
        const finishesResult = calculateFinishingWorks({
          spaces: project.spaces,
          openings: project.openings || [],
          finishTypes: project.finishTypes || [],
          assignments: project.spaceFinishAssignments || [],
          wallSurfaces: project.wallSurfaces || [],
          wallAssignments: project.wallSurfaceFinishAssignments || [],
          levels: project.levels || [],
          gridX,
          gridY,
        });

        allTakeoffLines.push(...finishesResult.takeoffLines);
        errors.push(...finishesResult.errors);

        console.log(`✓ Finishes calculated: ${finishesResult.takeoffLines.length} takeoff lines`);
      } catch (err) {
        const errorMsg = `Finishes calculation failed: ${err instanceof Error ? err.message : String(err)}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // ===================================
    // 3. ROOFING CALCULATION
    // ===================================
    if (project.roofPlanes && project.roofPlanes.length > 0) {
      try {
        const roofingResult = await calculateRoofing(project as any);

        allTakeoffLines.push(...roofingResult.takeoffLines);
        errors.push(...roofingResult.errors);

        console.log(`✓ Roofing calculated: ${roofingResult.takeoffLines.length} takeoff lines`);
      } catch (err) {
        const errorMsg = `Roofing calculation failed: ${err instanceof Error ? err.message : String(err)}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // ===================================
    // 4. SCHEDULE ITEMS CALCULATION
    // ===================================
    if (project.scheduleItems && project.scheduleItems.length > 0) {
      try {
        const scheduleResult = await calculateScheduleItems(project as any);

        allTakeoffLines.push(...scheduleResult.takeoffLines);
        errors.push(...scheduleResult.errors);

        console.log(`✓ Schedule items calculated: ${scheduleResult.takeoffLines.length} takeoff lines`);
      } catch (err) {
        const errorMsg = `Schedule items calculation failed: ${err instanceof Error ? err.message : String(err)}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // ===================================
    // SUMMARY
    // ===================================
    const summary = {
      totalConcrete: totalConcreteVolume, // m³
      totalRebar: totalRebarWeight, // kg
      totalFormwork: totalFormworkArea, // m²
      takeoffLineCount: allTakeoffLines.length,
      boqLineCount: 0, // BOQ is generated separately via /api/projects/[id]/boq
    };

    // Create calc run record
    const calcRun = new CalcRunModel({
      runId,
      projectId: id,
      timestamp: new Date(),
      status: 'completed', // 'running', 'completed', or 'failed'
      summary,
      takeoffLines: allTakeoffLines,
      boqLines: [], // BOQ is generated separately when user selects this run
      errors,
    });

    await calcRun.save();

    return NextResponse.json({
      success: true,
      runId,
      takeoffLines: allTakeoffLines,
      summary,
      errors,
      message: errors.length > 0 
        ? `Takeoff generated with ${errors.length} warning(s)` 
        : 'Takeoff generated successfully'
    });
  } catch (error: any) {
    console.error('Error generating takeoff:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate takeoff' },
      { status: 500 }
    );
  }
}
