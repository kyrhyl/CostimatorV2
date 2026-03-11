import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/upa-estimating';

function parseCsvLine(line) {
  const values = [];
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

  values.push(current.trim());
  return values;
}

function normalizeHeader(header) {
  return header
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function parseNumber(value) {
  if (!value) return 0;
  const cleaned = value.replace(/"/g, '').replace(/,/g, '').replace(/\s+/g, '');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

const EquipmentSchema = new mongoose.Schema({
  no: { type: Number, required: true, unique: true },
  completeDescription: { type: String, required: true },
  description: { type: String, required: true },
  equipmentModel: { type: String, default: '' },
  capacity: { type: String, default: '' },
  flywheelHorsepower: { type: Number, default: 0 },
  rentalRate: { type: Number, required: true, default: 0 },
  hourlyRate: { type: Number, required: true, default: 0 },
}, { timestamps: true });

const Equipment = mongoose.models.Equipment || mongoose.model('Equipment', EquipmentSchema);

async function importEquipment(csvPath) {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  console.log(`📖 Reading CSV from: ${csvPath}`);
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split(/\r?\n/);

  const headerIndex = lines.findIndex(line => {
    const lower = line.toLowerCase();
    return lower.includes('no') && lower.includes('complete description') && lower.includes('description');
  });

  if (headerIndex === -1) {
    throw new Error('CSV header not found. Expected columns like "NO, Complete Description, DESCRIPTION".');
  }

  const headers = parseCsvLine(lines[headerIndex]).map(h => normalizeHeader(h.replace(/^"|"$/g, '')));

  const headerMap = {
    'no': 'no',
    '#': 'no',
    'complete description': 'completeDescription',
    'description': 'description',
    'model': 'equipmentModel',
    'capacity': 'capacity',
    'rental rates': 'rentalRate',
    'rental rate': 'rentalRate',
  };

  const equipmentData = [];
  const warnings = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCsvLine(lines[i]);
    const equipment = {};

    for (let j = 0; j < headers.length && j < values.length; j++) {
      const headerKey = headerMap[headers[j]];
      if (!headerKey) continue;
      const rawValue = values[j].trim();

      if (headerKey === 'no') {
        const num = parseInt(rawValue.replace(/"/g, ''), 10);
        if (Number.isFinite(num)) equipment.no = num;
      } else if (headerKey === 'rentalRate') {
        equipment.rentalRate = parseNumber(rawValue);
      } else {
        const cleaned = rawValue.replace(/^"|"$/g, '').trim();
        if (cleaned) equipment[headerKey] = cleaned;
      }
    }

    if (!equipment.no) {
      continue;
    }

    if (!equipment.description && !equipment.completeDescription) {
      warnings.push(`Line ${i + 1}: Missing description for equipment #${equipment.no}`);
      continue;
    }

    if (!equipment.completeDescription) equipment.completeDescription = equipment.description;
    if (!equipment.description) equipment.description = equipment.completeDescription;

    equipment.equipmentModel = equipment.equipmentModel || '';
    equipment.capacity = equipment.capacity || '';
    equipment.flywheelHorsepower = equipment.flywheelHorsepower || 0;
    equipment.rentalRate = equipment.rentalRate || 0;
    equipment.hourlyRate = equipment.rentalRate;

    equipmentData.push(equipment);
  }

  console.log(`📝 Prepared ${equipmentData.length} equipment items`);

  if (equipmentData.length === 0) {
    throw new Error('No valid equipment rows found to import.');
  }

  const ops = equipmentData.map(item => ({
    updateOne: {
      filter: { no: item.no },
      update: { $set: item },
      upsert: true,
    }
  }));

  const result = await Equipment.bulkWrite(ops, { ordered: false });

  console.log('✅ Import complete');
  console.log(`   Matched: ${result.matchedCount}`);
  console.log(`   Modified: ${result.modifiedCount}`);
  console.log(`   Upserted: ${result.upsertedCount}`);

  if (warnings.length > 0) {
    console.log(`⚠️  Warnings: ${warnings.length}`);
  }
}

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node scripts/import-equipment-from-csv.mjs <csv-path>');
  process.exit(1);
}

importEquipment(csvPath)
  .catch(err => {
    console.error('❌ Import failed:', err.message || err);
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  });
