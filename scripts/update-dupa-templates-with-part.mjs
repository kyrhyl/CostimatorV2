import mongoose from 'mongoose';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/costimator';

// PayItem Schema
const PayItemSchema = new mongoose.Schema({
  division: String,
  part: String,
  item: String,
  payItemNumber: { type: String, unique: true },
  description: String,
  unit: String,
  trade: String,
  category: String,
  isActive: Boolean,
}, { timestamps: true });

const PayItem = mongoose.models.PayItem || mongoose.model('PayItem', PayItemSchema);

// DUPA Template Schema  
const DUPATemplateSchema = new mongoose.Schema({
  payItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'PayItem' },
  payItemNumber: String,
  part: String,
  // ... other fields
}, { timestamps: true });

const DUPATemplate = mongoose.models.DUPATemplate || mongoose.model('DUPATemplate', DUPATemplateSchema);

async function updateTemplatesWithPart() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all DUPA templates
    const templates = await DUPATemplate.find({}).lean();
    console.log(`📊 Found ${templates.length} DUPA templates`);

    let updated = 0;
    let failed = 0;
    const errors = [];

    for (const template of templates) {
      try {
        // Find corresponding pay item
        const payItem = await PayItem.findOne({ 
          payItemNumber: template.payItemNumber 
        }).lean();

        if (payItem && payItem.part) {
          // Update template with part
          await DUPATemplate.findByIdAndUpdate(template._id, {
            $set: { part: payItem.part }
          });
          updated++;
          
          if (updated % 100 === 0) {
            console.log(`✅ Updated ${updated}/${templates.length} templates...`);
          }
        } else {
          console.log(`⚠️  No pay item found for: ${template.payItemNumber}`);
          failed++;
        }
      } catch (err) {
        console.error(`❌ Error updating ${template.payItemNumber}:`, err.message);
        errors.push({ payItemNumber: template.payItemNumber, error: err.message });
        failed++;
      }
    }

    console.log('\n📊 UPDATE SUMMARY:');
    console.log(`   Total templates: ${templates.length}`);
    console.log(`   ✅ Successfully updated: ${updated}`);
    console.log(`   ❌ Failed: ${failed}`);

    if (errors.length > 0 && errors.length <= 10) {
      console.log('\n⚠️  ERRORS:');
      errors.forEach(err => {
        console.log(`   - ${err.payItemNumber}: ${err.error}`);
      });
    }

    console.log('\n✅ Part field update completed!');
    
  } catch (error) {
    console.error('❌ Error updating templates:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the update
updateTemplatesWithPart()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
