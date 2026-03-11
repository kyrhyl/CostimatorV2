import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Estimate from '@/models/Estimate';

// GET /api/estimates/:id - Get a specific estimate
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    const estimate = await Estimate.findById(id);
    
    if (!estimate) {
      return NextResponse.json(
        { success: false, error: 'Estimate not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: estimate
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/estimates/:id - Update an estimate
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    const body = await request.json();
    const RateItem = (await import('@/models/RateItem')).default;
    const { computeLineItemEstimate } = await import('@/lib/calc/estimate');
    
    // Validate required fields
    if (!body.projectName || !body.projectLocation) {
      return NextResponse.json(
        { success: false, error: 'Missing required project information' },
        { status: 400 }
      );
    }
    
    if (!body.boqLines || body.boqLines.length === 0) {
      return NextResponse.json(
        { success: false, error: 'BOQ lines are required' },
        { status: 400 }
      );
    }
    
    const useEvaluated = body.useEvaluated || false;
    
    // Process each BOQ line
    const processedLines: any[] = [];
    
    let totalDirectCostSubmitted = 0;
    let totalDirectCostEvaluated = 0;
    let totalOCMSubmitted = 0;
    let totalOCMEvaluated = 0;
    let totalCPSubmitted = 0;
    let totalCPEvaluated = 0;
    let totalVATSubmitted = 0;
    let totalVATEvaluated = 0;
    
    for (const line of body.boqLines) {
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
    
    // Update the estimate
    const estimate = await Estimate.findByIdAndUpdate(
      id,
      {
        projectName: body.projectName,
        projectLocation: body.projectLocation,
        implementingOffice: body.implementingOffice || 'DPWH',
        contractId: body.contractId,
        partNo: body.partNo,
        partDescription: body.partDescription,
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
      },
      { new: true, runValidators: true }
    );
    
    if (!estimate) {
      return NextResponse.json(
        { success: false, error: 'Estimate not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: estimate
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/estimates/:id - Delete an estimate
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    const estimate = await Estimate.findByIdAndDelete(id);
    
    if (!estimate) {
      return NextResponse.json(
        { success: false, error: 'Estimate not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Estimate deleted successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
