/**
 * CMPD Bulk Import API
 * Handles CSV file uploads for Construction Materials Price Data (CMPD)
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import MaterialPrice from '@/models/MaterialPrice';
import Material from '@/models/Material';
import Papa from 'papaparse';
import { z } from 'zod';

function normalizeSpecialChars(value: string): string {
  return value
    .replace(/\uFFFD/g, 'φ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================================
// Validation Schemas
// ============================================================================

const CMPDRowSchema = z.object({
  materialCode: z.string().min(1, 'Material code is required').transform(val => val.trim().toUpperCase()),
  description: z.string().min(1, 'Description is required'),
  unit: z.string().min(1, 'Unit is required').transform(val => val.trim().toUpperCase()),
  unitCost: z.number().min(0, 'Unit cost must be non-negative'),
  brand: z.string().optional().default(''),
  specification: z.string().optional().default(''),
  supplier: z.string().optional().default(''),
});

const CMPDImportSchema = z.object({
  district: z.string().min(1, 'District is required'),
  cmpd_version: z.string().min(1, 'CMPD version is required'),
  location: z.string().min(1, 'Location is required'),
  effectiveDate: z.string().or(z.date()),
  deactivateOldPrices: z.boolean().optional().default(false),
  validateMaterialCodes: z.boolean().optional().default(true),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse CSV file buffer to JSON rows
 */
function parseFileBuffer(buffer: Buffer): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const text = buffer.toString('utf-8');

    const columnMap: Record<string, string> = {
      'material_code': 'materialCode',
      'material_code,': 'materialCode',
      'materialcode': 'materialCode',
      'material code': 'materialCode',
      'code': 'materialCode',
      'itemcode': 'materialCode',
      'description': 'description',
      'material_description': 'description',
      'materialdescription': 'description',
      'unit': 'unit',
      'uom': 'unit',
      'unit_cost': 'unitCost',
      'unitprice': 'unitCost',
      'unit_price': 'unitCost',
      'unit price': 'unitCost',
      'unitcost': 'unitCost',
      'price': 'unitCost',
      'cost': 'unitCost',
      'brand': 'brand',
      'specification': 'specification',
      'specs': 'specification',
      'supplier': 'supplier',
    };

    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim().replace(/\s+/g, '_'),
      complete: (results) => {
        if (results.errors.length > 0) {
          return reject(new Error(`CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`));
        }

        const rows = (results.data as any[]) || [];
        const hasExpectedHeaders = rows.length > 0 && Object.keys(rows[0]).some((k) => {
          const normalizedKey = String(k).toLowerCase().trim();
          return Object.prototype.hasOwnProperty.call(columnMap, normalizedKey);
        });

        if (hasExpectedHeaders) {
          const mappedRows = rows.map((row: any, index) => {
            const mapped: any = {};
            for (const [key, value] of Object.entries(row)) {
              const normalizedKey = String(key).toLowerCase().trim();
              const mappedKey = columnMap[normalizedKey] || key;
              if (mappedKey === 'unitCost') {
                mapped[mappedKey] = parseFloat(String(value || '').replace(/,/g, '')) || 0;
              } else {
                mapped[mappedKey] = typeof value === 'string' ? normalizeSpecialChars(value) : (value || '');
              }
            }
            mapped._rowIndex = index + 2;
            return mapped;
          });
          resolve(mappedRows);
          return;
        }

        // Fallback for headerless CSV: code, description, unit, unit_cost, brand, specification, supplier
        Papa.parse(text, {
          header: false,
          skipEmptyLines: true,
          complete: (fallback) => {
            if (fallback.errors.length > 0) {
              return reject(new Error(`CSV parsing errors: ${fallback.errors.map(e => e.message).join(', ')}`));
            }

            const mappedRows = ((fallback.data as any[]) || []).map((cols: any[], index) => ({
              materialCode: normalizeSpecialChars(String(cols?.[0] || '')),
              description: normalizeSpecialChars(String(cols?.[1] || '')),
              unit: normalizeSpecialChars(String(cols?.[2] || '')),
              unitCost: parseFloat(String(cols?.[3] || '').replace(/,/g, '')) || 0,
              brand: normalizeSpecialChars(String(cols?.[4] || '')),
              specification: normalizeSpecialChars(String(cols?.[5] || '')),
              supplier: normalizeSpecialChars(String(cols?.[6] || '')),
              _rowIndex: index + 1,
            }));

            resolve(mappedRows);
          },
          error: (error: Error) => reject(error),
        });
      },
      error: (error: Error) => reject(error),
    });
  });
}

