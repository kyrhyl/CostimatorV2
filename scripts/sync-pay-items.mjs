import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/upa-estimating';
const force = process.argv.includes('--force');

function normalizePayItemNumber(payItemNumber = '') {
  return payItemNumber
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s+\./g, '.');
}

function getPartFromItemNumber(itemNumber = '') {
  const match = itemNumber.match(/^(\d+)/);
  const prefix = match ? parseInt(match[1], 10) : 0;

  if (prefix >= 800 && prefix < 900) return 'PART C';
  if (prefix >= 900 && prefix < 1000) return 'PART D';
  if (prefix >= 1000 && prefix < 1100) return 'PART E';
  if (prefix >= 1100 && prefix < 1500) return 'PART F';
  if (prefix >= 1500) return 'PART G';
  return 'PART A';
}

const PayItemSchema = new mongoose.Schema({
  division: { type: String, required: false, trim: true, index: true },
  part: { type: String, required: false, trim: true, index: true },
  item: { type: String, required: false, trim: true, index: true },
  payItemNumber: { type: String, required: true, unique: true, trim: true, index: true },
  normalizedPayItemNumber: { type: String, required: false, trim: true, index: true },
  description: { type: String, required: true, trim: true },
  unit: { type: String, required: true, trim: true },
  trade: { type: String, required: false, trim: true, index: true },
  category: { type: String, required: false, trim: true, index: true },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

const PayItem = mongoose.models.PayItem || mongoose.model('PayItem', PayItemSchema);

async function syncPayItems() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const catalogPath = path.join(__dirname, '../src/data/dpwh-catalog.json');
    const catalogRaw = fs.readFileSync(catalogPath, 'utf-8');
    const catalogData = JSON.parse(catalogRaw);
    const catalogItems = catalogData.items || [];

    console.log(`📦 Catalog items: ${catalogItems.length}`);
    console.log(`⚙️  Mode: ${force ? 'force overwrite' : 'fill missing only'}`);

    const normalizedNumbers = catalogItems.map(item => normalizePayItemNumber(item.itemNumber));
    const itemNumbers = catalogItems.map(item => item.itemNumber);

    const existingPayItems = await PayItem.find({
      $or: [
        { normalizedPayItemNumber: { $in: normalizedNumbers } },
        { payItemNumber: { $in: itemNumbers } },
      ],
    }).lean();

    const existingByNormalized = new Map();
    const duplicateNormalized = new Set();

    for (const item of existingPayItems) {
      const normalized = item.normalizedPayItemNumber || normalizePayItemNumber(item.payItemNumber || '');
      if (existingByNormalized.has(normalized)) {
        duplicateNormalized.add(normalized);
        continue;
      }
      existingByNormalized.set(normalized, item);
    }

    const mismatchCounts = {
      description: 0,
      unit: 0,
      trade: 0,
      category: 0,
      part: 0,
    };

    const mismatchSamples = [];

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const catalogItem of catalogItems) {
      const normalized = normalizePayItemNumber(catalogItem.itemNumber);
      const existing = existingByNormalized.get(normalized);
      const partCode = getPartFromItemNumber(catalogItem.itemNumber);

      if (duplicateNormalized.has(normalized)) {
        skipped += 1;
        continue;
      }

      if (!existing) {
        await PayItem.create({
          payItemNumber: catalogItem.itemNumber,
          normalizedPayItemNumber: normalized,
          description: catalogItem.description,
          unit: catalogItem.unit,
          trade: catalogItem.trade,
          category: catalogItem.category,
          part: partCode,
          isActive: true,
        });
        inserted += 1;
        continue;
      }

      const updates = {};

      if (force) {
        if (existing.normalizedPayItemNumber !== normalized) updates.normalizedPayItemNumber = normalized;
        if (existing.payItemNumber !== catalogItem.itemNumber) updates.payItemNumber = catalogItem.itemNumber;
        if (existing.description !== catalogItem.description) updates.description = catalogItem.description;
        if (existing.unit !== catalogItem.unit) updates.unit = catalogItem.unit;
        if (catalogItem.trade && existing.trade !== catalogItem.trade) updates.trade = catalogItem.trade;
        if (catalogItem.category && existing.category !== catalogItem.category) updates.category = catalogItem.category;
        if (existing.part !== partCode) updates.part = partCode;
      } else {
        if (!existing.normalizedPayItemNumber) updates.normalizedPayItemNumber = normalized;
        if (!existing.description) updates.description = catalogItem.description;
        if (!existing.unit) updates.unit = catalogItem.unit;
        if (!existing.trade && catalogItem.trade) updates.trade = catalogItem.trade;
        if (!existing.category && catalogItem.category) updates.category = catalogItem.category;
        if (!existing.part) updates.part = partCode;
      }

      if (existing.description && existing.description !== catalogItem.description) {
        mismatchCounts.description += 1;
        if (mismatchSamples.length < 100) {
          mismatchSamples.push({
            itemNumber: catalogItem.itemNumber,
            field: 'description',
            catalogValue: catalogItem.description,
            payItemValue: existing.description,
          });
        }
      }

      if (existing.unit && existing.unit !== catalogItem.unit) {
        mismatchCounts.unit += 1;
        if (mismatchSamples.length < 100) {
          mismatchSamples.push({
            itemNumber: catalogItem.itemNumber,
            field: 'unit',
            catalogValue: catalogItem.unit,
            payItemValue: existing.unit,
          });
        }
      }

      if (catalogItem.trade && existing.trade && existing.trade !== catalogItem.trade) {
        mismatchCounts.trade += 1;
        if (mismatchSamples.length < 100) {
          mismatchSamples.push({
            itemNumber: catalogItem.itemNumber,
            field: 'trade',
            catalogValue: catalogItem.trade,
            payItemValue: existing.trade,
          });
        }
      }

      if (catalogItem.category && existing.category && existing.category !== catalogItem.category) {
        mismatchCounts.category += 1;
        if (mismatchSamples.length < 100) {
          mismatchSamples.push({
            itemNumber: catalogItem.itemNumber,
            field: 'category',
            catalogValue: catalogItem.category,
            payItemValue: existing.category,
          });
        }
      }

      if (existing.part && existing.part !== partCode) {
        mismatchCounts.part += 1;
        if (mismatchSamples.length < 100) {
          mismatchSamples.push({
            itemNumber: catalogItem.itemNumber,
            field: 'part',
            catalogValue: partCode,
            payItemValue: existing.part,
          });
        }
      }

      if (Object.keys(updates).length > 0) {
        await PayItem.updateOne({ _id: existing._id }, { $set: updates });
        updated += 1;
      } else {
        skipped += 1;
      }
    }

    console.log('\n✅ Sync complete');
    console.log(`   Inserted: ${inserted}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Duplicate normalized: ${duplicateNormalized.size}`);
    console.log('   Mismatch counts:', mismatchCounts);

    if (mismatchSamples.length > 0) {
      console.log('\n⚠️  Mismatch samples (up to 10):');
      mismatchSamples.slice(0, 10).forEach(sample => {
        console.log(`   - ${sample.itemNumber} [${sample.field}] catalog="${sample.catalogValue}" payItem="${sample.payItemValue}"`);
      });
    }
  } catch (error) {
    console.error('❌ Sync failed:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

syncPayItems();
