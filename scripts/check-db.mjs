// Quick database diagnostic script
// Run with: node scripts/check-db.mjs
// Make sure to set MONGODB_URI environment variable first

import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to read .env.local file
let MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  try {
    const envFile = readFileSync(join(__dirname, '../.env.local'), 'utf-8');
    const match = envFile.match(/MONGODB_URI=(.+)/);
    if (match) {
      MONGODB_URI = match[1].trim();
    }
  } catch (err) {
    // File doesn't exist or can't be read
  }
}

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

console.log('🔍 Connecting to database...');
console.log('URI:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials

try {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to database\n');

  // Get database name
  const dbName = mongoose.connection.db.databaseName;
  console.log('📊 Database:', dbName);

  // List all collections
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('\n📁 Collections in database:');
  collections.forEach(col => console.log(`  - ${col.name}`));

  // Check equipment collection
  console.log('\n🚜 Equipment Collection:');
  const equipmentCount = await mongoose.connection.db.collection('equipment').countDocuments();
  console.log(`  Total documents: ${equipmentCount}`);

  if (equipmentCount > 0) {
    const sample = await mongoose.connection.db.collection('equipment').findOne();
    console.log('\n  Sample document:');
    console.log('  ', JSON.stringify(sample, null, 2).split('\n').join('\n  '));
  }

  // Check other master data collections
  const checks = [
    { name: 'materials', display: '🧱 Materials' },
    { name: 'laborrates', display: '👷 Labor Rates' },
    { name: 'payitems', display: '📋 Pay Items' }
  ];

  for (const check of checks) {
    try {
      const count = await mongoose.connection.db.collection(check.name).countDocuments();
      console.log(`\n${check.display} Collection:`);
      console.log(`  Total documents: ${count}`);
    } catch (err) {
      console.log(`\n${check.display} Collection: Not found`);
    }
  }

} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await mongoose.disconnect();
  console.log('\n👋 Disconnected from database');
}
