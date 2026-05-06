import fs from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';
import dbConnect from '../src/lib/db/connect';
import Equipment from '../src/models/Equipment';
import mongoose from 'mongoose';

type ParsedAcelRow = {
  equipment: string;
  model: string;
  capacity: string;
  fuelAvg: number;
  lubeAvg: number;
};

const toNum = (value: unknown): number => {
  const cleaned = String(value ?? '').replace(/[^0-9.\-]/g, '').trim();
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const normalizeHeader = (header: string) => header.toLowerCase().replace(/\s+/g, ' ').trim();

const headerMap: Record<string, keyof ParsedAcelRow | 'ignore'> = {
  equipment: 'equipment',
  model: 'model',
  capacity: 'capacity',
  description: 'ignore',
  'average fuel consumption (l/hr)': 'fuelAvg',
  'average oil/lubricant consumption (l/hr)': 'lubeAvg',
};

function normalizeRows(rawRows: Record<string, unknown>[]): ParsedAcelRow[] {
  return rawRows
    .map((row) => {
      const mapped: Partial<ParsedAcelRow> = {};
      for (const [k, v] of Object.entries(row)) {
        const key = headerMap[normalizeHeader(k)];
        if (!key || key === 'ignore') continue;
        if (key === 'fuelAvg' || key === 'lubeAvg') {
          (mapped as any)[key] = toNum(v);
        } else {
          (mapped as any)[key] = String(v ?? '').trim();
        }
      }

      return {
        equipment: String(mapped.equipment || '').trim(),
        model: String(mapped.model || '').trim(),
        capacity: String(mapped.capacity || '').trim(),
        fuelAvg: Number(mapped.fuelAvg || 0),
        lubeAvg: Number(mapped.lubeAvg || 0),
      };
    })
    .filter((r) => r.equipment && (r.fuelAvg > 0 || r.lubeAvg > 0));
}

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

async function main() {
  const csvPathArg = process.argv[2] || 'resources/ACEL_RATE.csv';
  const csvPath = path.isAbsolute(csvPathArg)
    ? csvPathArg
    : path.join(process.cwd(), csvPathArg);

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found: ${csvPath}`);
  }

  const csvData = fs.readFileSync(csvPath, 'utf8');
  const parsed = Papa.parse<Record<string, unknown>>(csvData, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse error: ${parsed.errors[0].message}`);
  }

  const rows = normalizeRows(parsed.data);
  await dbConnect();

  let matched = 0;
  let updated = 0;
  let unmatched = 0;
  const unmatchedSamples: Array<{ equipment: string; model: string; capacity: string }> = [];

  for (const row of rows) {
    let equipment = await Equipment.findOne({
      description: row.equipment,
      equipmentModel: row.model,
      capacity: row.capacity,
    });

    if (!equipment) {
      equipment = await Equipment.findOne({
        description: row.equipment,
        equipmentModel: row.model,
      });
    }

    if (!equipment) {
      equipment = await Equipment.findOne({
        description: row.equipment,
      });
    }

    if (!equipment) {
      const nDesc = normalizeText(row.equipment);
      const nModel = normalizeText(row.model);
      const nCap = normalizeText(row.capacity);
      const candidates = await Equipment.find({
        description: { $regex: new RegExp(row.equipment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      }).limit(10);
      equipment =
        candidates.find(
          (c) =>
            normalizeText(c.description || '') === nDesc &&
            normalizeText(c.equipmentModel || '') === nModel &&
            normalizeText(c.capacity || '') === nCap
        ) ||
        candidates.find(
          (c) =>
            normalizeText(c.description || '') === nDesc &&
            normalizeText(c.equipmentModel || '') === nModel
        ) ||
        candidates.find((c) => normalizeText(c.description || '') === nDesc) ||
        null;
    }

    if (!equipment) {
      unmatched += 1;
      if (unmatchedSamples.length < 20) {
        unmatchedSamples.push({ equipment: row.equipment, model: row.model, capacity: row.capacity });
      }
      continue;
    }

    matched += 1;
    const nextFuel = row.fuelAvg > 0 ? row.fuelAvg : Number(equipment.fuelConsumptionAvgLph || 0);
    const nextLube = row.lubeAvg > 0 ? row.lubeAvg : Number(equipment.lubeConsumptionAvgLph || 0);

    const changed =
      Number(equipment.fuelConsumptionAvgLph || 0) !== nextFuel ||
      Number(equipment.lubeConsumptionAvgLph || 0) !== nextLube;

    if (changed) {
      equipment.fuelConsumptionAvgLph = nextFuel;
      equipment.lubeConsumptionAvgLph = nextLube;
      await equipment.save();
      updated += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        source: csvPath,
        parsedRows: rows.length,
        matched,
        updated,
        unmatched,
        unmatchedSamples,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
