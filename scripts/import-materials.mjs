import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/upa-estimating';

// Simple CSV parser
function parseCSV(content) {
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const data = [];

  let currentLine = '';
  let inQuotes = false;

  for (let i = 1; i < lines.length; i++) {
    currentLine += lines[i];

    // Count quotes to determine if we're inside a quoted field
    const quoteCount = (currentLine.match(/"/g) || []).length;
    inQuotes = quoteCount % 2 !== 0;

    if (!inQuotes && currentLine.trim()) {
      const values = [];
      let current = '';
      let insideQuote = false;

      for (let j = 0; j < currentLine.length; j++) {
        const char = currentLine[j];

        if (char === '"') {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      if (values.length === headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index].replace(/^"|"$/g, '').trim();
        });
        data.push(row);
      }

      currentLine = '';
    } else if (!currentLine.trim()) {
      currentLine = '';
    }
  }

  return data;
}

// Material Schema
const MaterialSchema = new mongoose.Schema({
  materialCode: { type: String, required: true, unique: true, trim: true, index: true },
  materialDescription: { type: String, required: true, trim: true },
  unit: { type: String, required: true, trim: true },
  basePrice: { type: Number, required: true, default: 0 },
  category: { type: String, default: '', index: true },
  specification: { type: String, default: '' },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

const Material = mongoose.models.Material || mongoose.model('Material', MaterialSchema);

async function importMaterials() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Read CSV file
    const csvPath = path.join(__dirname, '../REFERENCE/Materials Database.csv');
    console.log(`📖 Reading CSV from: ${csvPath}`);

    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parseCSV(fileContent);

    console.log(`📊 Found ${records.length} records in CSV`);

    // Clear existing materials
    console.log('🗑️  Clearing existing materials...');
    await Material.collection.drop().catch(() => {});
    console.log('✅ Cleared existing materials');

    // Transform and insert materials
    console.log('💾 Inserting materials...');

    const materials = records.map(record => ({
      materialCode: record['Material Code'] || '',
      materialDescription: record['Material Description'] || '',
      unit: record['Unit'] || '',
      basePrice: parseFloat(record['Price'].replace(/"/g, '').replace(/,/g, '')) || 0,
      isActive: true,
    })).filter(item => item.materialCode && item.materialDescription);

    console.log(`📝 Prepared ${materials.length} valid material items`);

    // Insert in batches
    const batchSize = 100;
    let inserted = 0;
    let failed = 0;

    for (let i = 0; i < materials.length; i += batchSize) {
      const batch = materials.slice(i, i + batchSize);
      try {
        await Material.insertMany(batch, { ordered: false });
        inserted += batch.length;
        console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${inserted}/${materials.length}`);
      } catch (error) {
        console.error(`❌ Failed batch ${Math.floor(i / batchSize) + 1}:`, error.message);
        failed += batch.length;
      }
    }

    console.log(`\n📊 IMPORT SUMMARY:`);
    console.log(`   Total records in CSV: ${records.length}`);
    console.log(`   Valid records: ${materials.length}`);
    console.log(`   ✅ Successfully inserted: ${inserted}`);
    console.log(`   ❌ Failed: ${failed}`);

    const totalInDB = await Material.countDocuments();
    console.log(`✅ Total materials in database: ${totalInDB}`);

    // Sample records
    const samples = await Material.find().limit(5).select('materialCode materialDescription basePrice unit').lean();
    console.log(`\n📋 Sample records:`);
    samples.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.materialCode} - ${item.materialDescription} - ₱${item.basePrice} per ${item.unit}`);
    });

    console.log('\n✅ Import completed successfully!');
  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    console.log('🎉 Done!');
  }
}

importMaterials();