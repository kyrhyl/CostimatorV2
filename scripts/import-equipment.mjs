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

// Equipment Schema
const EquipmentSchema = new mongoose.Schema({
  no: { type: Number, required: true, unique: true },
  completeDescription: { type: String, required: true },
  description: { type: String, required: true },
  equipmentModel: { type: String, default: '' },
  capacity: { type: String, default: '' },
  flywheelHorsepower: { type: Number, default: 0 },
  rentalRate: { type: Number, required: true, default: 0 },
  hourlyRate: { type: Number, required: true },
}, { timestamps: true });

const Equipment = mongoose.models.Equipment || mongoose.model('Equipment', EquipmentSchema);

async function importEquipment() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Read CSV file
    const csvPath = path.join(__dirname, '../REFERENCE/equipmentdatabase.csv');
    console.log(`📖 Reading CSV from: ${csvPath}`);

    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parseCSV(fileContent);

    console.log(`📊 Found ${records.length} records in CSV`);

    // Clear existing equipment
    console.log('🗑️  Clearing existing equipment...');
    await Equipment.collection.drop().catch(() => {});
    console.log('✅ Cleared existing equipment');

    // Transform and insert equipment
    console.log('💾 Inserting equipment...');

    const equipment = records.map(record => ({
      no: parseInt(record['NO']) || 0,
      completeDescription: record['Complete Description'] || '',
      description: record['DESCRIPTION'] || '',
      equipmentModel: record['MODEL'] || '',
      capacity: record['CAPACITY'] || '',
      flywheelHorsepower: parseFloat(record['FLYWHEEL HORSEPOWER']) || 0,
      rentalRate: parseFloat(record['RENTAL RATES'].replace(/"/g, '').replace(/,/g, '')) || 0,
      hourlyRate: 0, // Default, can be calculated later
    })).filter(item => item.no > 0 && item.completeDescription);

    console.log(`📝 Prepared ${equipment.length} valid equipment items`);

    // Insert in batches
    const batchSize = 100;
    let inserted = 0;
    let failed = 0;

    for (let i = 0; i < equipment.length; i += batchSize) {
      const batch = equipment.slice(i, i + batchSize);
      try {
        await Equipment.insertMany(batch, { ordered: false });
        inserted += batch.length;
        console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${inserted}/${equipment.length}`);
      } catch (error) {
        console.error(`❌ Failed batch ${Math.floor(i / batchSize) + 1}:`, error.message);
        failed += batch.length;
      }
    }

    console.log(`\n📊 IMPORT SUMMARY:`);
    console.log(`   Total records in CSV: ${records.length}`);
    console.log(`   Valid records: ${equipment.length}`);
    console.log(`   ✅ Successfully inserted: ${inserted}`);
    console.log(`   ❌ Failed: ${failed}`);

    const totalInDB = await Equipment.countDocuments();
    console.log(`✅ Total equipment in database: ${totalInDB}`);

    // Sample records
    const samples = await Equipment.find().limit(5).select('no completeDescription rentalRate').lean();
    console.log(`\n📋 Sample records:`);
    samples.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.no} - ${item.completeDescription} - ₱${item.rentalRate}`);
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

importEquipment();