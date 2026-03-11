/**
 * Cost Estimate Diagnostics API Route
 *
 * GET /api/cost-estimates/[id]/diagnostics
 * Returns diagnostics for zero-value DUPA inputs and math consistency checks
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import CostEstimate from '@/models/CostEstimate';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: estimateId } = await params;

    const isObjectId = /^[a-fA-F0-9]{24}$/.test(estimateId);
    const isEstimateNumber = /^EST-\d+$/i.test(estimateId);

    if (!isObjectId && !isEstimateNumber) {
      return NextResponse.json(
        { error: 'Invalid estimate ID format' },
        { status: 400 }
      );
    }

    await dbConnect();

    const estimateQuery = isObjectId
      ? CostEstimate.findById(estimateId)
      : CostEstimate.findOne({ estimateNumber: estimateId });

    const estimate = await estimateQuery.lean();

    if (!estimate) {
      return NextResponse.json(
        { error: 'Cost estimate not found' },
        { status: 404 }
      );
    }

    const estimateLines = estimate.estimateLines || [];
    const costSummary = estimate.costSummary || {};

    let computedDirectTotal = 0;
    let computedOCMTotal = 0;
    let computedCPTotal = 0;
    let computedVATTotal = 0;
    let computedGrandTotal = 0;

    const directMismatchLines: Array<{ payItemNumber: string; computedDirect: number; storedDirect: number }>
      = [];
    const zeroCostLines: Array<{ payItemNumber: string; description: string }>
      = [];
    const missingRates: Array<{
      payItemNumber: string;
      description: string;
      laborZeroCount: number;
      equipmentZeroCount: number;
      materialZeroCount: number;
    }> = [];
    const dupaNotFoundLines: Array<{ payItemNumber: string; description: string }>
      = [];

    for (const line of estimateLines) {
      const quantity = line.quantity || 0;
      const laborCost = line.laborCost || 0;
      const equipmentCost = line.equipmentCost || 0;
      const materialCost = line.materialCost || 0;
      const computedDirect = laborCost + equipmentCost + materialCost;
      const storedDirect = line.directCost || 0;

      computedDirectTotal += storedDirect * quantity;
      computedOCMTotal += (line.ocmCost || 0) * quantity;
      computedCPTotal += (line.cpCost || 0) * quantity;
      computedVATTotal += (line.vatCost || 0) * quantity;
      computedGrandTotal += line.totalAmount || 0;

      if (Math.abs(computedDirect - storedDirect) > 0.0001) {
        directMismatchLines.push({
          payItemNumber: line.payItemNumber,
          computedDirect,
          storedDirect
        });
      }

      if (!line.dupaNotFound && laborCost === 0 && equipmentCost === 0 && materialCost === 0) {
        zeroCostLines.push({
          payItemNumber: line.payItemNumber,
          description: line.payItemDescription
        });
      }

      if (line.dupaNotFound) {
        dupaNotFoundLines.push({
          payItemNumber: line.payItemNumber,
          description: line.payItemDescription
        });
      }

      const laborZeroCount = (line.laborItems || []).filter((item: any) => (item.hourlyRate || 0) === 0).length;
      const equipmentZeroCount = (line.equipmentItems || []).filter((item: any) => (item.hourlyRate || 0) === 0).length;
      const materialZeroCount = (line.materialItems || []).filter((item: any) => (item.unitCost || 0) === 0).length;

      if (laborZeroCount > 0 || equipmentZeroCount > 0 || materialZeroCount > 0) {
        missingRates.push({
          payItemNumber: line.payItemNumber,
          description: line.payItemDescription,
          laborZeroCount,
          equipmentZeroCount,
          materialZeroCount
        });
      }
    }

    const totalsDelta = {
      totalDirectCost: computedDirectTotal - (costSummary.totalDirectCost || 0),
      totalOCM: computedOCMTotal - (costSummary.totalOCM || 0),
      totalCP: computedCPTotal - (costSummary.totalCP || 0),
      totalVAT: computedVATTotal - (costSummary.totalVAT || 0),
      grandTotal: computedGrandTotal - (costSummary.grandTotal || 0),
    };

    return NextResponse.json({
      success: true,
      estimateId: estimate._id,
      estimateNumber: estimate.estimateNumber,
      totalsComputed: {
        totalDirectCost: computedDirectTotal,
        totalOCM: computedOCMTotal,
        totalCP: computedCPTotal,
        totalVAT: computedVATTotal,
        grandTotal: computedGrandTotal,
      },
      totalsReported: {
        totalDirectCost: costSummary.totalDirectCost || 0,
        totalOCM: costSummary.totalOCM || 0,
        totalCP: costSummary.totalCP || 0,
        totalVAT: costSummary.totalVAT || 0,
        grandTotal: costSummary.grandTotal || 0,
      },
      totalsDelta,
      directMismatchLines,
      dupaNotFoundLines,
      zeroCostLines,
      missingRates,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to run diagnostics', details: error.message },
      { status: 500 }
    );
  }
}
