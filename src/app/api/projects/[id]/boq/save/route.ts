import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import BOQ, { IBOQ } from '@/models/BOQ';
import CalcRun from '@/models/CalcRun';
import Project from '@/models/Project';
import mongoose from 'mongoose';

/**
 * Extract DPWH part letter from item number
 * Examples: "900 (1) a" → "D", "1046 (3)" → "E", "800 (2)" → "C"
 */
function extractDPWHPart(itemNumber: string): string {
  const prefix = parseInt(itemNumber.match(/^(\d+)/)?.[1] || '0', 10);
  
  if (prefix >= 800 && prefix < 900) return 'C';  // EARTHWORK
  if (prefix >= 900 && prefix < 1000) return 'D';  // CONCRETE WORKS
  if (prefix >= 1000 && prefix < 1100) return 'E';  // FINISHING WORKS
  if (prefix >= 1100 && prefix < 1500) return 'F';  // METAL & ELECTRICAL
  if (prefix >= 1500) return 'G';  // MARINE & OTHER
  return 'C';  // Default fallback
}

/**
 * POST /api/projects/[id]/boq/save
 * 
 * Saves CalcRun.boqLines to persistent BOQ database
 * 
 * Body:
 * {
 *   calcRunId: string,
 *   action: 'update' | 'version',  // Update existing or create new version
 *   versionName?: string           // Optional custom version name
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[BOQ Save] Starting BOQ save process...');
    await dbConnect();
    const { id: projectId } = await params;
    const body = await request.json();
    
    console.log('[BOQ Save] Request data:', { projectId, body });
    
    const { calcRunId, action, versionName } = body;
    
    // Validate input
    if (!calcRunId) {
      console.error('[BOQ Save] Missing calcRunId');
      return NextResponse.json(
        { error: 'calcRunId is required' },
        { status: 400 }
      );
    }
    
    if (!action || !['update', 'version'].includes(action)) {
      console.error('[BOQ Save] Invalid action:', action);
      return NextResponse.json(
        { error: 'action must be "update" or "version"' },
        { status: 400 }
      );
    }
    
    // Verify project exists
    console.log('[BOQ Save] Finding project:', projectId);
    const project = await Project.findById(projectId);
    if (!project) {
      console.error('[BOQ Save] Project not found:', projectId);
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Get CalcRun with BOQ data
    console.log('[BOQ Save] Finding CalcRun:', calcRunId);
    const calcRun = await CalcRun.findOne({ runId: calcRunId });
    if (!calcRun) {
      console.error('[BOQ Save] CalcRun not found:', calcRunId);
      return NextResponse.json(
        { error: 'CalcRun not found' },
        { status: 404 }
      );
    }
    
    console.log('[BOQ Save] CalcRun found, BOQ lines count:', calcRun.boqLines?.length || 0);
    
    if (!calcRun.boqLines || calcRun.boqLines.length === 0) {
      console.error('[BOQ Save] CalcRun has no BOQ lines');
      return NextResponse.json(
        { error: 'CalcRun has no BOQ lines. Please generate BOQ first.' },
        { status: 400 }
      );
    }
    
    let savedCount = 0;
    const updatedCount = 0;
    let versionNumber = 1;
    
    console.log('[BOQ Save] Starting save process, action:', action);
    
    if (action === 'update') {
      // UPDATE MODE: Replace existing BOQ items
      
      // Delete existing BOQ for this project
      const deleteResult = await BOQ.deleteMany({ projectId });
      console.log(`[BOQ Save] Deleted ${deleteResult.deletedCount} existing BOQ items`);
      
      // Create new BOQ items
      console.log('[BOQ Save] Creating BOQ items...');
      for (const boqLine of calcRun.boqLines) {
        try {
          const part = extractDPWHPart(boqLine.dpwhItemNumberRaw);
          console.log(`[BOQ Save] Processing: ${boqLine.dpwhItemNumberRaw} → Part: ${part}`);
          
          await BOQ.create({
            projectId,
            payItemNumber: boqLine.dpwhItemNumberRaw,
            payItemDescription: boqLine.description,
            quantity: boqLine.quantity,
            unit: boqLine.unit,
            part,
            sourceTakeoffLineIds: boqLine.sourceTakeoffLineIds || [],
            sourceCalcRunId: calcRun._id,
            version: 1,
            versionName: versionName || 'Current BOQ',
            createdFrom: 'takeoff'
          });
          savedCount++;
        } catch (itemError: any) {
          console.error('[BOQ Save] Failed to create BOQ item:', {
            item: boqLine.dpwhItemNumberRaw,
            error: itemError.message,
            stack: itemError.stack
          });
          throw itemError;
        }
      }
      
      console.log(`[BOQ Save] Created ${savedCount} new BOQ items (update mode)`);
      
    } else {
      // VERSION MODE: Keep existing, create new version
      
      // Find highest version number
      console.log('[BOQ Save] Finding latest version...');
      const latestBOQ = await BOQ.findOne({ projectId })
        .sort({ version: -1 })
        .lean() as IBOQ | null;
      
      versionNumber = latestBOQ ? (latestBOQ.version || 1) + 1 : 1;
      console.log('[BOQ Save] New version number:', versionNumber);
      
      // Create new version
      console.log('[BOQ Save] Creating BOQ items for version', versionNumber);
      for (const boqLine of calcRun.boqLines) {
        try {
          const part = extractDPWHPart(boqLine.dpwhItemNumberRaw);
          
          await BOQ.create({
            projectId,
            payItemNumber: boqLine.dpwhItemNumberRaw,
            payItemDescription: boqLine.description,
            quantity: boqLine.quantity,
            unit: boqLine.unit,
            part,
            sourceTakeoffLineIds: boqLine.sourceTakeoffLineIds || [],
            sourceCalcRunId: calcRun._id,
            version: versionNumber,
            versionName: versionName || `BOQ Version ${versionNumber}`,
            createdFrom: 'takeoff'
          });
          savedCount++;
        } catch (itemError: any) {
          console.error('[BOQ Save] Failed to create BOQ item:', {
            item: boqLine.dpwhItemNumberRaw,
            error: itemError.message
          });
          throw itemError;
        }
      }
      
      console.log(`[BOQ Save] Created ${savedCount} new BOQ items (version ${versionNumber})`);
    }
    
    return NextResponse.json({
      success: true,
      action,
      itemsCreated: savedCount,
      itemsUpdated: updatedCount,
      version: versionNumber,
      message: action === 'update' 
        ? `Updated BOQ with ${savedCount} items`
        : `Created BOQ version ${versionNumber} with ${savedCount} items`
    });
    
  } catch (error: any) {
    console.error('POST /api/projects/[id]/boq/save error:', error);
    return NextResponse.json(
      { error: 'Failed to save BOQ', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[id]/boq/save
 * 
 * Get BOQ save status and available versions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id: projectId } = await params;
    
    // Convert projectId to ObjectId for aggregation
    const projectObjectId = new mongoose.Types.ObjectId(projectId);
    
    // Get all versions
    const versions = await BOQ.aggregate([
      { $match: { projectId: projectObjectId } },
      { 
        $group: {
          _id: '$version',
          versionName: { $first: '$versionName' },
          itemCount: { $sum: 1 },
          createdAt: { $first: '$createdAt' }
        }
      },
      { $sort: { _id: -1 } }
    ]);
    
    // Get total item count for latest version
    const latestVersion = versions[0];
    
    return NextResponse.json({
      success: true,
      hasBoq: versions.length > 0,
      latestVersion: latestVersion?._id || 0,
      versions: versions.map(v => ({
        version: v._id,
        name: v.versionName,
        itemCount: v.itemCount,
        createdAt: v.createdAt
      }))
    });
    
  } catch (error: any) {
    console.error('GET /api/projects/[id]/boq/save error:', error);
    return NextResponse.json(
      { error: 'Failed to get BOQ status', details: error.message },
      { status: 500 }
    );
  }
}
