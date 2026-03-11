/**
 * Master Data API - Equipment CSV Import
 * Import equipment data from CSV format
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Equipment from '@/models/Equipment';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const CsvImportSchema = z.object({
  csvData: z.string().min(1, 'CSV data is required'),
  clearExisting: z.boolean().optional().default(false),
  skipDuplicates: z.boolean().optional().default(false),
});

// ============================================================================
// Helper Functions
// ============================================================================

function validateInput<T>(schema: z.ZodSchema<T>, data: unknown) {
  try {
    return { success: true, data: schema.parse(data) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      };
    }
    return { success: false, error: 'Validation failed' };
  }
}

/**
 * Parse CSV line handling quoted fields with commas
 */
function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Push last value
  values.push(current.trim());
  
  return values;
}

/**
 * Parse equipment CSV data
 */
function parseEquipmentCsv(csvData: string): { success: boolean; data?: any[]; error?: string } {
  try {
    const lines = csvData.trim().split('\n');
    
    if (lines.length < 2) {
      return { success: false, error: 'CSV must contain at least a header and one data row' };
    }
    
    const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());
    const equipmentData: any[] = [];
    const errors: string[] = [];
    
    // Expected headers mapping
    const headerMap: Record<string, string> = {
      'no': 'no',
      '#': 'no',
      'number': 'no',
      'complete description': 'completeDescription',
      'completedescription': 'completeDescription',
      'description': 'description',
      'desc': 'description',
      'equipment model': 'equipmentModel',
      'model': 'equipmentModel',
      'capacity': 'capacity',
      'flywheel horsepower': 'flywheelHorsepower',
      'hp': 'flywheelHorsepower',
      'horsepower': 'flywheelHorsepower',
      'rental rate': 'rentalRate',
      'rentalrate': 'rentalRate',
      'hourly rate': 'hourlyRate',
      'hourlyrate': 'hourlyRate',
      'rate': 'hourlyRate',
    };
    
    // Process each data line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = parseCsvLine(line);
      const equipment: any = {};
      
      // Map values to equipment fields
      for (let j = 0; j < headers.length && j < values.length; j++) {
        const mappedField = headerMap[headers[j]];
        if (mappedField) {
          const value = values[j].trim();
          
          // Parse numeric fields
          if (['no', 'flywheelHorsepower', 'rentalRate', 'hourlyRate'].includes(mappedField)) {
            const num = parseFloat(value);
            if (!isNaN(num)) {
              equipment[mappedField] = mappedField === 'no' ? Math.floor(num) : num;
            }
          } else {
            // String fields
            if (value) {
              equipment[mappedField] = value;
            }
          }
        }
      }
      
      // Validate required fields
      if (!equipment.no) {
        errors.push(`Line ${i + 1}: Missing equipment number`);
        continue;
      }
      if (!equipment.description && !equipment.completeDescription) {
        errors.push(`Line ${i + 1}: Missing description`);
        continue;
      }
      
      // Set defaults
      if (!equipment.completeDescription) {
        equipment.completeDescription = equipment.description;
      }
      if (!equipment.description) {
        equipment.description = equipment.completeDescription;
      }
      
      equipment.rentalRate = equipment.rentalRate || 0;
      equipment.hourlyRate = equipment.hourlyRate || 0;
      
      equipmentData.push(equipment);
    }
    
    if (errors.length > 0 && equipmentData.length === 0) {
      return { success: false, error: errors.join('; ') };
    }
    
    return { 
      success: true, 
      data: equipmentData,
      error: errors.length > 0 ? `Imported with warnings: ${errors.join('; ')}` : undefined
    };
  } catch (error: any) {
    return { success: false, error: `CSV parsing error: ${error.message}` };
  }
}

// ============================================================================
// API Routes
// ============================================================================

/**
 * POST /api/master/equipment/import-csv
 * Import equipment from CSV data
 * 
 * Body:
 * - csvData: CSV string with headers
 * - clearExisting: Whether to clear existing equipment before import (default: false)
 * - skipDuplicates: Whether to skip duplicate equipment numbers (default: false)
 * 
 * CSV Format:
 * No,Complete Description,Description,Equipment Model,Capacity,Flywheel Horsepower,Rental Rate,Hourly Rate
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    
    // Validate request body
    const validation = validateInput(CsvImportSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }
    
    const { csvData, clearExisting, skipDuplicates } = validation.data!;
    
    // Parse CSV
    const parseResult = parseEquipmentCsv(csvData);
    if (!parseResult.success || !parseResult.data) {
      return NextResponse.json(
        { success: false, error: parseResult.error },
        { status: 400 }
      );
    }
    
    // Clear existing equipment if requested
    if (clearExisting) {
      const deleteResult = await Equipment.deleteMany({});
      console.log(`Cleared ${deleteResult.deletedCount} existing equipment items`);
    }
    
     // Handle duplicates
     let inserted = 0;
     let skipped = 0;
     const errors: string[] = [];
    
    if (skipDuplicates) {
      // Insert one by one, skipping duplicates
      for (const equipment of parseResult.data) {
        try {
          const existing = await Equipment.findOne({ no: equipment.no });
          if (existing) {
            skipped++;
            continue;
          }
          await Equipment.create(equipment);
          inserted++;
        } catch (error: any) {
          if (error.code === 11000) {
            skipped++;
          } else {
            errors.push(`Equipment #${equipment.no}: ${error.message}`);
          }
        }
      }
    } else {
      // Bulk insert (will fail on duplicates)
      try {
        const result = await Equipment.insertMany(parseResult.data, { ordered: false });
        inserted = result.length;
      } catch (error: any) {
        // Handle partial success with duplicates
        if (error.code === 11000 && error.insertedDocs) {
          inserted = error.insertedDocs.length;
          skipped = parseResult.data.length - inserted;
        } else {
          return NextResponse.json(
            { success: false, error: error.message || 'Import failed' },
            { status: 500 }
          );
        }
      }
    }
    
    // Build response
    const response: any = {
      success: true,
      message: `Successfully imported ${inserted} equipment items`,
      imported: inserted,
    };
    
    if (skipped > 0) {
      response.skipped = skipped;
      response.message += `, skipped ${skipped} duplicates`;
    }
    
    if (errors.length > 0) {
      response.errors = errors;
      response.message += ` (with ${errors.length} errors)`;
    }
    
    if (parseResult.error) {
      response.warnings = parseResult.error;
    }
    
    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/master/equipment/import-csv error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Import failed' },
      { status: 500 }
    );
  }
}
