import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/upa-estimating';

function getArg(flag, fallback = '') {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

function parseCSV(content) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') {
        i++;
      }
      row.push(field);
      field = '';
      if (row.length > 1 || row[0].trim() !== '') {
        rows.push(row);
      }
      row = [];
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0].trim() !== '') {
      rows.push(row);
    }
  }

  return rows;
}

function normalizeHeader(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
}

function deriveCategory(materialCode) {
  const match = String(materialCode).toUpperCase().match(/^([A-Z]{2}\d{2})/);
  return match ? match[1] : '';
}

async function run() {
  const inputPath = getArg('--input');
  if (!inputPath) {
    console.error('Usage: node scripts/import-material-registry.mjs --input <csv>');
    process.exit(1);
  }

  const csvContent = fs.readFileSync(inputPath, 'utf-8');
  const rows = parseCSV(csvContent);
  if (rows.length === 0) {
    console.error('CSV is empty');
    process.exit(1);
  }

  const headerRow = rows[0].map(normalizeHeader);
  const headerIndex = (name) => headerRow.indexOf(name);

  const codeIndex = headerIndex('material_code') !== -1
    ? headerIndex('material_code')
    : headerIndex('materialcode');
  const descIndex = headerIndex('description');
  const unitIndex = headerIndex('unit');

  if (codeIndex === -1 || descIndex === -1 || unitIndex === -1) {
    console.error('CSV must include material_code, description, and unit columns');
    process.exit(1);
  }

  const MaterialSchema = new mongoose.Schema({
    materialCode: { type: String, required: true, unique: true, trim: true, uppercase: true },
    materialDescription: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true, uppercase: true },
    basePrice: { type: Number, required: true, min: 0 },
    category: { type: String, trim: true, uppercase: true },
    includeHauling: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true }
  }, { timestamps: true });

  const Material = mongoose.models.Material || mongoose.model('Material', MaterialSchema);

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const dataRows = rows.slice(1);
  const operations = [];
  let skipped = 0;

  for (const row of dataRows) {
    const materialCode = String(row[codeIndex] || '').trim().toUpperCase();
    const materialDescription = String(row[descIndex] || '').trim();
    const unit = String(row[unitIndex] || '').trim().toUpperCase();

    if (!materialCode || !materialDescription || !unit) {
      skipped++;
      continue;
    }

    operations.push({
      updateOne: {
        filter: { materialCode },
        update: {
          $set: {
            materialDescription,
            unit,
            category: deriveCategory(materialCode),
            isActive: true
          },
          $setOnInsert: {
            basePrice: 0,
            includeHauling: false
          }
        },
        upsert: true
      }
    });
  }

  if (operations.length === 0) {
    console.log('No valid rows found. Nothing to import.');
    await mongoose.disconnect();
    return;
  }

  console.log(`📦 Upserting ${operations.length} material codes...`);
  const result = await Material.bulkWrite(operations, { ordered: false });

  console.log('✅ Import complete');
  console.log(`Matched: ${result.matchedCount}`);
  console.log(`Upserted: ${result.upsertedCount}`);
  console.log(`Modified: ${result.modifiedCount}`);
  console.log(`Skipped (missing fields): ${skipped}`);

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
}

run().catch((error) => {
  console.error('❌ Import failed:', error);
  process.exit(1);
});
