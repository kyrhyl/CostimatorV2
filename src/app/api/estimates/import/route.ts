import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Estimate from '@/models/Estimate';
import RateItem from '@/models/RateItem';
import { computeLineItemEstimate } from '@/lib/calc/estimate';
import { IBOQLine } from '@/models/Estimate';
import { ImportBoqSchema, validateInput } from '@/lib/validation/schemas';

// =============================================
// POST /api/estimates/import
// Import BOQ data and compute estimate
// =============================================

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    
    // ============================================================================
    // STEP 1: Validate input with Zod
    // ============================================================================
    const validation = validateInput(ImportBoqSchema, body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid BOQ data', 
          details: validation.errors 
        },
        { status: 400 }
      );
    }
    
    const validatedData = validation.data!;
    
    const useEvaluated = body.useEvaluated || false;
    
    // Process each BOQ line
    const processedLines: IBOQLine[] = [];
    
    let totalDirectCostSubmitted = 0;
    let totalDirectCostEvaluated = 0;
    let totalOCMSubmitted = 0;
    let totalOCMEvaluated = 0;
    let totalCPSubmitted = 0;
    let totalCPEvaluated = 0;
    let totalVATSubmitted = 0;
    let totalVATEvaluated = 0;
    
    for (const line of validatedData.boqLines) {
      // Try to find matching rate item
      let rateItem = null;
      
      if (line.payItemNumber) {
        rateItem = await RateItem.findOne({ payItemNumber: line.payItemNumber });
      }
      
      if (rateItem) {
        // Compute costs using pricing engine
        const estimate = computeLineItemEstimate(rateItem, line.quantity, useEvaluated);
        
        // Calculate component breakdown
        const materialCost = estimate.breakdown.materialSubmitted * line.quantity;
        const laborCost = estimate.breakdown.laborSubmitted * line.quantity;
        const equipmentCost = estimate.breakdown.equipmentSubmitted * line.quantity;
        const directCost = estimate.breakdown.directCostSubmitted * line.quantity;
        
        // Calculate percentages
        const materialPercent = directCost > 0 ? (materialCost / directCost) * 100 : 0;
        const laborPercent = directCost > 0 ? (laborCost / directCost) * 100 : 0;
        const equipmentPercent = directCost > 0 ? (equipmentCost / directCost) * 100 : 0;
        
        // Accumulate totals
        totalDirectCostSubmitted += estimate.breakdown.directCostSubmitted * line.quantity;
        totalDirectCostEvaluated += estimate.breakdown.directCostEvaluated * line.quantity;
        totalOCMSubmitted += estimate.breakdown.ocmSubmitted * line.quantity;
        totalOCMEvaluated += estimate.breakdown.ocmEvaluated * line.quantity;
        totalCPSubmitted += estimate.breakdown.cpSubmitted * line.quantity;
        totalCPEvaluated += estimate.breakdown.cpEvaluated * line.quantity;
        totalVATSubmitted += estimate.breakdown.vatSubmitted * line.quantity;
        totalVATEvaluated += estimate.breakdown.vatEvaluated * line.quantity;
        
        // Create BOQ line with computed costs
        processedLines.push({
          itemNo: line.itemNo,
          description: line.description,
          unit: line.unit,
          quantity: line.quantity,
          part: line.part,
          partDescription: line.partDescription,
          division: line.division,
          rateItemId: rateItem._id,
          payItemNumber: rateItem.payItemNumber,
          unitPrice: estimate.unitPrice,
          totalAmount: estimate.totalAmount,
          materialCost,
          laborCost,
          equipmentCost,
          materialPercent,
          laborPercent,
          equipmentPercent,
          breakdown: {
            directCostSubmitted: estimate.breakdown.directCostSubmitted,
            directCostEvaluated: estimate.breakdown.directCostEvaluated,
            ocmSubmitted: estimate.breakdown.ocmSubmitted,
            ocmEvaluated: estimate.breakdown.ocmEvaluated,
            cpSubmitted: estimate.breakdown.cpSubmitted,
            cpEvaluated: estimate.breakdown.cpEvaluated,
            vatSubmitted: estimate.breakdown.vatSubmitted,
            vatEvaluated: estimate.breakdown.vatEvaluated,
            totalSubmitted: estimate.breakdown.totalSubmitted,
            totalEvaluated: estimate.breakdown.totalEvaluated
          }
        });
      } else {
        // No rate item found - add line without pricing
        processedLines.push({
          itemNo: line.itemNo,
          description: line.description,
          unit: line.unit,
          quantity: line.quantity,
          part: line.part,
          partDescription: line.partDescription,
          division: line.division,
          payItemNumber: line.payItemNumber
        });
      }
    }
    
    // Calculate grand totals
    const grandTotalSubmitted = totalDirectCostSubmitted + totalOCMSubmitted + totalCPSubmitted + totalVATSubmitted;
    const grandTotalEvaluated = totalDirectCostEvaluated + totalOCMEvaluated + totalCPEvaluated + totalVATEvaluated;
    
    // Create estimate document using validated data
    const estimate = await Estimate.create({
      projectName: validatedData.projectName,
      projectLocation: validatedData.projectLocation,
      implementingOffice: validatedData.implementingOffice,
      boqLines: processedLines,
      totalDirectCostSubmitted,
      totalDirectCostEvaluated,
      totalOCMSubmitted,
      totalOCMEvaluated,
      totalCPSubmitted,
      totalCPEvaluated,
      totalVATSubmitted,
      totalVATEvaluated,
      grandTotalSubmitted,
      grandTotalEvaluated
    });
    
    return NextResponse.json({
      success: true,
      data: estimate,
      summary: {
        totalLines: processedLines.length,
        linesWithPricing: processedLines.filter(l => l.unitPrice).length,
        linesWithoutPricing: processedLines.filter(l => !l.unitPrice).length
      }
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
