import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import dbConnect from '@/lib/db/connect';
import Equipment from '@/models/Equipment';
import EquipmentRate from '@/models/EquipmentRate';

type ParsedAcelRow = {
  equipment: string;
  category: string;
  description: string;
  model: string;
  capacity: string;
  horsepower: number;
  fixedRate: number;
  basePrice: number;
  dryRate: number;
  fuelLow: number;
  fuelHigh: number;
  fuelAvg: number;
  fuelCostPerLiter: number;
  fuelCostPerHour: number;
  lubeAvg: number;
  lubeCostPerLiter: number;
  lubeCostPerHour: number;
  variableRate: number;
};

const toNum = (value: unknown): number => {
  const cleaned = String(value ?? '')
    .replace(/[^0-9.\-]/g, '')
    .trim();
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const normalizeHeader = (header: string) => header.toLowerCase().replace(/\s+/g, ' ').trim();

const headerMap: Record<string, keyof ParsedAcelRow | 'ignore'> = {
  equipment: 'equipment',
  description: 'description',
  category: 'category',
  model: 'model',
  capacity: 'capacity',
  horsepower: 'horsepower',
  '27th ed operated hourly rate (with fuel/oil)': 'fixedRate',
  '27th ed': 'fixedRate',
  'fixed price': 'fixedRate',
  'base price': 'basePrice',
  'flywheel horsepower': 'ignore',
  '27th ed operated dry rate (without fuel/oil)': 'dryRate',
  'low fuel consumption (l/hr)': 'fuelLow',
  'high fuel consumption (l/hr)': 'fuelHigh',
  'average fuel consumption (l/hr)': 'fuelAvg',
  'fuel cost per liter (actual price)': 'fuelCostPerLiter',
  'fuel cost per liter': 'fuelCostPerLiter',
  'fuel cost': 'fuelCostPerHour',
  'average oil/lubricant consumption (l/hr)': 'lubeAvg',
  'oil/lubricant cost per liter (actual price)': 'lubeCostPerLiter',
  'oil/lubricant cost per liter': 'lubeCostPerLiter',
  'oil/lubricant cost': 'lubeCostPerHour',
  'calculation (fuel variation)': 'ignore',
  'rental rate/operated with fuel & oil/lubricant': 'variableRate',
};

function normalizeAcelRows(rawRows: any[]): ParsedAcelRow[] {
  return rawRows
    .map((row) => {
      const mapped: Partial<ParsedAcelRow> = {};
      for (const [k, v] of Object.entries(row)) {
        const key = headerMap[normalizeHeader(k)];
        if (!key || key === 'ignore') continue;
        if (
          key === 'horsepower' ||
          key === 'fixedRate' ||
          key === 'dryRate' ||
          key === 'fuelLow' ||
          key === 'fuelHigh' ||
          key === 'fuelAvg' ||
          key === 'fuelCostPerLiter' ||
          key === 'fuelCostPerHour' ||
          key === 'lubeAvg' ||
          key === 'lubeCostPerLiter' ||
          key === 'lubeCostPerHour' ||
          key === 'variableRate'
        ) {
          (mapped as any)[key] = toNum(v);
        } else {
          (mapped as any)[key] = String(v ?? '').trim();
        }
      }

      return {
        equipment: String(mapped.equipment || '').trim(),
        description: String(mapped.description || '').trim(),
        category: String(mapped.category || '').trim().toUpperCase(),
        model: String(mapped.model || '').trim(),
        capacity: String(mapped.capacity || '').trim(),
        horsepower: Number(mapped.horsepower || 0),
        fixedRate: Number(mapped.fixedRate || 0),
        basePrice: Number(mapped.basePrice || 0),
        dryRate: Number(mapped.dryRate || mapped.basePrice || 0),
        fuelLow: Number(mapped.fuelLow || 0),
        fuelHigh: Number(mapped.fuelHigh || 0),
        fuelAvg: Number(mapped.fuelAvg || 0),
        fuelCostPerLiter: Number(mapped.fuelCostPerLiter || 0),
        fuelCostPerHour: Number(mapped.fuelCostPerHour || 0),
        lubeAvg: Number(mapped.lubeAvg || 0),
        lubeCostPerLiter: Number(mapped.lubeCostPerLiter || 0),
        lubeCostPerHour: Number(mapped.lubeCostPerHour || 0),
        variableRate: Number(mapped.variableRate || mapped.basePrice || 0),
      } satisfies ParsedAcelRow;
    })
    .filter((row) => row.equipment && (row.fixedRate > 0 || row.basePrice > 0 || row.variableRate > 0));
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const contentType = request.headers.get('content-type') || '';
    let edition = '';
    let csvData = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      edition = String(formData.get('edition') || '').trim().toUpperCase();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ success: false, error: 'CSV file is required' }, { status: 400 });
      }
      csvData = (await file.text()).trim();
    } else {
      const body = await request.json();
      edition = String(body?.edition || '').trim().toUpperCase();
      csvData = String(body?.csvData || '').trim();
    }

    if (!edition) return NextResponse.json({ success: false, error: 'edition is required' }, { status: 400 });
    if (!csvData) return NextResponse.json({ success: false, error: 'csvData is required' }, { status: 400 });

    const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
    if (parsed.errors.length > 0) {
      return NextResponse.json({ success: false, error: parsed.errors[0].message }, { status: 400 });
    }

    const rows = normalizeAcelRows(parsed.data as any[]);
    if (!rows.length) {
      return NextResponse.json({ success: false, error: 'No valid ACEL rows found' }, { status: 400 });
    }

    const maxNoDoc = await Equipment.findOne().sort({ no: -1 }).select('no').lean();
    let nextNo = Number(maxNoDoc?.no || 0) + 1;

    let equipmentCreated = 0;
    let equipmentMatched = 0;
    let fixedRatesUpserted = 0;
    let variableRatesUpserted = 0;
    let skippedRows = 0;

    for (const row of rows) {
      let equipment = await Equipment.findOne({
        description: row.description || row.equipment,
        equipmentModel: row.model,
        capacity: row.capacity,
      });

      if (!equipment) {
        equipment = await Equipment.create({
          no: nextNo,
          description: row.description || row.equipment,
          completeDescription: row.description || row.equipment,
          equipmentModel: row.model,
          capacity: row.capacity,
          flywheelHorsepower: row.horsepower,
          fuelConsumptionAvgLph: row.fuelAvg || 0,
          lubeConsumptionAvgLph: row.lubeAvg || 0,
        });
        nextNo += 1;
        equipmentCreated += 1;
      } else {
        const patch: Record<string, unknown> = {};
        if (!equipment.completeDescription) patch.completeDescription = row.description || row.equipment;
        if (!equipment.equipmentModel && row.model) patch.equipmentModel = row.model;
        if (!equipment.capacity && row.capacity) patch.capacity = row.capacity;
        if ((!equipment.flywheelHorsepower || equipment.flywheelHorsepower === 0) && row.horsepower > 0) {
          patch.flywheelHorsepower = row.horsepower;
        }
        if (row.fuelAvg > 0) {
          patch.fuelConsumptionAvgLph = row.fuelAvg;
        }
        if (row.lubeAvg > 0) {
          patch.lubeConsumptionAvgLph = row.lubeAvg;
        }
        if (Object.keys(patch).length > 0) {
          await Equipment.updateOne({ _id: equipment._id }, { $set: patch });
        }
        equipmentMatched += 1;
      }

      if (row.fixedRate <= 0 && row.variableRate <= 0) {
        skippedRows += 1;
        continue;
      }

      const equipmentId = equipment._id;
      await EquipmentRate.updateOne(
        { equipmentId, edition, mode: 'fixed' },
        {
          $set: {
            category: row.category,
            source: 'acel',
            ratePerHour: row.fixedRate || row.variableRate,
            dryRate: row.dryRate || row.fixedRate || row.variableRate,
            isActive: true,
          },
        },
        { upsert: true }
      );
      fixedRatesUpserted += 1;

      await EquipmentRate.updateOne(
        { equipmentId, edition, mode: 'variable_fuel_lube' },
        {
          $set: {
            category: row.category,
            source: 'acel',
            ratePerHour: row.variableRate || row.basePrice || row.fixedRate,
            dryRate: row.basePrice || row.dryRate || row.fixedRate,
            fuel: {
              lowLph: row.fuelLow,
              highLph: row.fuelHigh,
              avgLph: row.fuelAvg,
              unitCostPerLiter: row.fuelCostPerLiter,
              costPerHour: row.fuelCostPerHour,
            },
            lube: {
              avgLph: row.lubeAvg,
              unitCostPerLiter: row.lubeCostPerLiter,
              costPerHour: row.lubeCostPerHour,
            },
            isActive: true,
          },
        },
        { upsert: true }
      );
      variableRatesUpserted += 1;
    }

    return NextResponse.json({
      success: true,
      message: 'ACEL CSV import completed',
      summary: {
        parsedRows: rows.length,
        equipmentCreated,
        equipmentMatched,
        fixedRatesUpserted,
        variableRatesUpserted,
        skippedRows,
        edition,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to import ACEL rates CSV' },
      { status: 500 }
    );
  }
}
