/**
 * Quick script to check PayItem collection
 * Usage: npx tsx scripts/check-payitems.ts
 */

// @ts-nocheck
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

import mongoose from 'mongoose';
import dbConnect from '../src/lib/db/connect.js';
import PayItem from '../src/models/PayItem.js';

async function checkPayItems() {
  try {
    await dbConnect();
    console.log('✅ Connected to MongoDB\n');

    // Count total pay items
    const total = await PayItem.countDocuments();
    console.log(`Total PayItems: ${total}\n`);

    // Count active pay items
    const activeCount = await PayItem.countDocuments({ isActive: true });
    console.log(`Active PayItems: ${activeCount}\n`);

    // Show sample pay items
    const samples = await PayItem.find().limit(5).lean();
    console.log('Sample PayItems:');
    samples.forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.payItemNumber} - ${item.description}`);
      console.log(`   Unit: ${item.unit}, Part: ${item.part || 'N/A'}, Active: ${item.isActive}`);
    });

    // Show unique parts
    const parts = await PayItem.distinct('part');
    console.log(`\nUnique Parts (${parts.length}):`);
    console.log(parts.filter(Boolean).sort().join(', '));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

checkPayItems();
