import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import CalcRunModel from '@/models/CalcRun';
import { generateBOQFromTakeoffLines } from '@/lib/logic/generateBOQ';
import type { TakeoffLine } from '@/types';

// POST /api/projects/:id/boq - Generate BOQ from CalcRun or takeoff lines
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { takeoffLines, runId } = body as { takeoffLines?: TakeoffLine[]; runId?: string };

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    let linesToProcess: TakeoffLine[];
    let targetCalcRun: any = null;

    // Option 1: Generate from existing CalcRun
    if (runId) {
      const calcRun = await CalcRunModel.findOne({ runId, projectId: id });
      if (!calcRun) {
        return NextResponse.json(
          { error: `CalcRun with runId "${runId}" not found` },
          { status: 404 }
        );
      }
      
      if (!calcRun.takeoffLines || calcRun.takeoffLines.length === 0) {
        return NextResponse.json(
          { error: 'CalcRun has no takeoff lines' },
          { status: 400 }
        );
      }

      linesToProcess = calcRun.takeoffLines;
      targetCalcRun = calcRun;
      console.log(`Generating BOQ from CalcRun ${runId} (${linesToProcess.length} takeoff lines)`);
    }
    // Option 2: Generate from provided takeoff lines
    else if (takeoffLines && Array.isArray(takeoffLines)) {
      linesToProcess = takeoffLines;
      console.log(`Generating BOQ from provided takeoff lines (${linesToProcess.length} lines)`);
    }
    // Error: No input provided
    else {
      return NextResponse.json(
        { error: 'Either runId or takeoffLines must be provided' },
        { status: 400 }
      );
    }

    // Generate BOQ using the service
    const result = generateBOQFromTakeoffLines(linesToProcess, project);

    // Check for critical errors
    if (result.errors.length > 0 && result.boqLines.length === 0) {
      return NextResponse.json(
        { 
          error: 'Failed to generate BOQ',
          details: result.errors 
        },
        { status: 500 }
      );
    }

    // Update CalcRun with generated BOQ
    if (targetCalcRun) {
      targetCalcRun.boqLines = result.boqLines;
      if (targetCalcRun.summary) {
        targetCalcRun.summary.boqLineCount = result.boqLines.length;
      }
      await targetCalcRun.save();
      console.log(`✓ Updated CalcRun ${runId} with ${result.boqLines.length} BOQ lines`);
    }

    return NextResponse.json({
      success: true,
      runId: targetCalcRun?.runId,
      boqLines: result.boqLines,
      summary: result.summary,
      warnings: result.warnings.length > 0 ? result.warnings : undefined,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });

  } catch (error) {
    console.error('POST /api/projects/:id/boq error:', error);
    return NextResponse.json(
      { error: 'Failed to generate BOQ', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
