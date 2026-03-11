import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/upa-estimating';

// PayItem Schema
const PayItemSchema = new mongoose.Schema({
  division: { type: String, required: false, trim: true, index: true },
  part: { type: String, required: false, trim: true, index: true },
  item: { type: String, required: false, trim: true, index: true },
  payItemNumber: { type: String, required: true, unique: true, trim: true, index: true },
  description: { type: String, required: true, trim: true },
  unit: { type: String, required: true, trim: true },
  trade: { type: String, required: false, trim: true, index: true },
  category: { type: String, required: false, trim: true, index: true },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

const PayItem = mongoose.models.PayItem || mongoose.model('PayItem', PayItemSchema);

async function importPayItems() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Read JSON file
    const jsonPath = path.join(__dirname, '../src/data/payitems-import.json');
    console.log(`📖 Reading JSON from: ${jsonPath}`);
    
    const fileContent = fs.readFileSync(jsonPath, 'utf-8');
    const lines = fileContent.trim().split('\n');
    
    console.log(`📊 Found ${lines.length} records in JSON`);

    // Clear existing pay items
    console.log('🗑️  Clearing existing pay items...');
    await PayItem.deleteMany({});
    console.log('✅ Cleared existing pay items');

    // Parse and insert pay items
    console.log('💾 Inserting pay items...');
    
    const payItems = lines
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          console.warn(`⚠️  Failed to parse line: ${line.substring(0, 50)}...`);
          return null;
        }
      })
      .filter(item => item && item.payItemNumber && item.description);

    console.log(`📝 Prepared ${payItems.length} valid pay items`);
    
    // Log unique categories
    const categories = [...new Set(payItems.map(item => item.category).filter(c => c))].sort();
    console.log(`📋 Categories found (${categories.length}):`, categories.slice(0, 10), '...');
    
    // Log unique trades
    const trades = [...new Set(payItems.map(item => item.trade).filter(t => t))].sort();
    console.log(`📋 Trades found (${trades.length}):`, trades);

    // Insert in batches
    const batchSize = 100;
    let inserted = 0;
    let failed = 0;
    const errors = [];

    for (let i = 0; i < payItems.length; i += batchSize) {
      const batch = payItems.slice(i, i + batchSize);
      try {
        await PayItem.insertMany(batch, { ordered: false });
        inserted += batch.length;
        console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${inserted}/${payItems.length}`);
      } catch (error) {
        // Handle duplicate key errors
        if (error.writeErrors) {
          const successCount = batch.length - error.writeErrors.length;
          inserted += successCount;
          failed += error.writeErrors.length;
          errors.push(...error.writeErrors.map(e => ({
            payItemNumber: batch[e.index]?.payItemNumber,
            error: e.errmsg
          })));
          console.log(`⚠️  Batch ${Math.floor(i / batchSize) + 1}: ${successCount} inserted, ${error.writeErrors.length} failed`);
        } else {
          failed += batch.length;
          console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, error.message);
        }
      }
    }

    console.log('\n📊 IMPORT SUMMARY:');
    console.log(`   Total records in JSON: ${lines.length}`);
    console.log(`   Valid records: ${payItems.length}`);
    console.log(`   ✅ Successfully inserted: ${inserted}`);
    console.log(`   ❌ Failed: ${failed}`);

    if (errors.length > 0 && errors.length <= 10) {
      console.log('\n⚠️  ERRORS:');
      errors.forEach(err => {
        console.log(`   - ${err.payItemNumber}: ${err.error}`);
      });
    } else if (errors.length > 10) {
      console.log(`\n⚠️  ${errors.length} errors occurred (showing first 5):`);
      errors.slice(0, 5).forEach(err => {
        console.log(`   - ${err.payItemNumber}: ${err.error}`);
      });
    }

    // Verify data
    const totalInDB = await PayItem.countDocuments();
    console.log(`\n✅ Total pay items in database: ${totalInDB}`);

    // Sample some records
    const samples = await PayItem.find().limit(5).lean();
    console.log('\n📋 Sample records:');
    samples.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item.payItemNumber} - ${item.description.substring(0, 60)}...`);
    });

    console.log('\n✅ Import completed successfully!');
    
  } catch (error) {
    console.error('❌ Error importing pay items:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the import
importPayItems()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