/**
 * Validate material codes against Material master
 */
async function validateMaterialCodes(materialCodes: string[]): Promise<{
  valid: string[];
  invalid: string[];
}> {
  const uniqueCodes = [...new Set(materialCodes)];
  const existingMaterials = await Material.find({
    materialCode: { $in: uniqueCodes }
  }).select('materialCode').lean();
  
  const validCodes = new Set(existingMaterials.map(m => m.materialCode));
  
  return {
    valid: uniqueCodes.filter(code => validCodes.has(code)),
    invalid: uniqueCodes.filter(code => !validCodes.has(code))
  };
}

// ============================================================================
// API Routes
// ============================================================================

/**
 * POST /api/master/materials/prices/bulk-import
 * Upload CSV file to bulk import CMPD prices
 * 
 * Form Data:
 * - file: CSV file
 * - district: DPWH district (e.g., "DPWH-NCR-1st")
 * - cmpd_version: Version identifier (e.g., "CMPD-2024-Q1")
 * - location: Location name
 * - effectiveDate: Effective date (ISO format)
 * - deactivateOldPrices: Mark old prices as inactive (optional, default: false)
 * - validateMaterialCodes: Validate against Material master (optional, default: true)
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }
    
    // Validate file type (CSV only)
    const filename = file.name.toLowerCase();
    if (!filename.endsWith('.csv')) {
      return NextResponse.json(
        { success: false, error: 'Only CSV files are supported. Please convert your Excel file to CSV format.' },
        { status: 400 }
      );
    }
    
    // Parse import metadata
    const metadata = {
      district: formData.get('district') as string,
      cmpd_version: formData.get('cmpd_version') as string,
      location: formData.get('location') as string,
      effectiveDate: formData.get('effectiveDate') as string,
      deactivateOldPrices: formData.get('deactivateOldPrices') === 'true',
      validateMaterialCodes: formData.get('validateMaterialCodes') !== 'false',
    };
    
    // Validate metadata
    const metadataValidation = CMPDImportSchema.safeParse(metadata);
    if (!metadataValidation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid import metadata',
          details: metadataValidation.error.errors 
        },
        { status: 400 }
      );
    }
    
    const validatedMetadata = metadataValidation.data;
    
    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Parse file
    let rows: any[];
    try {
      rows = await parseFileBuffer(buffer) as any[];
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No data rows found in file' },
        { status: 400 }
      );
    }
    
    // Enrich missing description/unit from base materials master
    const uniqueCodes = [...new Set(rows.map((r) => String(r.materialCode || '').trim().toUpperCase()).filter(Boolean))];
    const materialMasterRows = await Material.find({ materialCode: { $in: uniqueCodes } })
      .select('materialCode materialDescription unit')
      .lean();
    const materialMasterMap = new Map(
      materialMasterRows.map((m: any) => [String(m.materialCode || '').trim().toUpperCase(), m])
    );

    const normalizedRows = rows.map((row) => {
      const code = String(row.materialCode || '').trim().toUpperCase();
      const master = materialMasterMap.get(code);
      const next = { ...row };
      if ((!next.description || !String(next.description).trim()) && master?.materialDescription) {
        next.description = String(master.materialDescription);
      }
      if ((!next.unit || !String(next.unit).trim()) && master?.unit) {
        next.unit = String(master.unit);
      }
      return next;
    });

    // Validate rows
    const validationResults = {
      total: normalizedRows.length,
      valid: [] as any[],
      invalid: [] as any[],
      errors: [] as string[]
    };

    const duplicateCodesInFile = new Set<string>();
    const seenCodes = new Set<string>();

    for (const row of normalizedRows) {
      const code = String(row.materialCode || '').trim().toUpperCase();
      if (code) {
        if (seenCodes.has(code)) duplicateCodesInFile.add(code);
        seenCodes.add(code);
      }

      const validation = CMPDRowSchema.safeParse(row);
      if (validation.success) {
        const existsInMaster = materialMasterMap.has(validation.data.materialCode);
        if (!existsInMaster) {
          validationResults.invalid.push(row);
          validationResults.errors.push(`Row ${row._rowIndex}: material code ${validation.data.materialCode} not found in base materials master`);
          continue;
        }
        validationResults.valid.push({
          ...validation.data,
          _rowIndex: row._rowIndex
        });
      } else {
        validationResults.invalid.push(row);
        validationResults.errors.push(
          `Row ${row._rowIndex}: ${validation.error.errors.map(e => e.message).join(', ')}`
        );
      }
    }

    if (duplicateCodesInFile.size > 0) {
      validationResults.errors.push(`Duplicate material codes in file: ${Array.from(duplicateCodesInFile).join(', ')}`);
      validationResults.valid = validationResults.valid.filter((r) => !duplicateCodesInFile.has(r.materialCode));
    }
    
    // Check if validation is required and perform it
    let materialCodeValidation: { valid: string[]; invalid: string[] } | null = null;
    
    if (validatedMetadata.validateMaterialCodes) {
      const materialCodes = validationResults.valid.map(row => row.materialCode);
      materialCodeValidation = await validateMaterialCodes(materialCodes);
      
      if (materialCodeValidation.invalid.length > 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: `${materialCodeValidation.invalid.length} material code(s) not found in master data`,
            invalidCodes: materialCodeValidation.invalid,
            message: 'Please add these materials to the master data first or disable validation'
          },
          { status: 400 }
        );
      }
    }
    
    if (validationResults.valid.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No valid rows to import',
          details: validationResults.errors,
          expectedColumns: [
            'material_code (or code)',
            'description (optional if present in base master)',
            'unit (optional if present in base master)',
            'unit_cost (or price/cost)',
            'brand (optional)',
            'specification (optional)',
            'supplier (optional)',
          ]
        },
        { status: 400 }
      );
    }
    
    // Generate import batch ID
    const importBatch = `${validatedMetadata.cmpd_version}_${Date.now()}`;
    
    // Deactivate old prices if requested
    if (validatedMetadata.deactivateOldPrices) {
      await MaterialPrice.updateMany(
        {
          district: validatedMetadata.district,
          isActive: true
        },
        {
          $set: { isActive: false }
        }
      );
    }
    
    // Prepare material prices for insertion
    const materialPrices = validationResults.valid.map(row => ({
      materialCode: row.materialCode,
      description: row.description,
      unit: row.unit,
      location: validatedMetadata.location,
      district: validatedMetadata.district,
      unitCost: row.unitCost,
      priceSource: 'cmpd',
      brand: row.brand || '',
      specification: row.specification || '',
      supplier: row.supplier || '',
      effectiveDate: new Date(validatedMetadata.effectiveDate),
      cmpd_version: validatedMetadata.cmpd_version,
      isActive: true,
      importBatch: importBatch
    }));
    
    // Insert material prices
    let insertedPrices;
    try {
      insertedPrices = await MaterialPrice.insertMany(materialPrices, { 
        ordered: false // Continue on duplicate key errors
      });
    } catch (error: any) {
      // Handle duplicate key errors
      if (error.code === 11000) {
        // Some records were duplicates but others may have been inserted
        const insertedCount = error.insertedDocs?.length || 0;
        return NextResponse.json({
          success: true,
          message: `Partially imported ${insertedCount} of ${materialPrices.length} prices (some duplicates skipped)`,
          summary: {
            totalRows: rows.length,
            validRows: validationResults.valid.length,
            invalidRows: validationResults.invalid.length,
            imported: insertedCount,
            duplicates: materialPrices.length - insertedCount,
            district: validatedMetadata.district,
            cmpd_version: validatedMetadata.cmpd_version,
            importBatch: importBatch,
            deactivatedOldPrices: validatedMetadata.deactivateOldPrices
          },
          errors: validationResults.errors.length > 0 ? validationResults.errors : undefined
        }, { status: 207 }); // 207 Multi-Status
      }
      throw error;
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully imported ${insertedPrices.length} material prices`,
      summary: {
        totalRows: rows.length,
        validRows: validationResults.valid.length,
        invalidRows: validationResults.invalid.length,
        imported: insertedPrices.length,
        district: validatedMetadata.district,
        cmpd_version: validatedMetadata.cmpd_version,
        importBatch: importBatch,
        deactivatedOldPrices: validatedMetadata.deactivateOldPrices
      },
      errors: validationResults.errors.length > 0 ? validationResults.errors : undefined
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('POST /api/master/materials/prices/bulk-import error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to import CMPD data' },
      { status: 500 }
    );
  }
}
