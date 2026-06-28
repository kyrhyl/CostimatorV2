import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Material from '@/models/Material';
import Papa from 'papaparse';
import { z } from 'zod';

const MaterialRowSchema = z.object({
  materialCode: z.string().min(1).transform((v) => v.trim().toUpperCase()),
  works: z.string().min(1).transform((v) => v.trim().toUpperCase()),
  materialDescription: z.string().min(1).transform((v) => v.trim()),
  unit: z.string().min(1).transform((v) => v.trim().toUpperCase()),
  category: z.string().min(1).transform((v) => v.trim().toUpperCase()),
  includeHauling: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

function normalizeSpecialChars(value: string): string {
  return value
    .replace(/\uFFFD/g, 'φ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeRow(row: any, index: number) {
  const normalizedEntries = Object.entries(row || {}).map(([key, value]) => {
    const normalizedKey = String(key)
      .replace(/^\uFEFF/, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '');
    return [normalizedKey, value] as const;
  });

  const normalizedRow = new Map<string, unknown>(normalizedEntries);

  const get = (...keys: string[]) => {
    for (const key of keys) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      const value = normalizedRow.get(normalizedKey);
      if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return '';
  };

  const includeHaulingRaw = String(get('include_hauling', 'includehauling', 'hauling', 'withhauling')).toLowerCase();
  const isActiveRaw = String(get('is_active', 'active', 'status', 'enabled')).toLowerCase();

  return {
    materialCode: String(get('material_code', 'materialcode', 'code', 'itemcode')),
    works: normalizeSpecialChars(String(get('works', 'work', 'scope'))),
    materialDescription: normalizeSpecialChars(String(get('material_description', 'materialdescription', 'description', 'materialname', 'name'))),
    unit: normalizeSpecialChars(String(get('unit', 'uom'))),
    category: normalizeSpecialChars(String(get('category'))),
    includeHauling: ['true', '1', 'yes', 'y', 'included'].includes(includeHaulingRaw),
    isActive: isActiveRaw ? ['true', '1', 'yes', 'y', 'active'].includes(isActiveRaw) : true,
    _rowIndex: index + 2,
  };
}

function parseCsv(buffer: Buffer): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const text = buffer.toString('utf-8');

    const parseWithHeader = () => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.toLowerCase().trim().replace(/\s+/g, '_'),
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(results.errors.map((e) => e.message).join(', ')));
            return;
          }

          const rows = (results.data as any[]) || [];
          const hasMaterialHeaders = rows.length > 0 && Object.keys(rows[0]).some((k) => {
            const nk = String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
            return ['materialcode', 'material_code', 'code', 'works', 'work', 'category', 'materialdescription', 'description', 'unit', 'uom'].includes(nk);
          });

          if (hasMaterialHeaders) {
            resolve(rows);
            return;
          }

          // Fallback: headerless CSV with positional columns (code, works, category, description, unit)
          Papa.parse(text, {
            header: false,
            skipEmptyLines: true,
            complete: (noHeaderResults) => {
              if (noHeaderResults.errors.length > 0) {
                reject(new Error(noHeaderResults.errors.map((e) => e.message).join(', ')));
                return;
              }

              const positionalRows = ((noHeaderResults.data as any[]) || []).map((cols: any[]) => ({
                material_code: cols?.[0] ?? '',
                works: cols?.[1] ?? '',
                category: cols?.[2] ?? '',
                material_description: cols?.[3] ?? '',
                unit: cols?.[4] ?? '',
                include_hauling: cols?.[5] ?? '',
                is_active: cols?.[6] ?? '',
              }));

              resolve(positionalRows);
            },
            error: (err: Error) => reject(err),
          });
        },
        error: (err: Error) => reject(err),
      });
    };

    parseWithHeader();
  });
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const overwriteExisting = true;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const filename = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let rows: any[] = [];
    if (filename.endsWith('.csv')) {
      rows = await parseCsv(buffer);
    } else {
      return NextResponse.json({ success: false, error: 'Unsupported file type. Use CSV only.' }, { status: 400 });
    }

    if (!rows.length) {
      return NextResponse.json({ success: false, error: 'No rows found in uploaded file' }, { status: 400 });
    }

    const valid: any[] = [];
    const errors: string[] = [];
    for (let i = 0; i < rows.length; i += 1) {
      const normalized = normalizeRow(rows[i], i);
      const parsed = MaterialRowSchema.safeParse(normalized);
      if (parsed.success) {
        valid.push(parsed.data);
      } else {
        errors.push(`Row ${normalized._rowIndex}: ${parsed.error.issues.map((e) => e.message).join(', ')}`);
      }
    }

    const duplicateCodesInFile = new Set<string>();
    const seenCodes = new Set<string>();
    for (const row of valid) {
      if (seenCodes.has(row.materialCode)) {
        duplicateCodesInFile.add(row.materialCode);
      }
      seenCodes.add(row.materialCode);
    }

    if (duplicateCodesInFile.size > 0) {
      errors.push(`Duplicate material codes in file: ${Array.from(duplicateCodesInFile).join(', ')}`);
    }

    if (errors.length > 0 || !valid.length) {
      return NextResponse.json(
        {
          success: false,
          error: errors.length > 0 ? 'Import rejected due to validation errors' : 'No valid rows to import',
          details: errors,
          expectedColumns: [
            'material_code (or code)',
            'works',
            'category',
            'material_description (or description)',
            'unit',
            'include_hauling (optional)',
            'is_active (optional)',
          ],
        },
        { status: 400 }
      );
    }

    const codes = valid.map((v) => v.materialCode);
    const existing = await Material.find({ materialCode: { $in: codes } }).select('materialCode').lean();
    const existingCodes = new Set(existing.map((m: any) => String(m.materialCode).toUpperCase()));

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of valid) {
      if (existingCodes.has(row.materialCode)) {
        if (overwriteExisting) {
          await Material.updateOne({ materialCode: row.materialCode }, { $set: row });
          updated += 1;
        } else {
          skipped += 1;
        }
      } else {
        await Material.create(row);
        imported += 1;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Base materials import completed',
      summary: {
        totalRows: rows.length,
        validRows: valid.length,
        invalidRows: errors.length,
        imported,
        updated,
        skipped,
      },
      errors: errors.length ? errors : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to import base materials' }, { status: 500 });
  }
}
