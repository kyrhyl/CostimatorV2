/**
 * Migration Script: Update PART Descriptions in Database
 * Updates the PayItem collection to have correct DPWH part descriptions
 * 
 * Usage: npx tsx scripts/migrate-part-descriptions.ts
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

const PART_FULL_NAMES: Record<string, string> = {
  'PART A': 'PART A: GENERAL',
  'PART B': 'PART B: OTHER GENERAL REQUIREMENTS',
  'PART C': 'PART C: EARTHWORK',
  'PART D': 'PART D: REINFORCED CONCRETE / BUILDINGS',
  'PART E': 'PART E: FINISHINGS AND OTHER CIVIL WORKS',
  'PART F': 'PART F: ELECTRICAL',
  'PART G': 'PART G: MECHANICAL',
};

const PART_SHORT_PATTERNS: Record<string, RegExp> = {
  'PART A': /^ITEM\s+\d+\s*[-–]/i,
  'PART B': /^ITEM\s+100\s*[-–]/i,
  'PART C': /^ITEM\s+800\s*[-–]/i,
  'PART D': /^ITEM\s+9\d{2}\s*[-–]/i,
  'PART E': /^ITEM\s+1000\s*[-–]/i,
  'PART F': /^ITEM\s+1100\s*[-–]/i,
  'PART G': /^ITEM\s+1500\s*[-–]/i,
};

const PayItemSchema = new mongoose.Schema({
  division: { type: String, trim: true },
  part: { type: String, trim: true },
  item: { type: String, trim: true },
  payItemNumber: { type: String, required: true, unique: true, trim: true },
  description: { type: String, required: true, trim: true },
  unit: { type: String, required: true, trim: true },
  trade: { type: String, trim: true },
  category: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const PayItem = mongoose.models.PayItem || mongoose.model('PayItem', PayItemSchema);

async function migratePartDescriptions() {
  console.log('🔄 Starting PART descriptions migration...\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    let updatedCount = 0;
    let skippedCount = 0;
    let partCounts: Record<string, number> = {};

    const payItems = await PayItem.find({ isActive: true }).lean();
    console.log(`📊 Found ${payItems.length} active pay items\n`);

    for (const item of payItems) {
      let targetPart: string | null = null;

      if (item.part) {
        const shortKey = String(item.part).split(':')[0].trim();
        if (PART_FULL_NAMES[shortKey]) {
          targetPart = PART_FULL_NAMES[shortKey];
        }
      }
      if (!targetPart && item.item) {
        for (const [shortPart, pattern] of Object.entries(PART_SHORT_PATTERNS)) {
          if (pattern.test(item.item)) {
            targetPart = PART_FULL_NAMES[shortPart] || shortPart;
            break;
          }
        }
      }

      if (targetPart) {
        const updateResult = await PayItem.updateOne(
          { _id: item._id },
          { $set: { part: targetPart } }
        );

        if (updateResult.modifiedCount > 0) {
          updatedCount++;
          partCounts[targetPart] = (partCounts[targetPart] || 0) + 1;
        } else {
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   - Total Updated: ${updatedCount}`);
    console.log(`   - Skipped: ${skippedCount}`);
    console.log('\n📊 Items by PART:');
    for (const [part, count] of Object.entries(partCounts)) {
      const shortKey = part.split(':')[0].trim();
      const fullName = PART_FULL_NAMES[shortKey] || part;
      console.log(`   - ${fullName}: ${count} items`);
    }

    console.log('\n🎉 Migration completed successfully!');

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
  }
}

migratePartDescriptions();
