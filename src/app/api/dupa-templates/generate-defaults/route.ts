import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import PayItem from '@/models/PayItem';
import DUPATemplate from '@/models/DUPATemplate';

/**
 * POST /api/dupa-templates/generate-defaults
 * Auto-generate DUPA templates for all pay items with default labor configuration
 * 
 * Default Labor Configuration:
 * - Foreman: 1 person × 1 hour
 * - Skilled Labor: 1 person × 1 hour  
 * - Unskilled Labor: 2 persons × 1 hour
 * 
 * Equipment and Materials are left blank for user customization
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { 
      part, 
      overwriteExisting = false,
      includeInactive = false,
      customLaborConfig 
    } = body;

    // Default labor configuration (can be overridden via request body)
    const defaultLaborTemplate = customLaborConfig || [
      {
        designation: 'Foreman',
        noOfPersons: 1,
        noOfHours: 1,
      },
      {
        designation: 'Skilled Labor',
        noOfPersons: 1,
        noOfHours: 1,
      },
      {
        designation: 'Unskilled Labor',
        noOfPersons: 2,
        noOfHours: 1,
      },
    ];

    // Build query filter
    const filter: any = {};
    if (part) {
      filter.part = part;
    }
    if (!includeInactive) {
      filter.isActive = true;
    }

    // Fetch all pay items matching the filter
    const payItems = await PayItem.find(filter).lean();

    if (payItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No pay items found matching the criteria',
      }, { status: 404 });
    }

    const results = {
      total: payItems.length,
      created: 0,
      skipped: 0,
      updated: 0,
      errors: [] as string[],
    };

    // Process each pay item
    for (const payItem of payItems) {
      try {
        // Check if DUPA template already exists
        const existing = await DUPATemplate.findOne({ 
          payItemNumber: payItem.payItemNumber 
        });

        if (existing && !overwriteExisting) {
          results.skipped++;
          continue;
        }

        // Calculate default output per hour based on labor
        // Simple heuristic: sum of (persons × hours) from labor config
        const defaultOutputPerHour = defaultLaborTemplate.reduce(
          (sum: number, labor: any) => sum + (labor.noOfPersons * labor.noOfHours), 
          0
        ) || 1;

        const dupaData = {
          payItemId: payItem._id,
          payItemNumber: payItem.payItemNumber,
          payItemDescription: payItem.description,
          unitOfMeasurement: payItem.unit,
          outputPerHour: defaultOutputPerHour,
          
          // Default labor configuration
          laborTemplate: defaultLaborTemplate,
          
          // Empty equipment and materials (user will fill these)
          equipmentTemplate: [],
          materialTemplate: [],
          
          // Default add-on percentages (DPWH standard)
          ocmPercentage: 15,
          cpPercentage: 10,
          vatPercentage: 12,
          
          // Minor tools configuration
          includeMinorTools: true,
          minorToolsPercentage: 10,
          
          // Metadata
          part: payItem.part || '',
          category: payItem.category || payItem.trade || 'General',
          specification: `Auto-generated DUPA template for ${payItem.payItemNumber}`,
          notes: 'Default labor configuration applied. Please customize equipment and materials as needed.',
          isActive: true,
        };

        if (existing && overwriteExisting) {
          // Update existing template
          await DUPATemplate.findByIdAndUpdate(existing._id, dupaData);
          results.updated++;
        } else {
          // Create new template
          await DUPATemplate.create(dupaData);
          results.created++;
        }
      } catch (err: any) {
        results.errors.push(`${payItem.payItemNumber}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Generated ${results.created} templates, updated ${results.updated}, skipped ${results.skipped}`,
    });

  } catch (error: any) {
    console.error('Error generating default DUPA templates:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to generate DUPA templates' 
      },
      { status: 500 }
    );
  }
}
