import mongoose from 'mongoose';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/costimator';

// DUPA Template Schema
const DUPATemplateSchema = new mongoose.Schema({
  payItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'PayItem' },
  payItemNumber: { type: String, required: true, unique: true },
  payItemDescription: { type: String, required: true },
  unitOfMeasurement: { type: String, required: true },
  outputPerHour: { type: Number, required: true },
  
  laborTemplate: [{
    designation: String,
    noOfPersons: Number,
    noOfHours: Number,
  }],
  
  equipmentTemplate: [{
    equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment' },
    description: String,
    noOfUnits: Number,
    noOfHours: Number,
  }],
  
  materialTemplate: [{
    materialCode: String,
    description: String,
    unit: String,
    quantity: Number,
  }],
  
  ocmPercentage: { type: Number, default: 15 },
  cpPercentage: { type: Number, default: 10 },
  vatPercentage: { type: Number, default: 12 },
  includeMinorTools: { type: Boolean, default: true },
  minorToolsPercentage: { type: Number, default: 10 },
  
  category: String,
  specification: String,
  notes: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const DUPATemplate = mongoose.models.DUPATemplate || mongoose.model('DUPATemplate', DUPATemplateSchema);

// Earthwork template enhancements
const earthworkTemplates = [
  {
    payItemNumber: '800 (1)',
    outputPerHour: 120,  // m²/hour for clearing and grubbing
    laborTemplate: [
      { designation: 'Foreman', noOfPersons: 1, noOfHours: 1 },
      { designation: 'Equipment Operator', noOfPersons: 1, noOfHours: 1 },
      { designation: 'Unskilled Labor', noOfPersons: 3, noOfHours: 1 },
    ],
    equipmentTemplate: [
      { description: 'Bulldozer D6 or equivalent', noOfUnits: 1, noOfHours: 1 },
      { description: 'Chainsaw', noOfUnits: 1, noOfHours: 0.5 },
    ],
    materialTemplate: [
      { description: 'Diesel Fuel', unit: 'Liter', quantity: 15 },
      { description: 'Gasoline (for chainsaw)', unit: 'Liter', quantity: 1 },
    ],
    specification: 'Clearing and Grubbing of vegetation, roots, and debris',
    notes: 'Includes removal of trees, shrubs, stumps, and organic matter. Disposal of cleared materials included.',
  },
  {
    payItemNumber: '800 (2)',
    outputPerHour: 1,  // Lump sum - per project
    laborTemplate: [
      { designation: 'Foreman', noOfPersons: 1, noOfHours: 40 },
      { designation: 'Equipment Operator', noOfPersons: 1, noOfHours: 40 },
      { designation: 'Unskilled Labor', noOfPersons: 3, noOfHours: 40 },
    ],
    equipmentTemplate: [
      { description: 'Bulldozer D6 or equivalent', noOfUnits: 1, noOfHours: 40 },
      { description: 'Chainsaw', noOfUnits: 1, noOfHours: 20 },
      { description: 'Dump Truck 6m³', noOfUnits: 1, noOfHours: 20 },
    ],
    materialTemplate: [
      { description: 'Diesel Fuel', unit: 'Liter', quantity: 600 },
      { description: 'Gasoline (for chainsaw)', unit: 'Liter', quantity: 40 },
    ],
    specification: 'Clearing and Grubbing - Lump Sum',
    notes: 'Based on estimated 40 hours of work. Adjust labor and equipment hours based on actual site conditions.',
  },
  {
    payItemNumber: '802 (1) a',
    outputPerHour: 25,  // m³/hour for common excavation
    laborTemplate: [
      { designation: 'Foreman', noOfPersons: 1, noOfHours: 1 },
      { designation: 'Equipment Operator', noOfPersons: 1, noOfHours: 1 },
      { designation: 'Unskilled Labor', noOfPersons: 2, noOfHours: 1 },
    ],
    equipmentTemplate: [
      { description: 'Hydraulic Excavator 1.0 m³', noOfUnits: 1, noOfHours: 1 },
      { description: 'Dump Truck 6m³', noOfUnits: 1, noOfHours: 0.8 },
    ],
    materialTemplate: [
      { description: 'Diesel Fuel (Excavator)', unit: 'Liter', quantity: 12 },
      { description: 'Diesel Fuel (Dump Truck)', unit: 'Liter', quantity: 8 },
    ],
    specification: 'Common Excavation in ordinary soil',
    notes: 'Suitable for soft to medium soil conditions. Includes loading and hauling within project site.',
  },
  {
    payItemNumber: '803 (1) a',
    outputPerHour: 30,  // m³/hour for embankment
    laborTemplate: [
      { designation: 'Foreman', noOfPersons: 1, noOfHours: 1 },
      { designation: 'Equipment Operator', noOfPersons: 2, noOfHours: 1 },
      { designation: 'Unskilled Labor', noOfPersons: 3, noOfHours: 1 },
    ],
    equipmentTemplate: [
      { description: 'Motor Grader 140 HP', noOfUnits: 1, noOfHours: 1 },
      { description: 'Vibratory Roller 10T', noOfUnits: 1, noOfHours: 1 },
      { description: 'Water Truck 4000 gal', noOfUnits: 1, noOfHours: 0.5 },
    ],
    materialTemplate: [
      { description: 'Select Fill Material', unit: 'Cubic Meter', quantity: 1.15 },
      { description: 'Water', unit: 'Cubic Meter', quantity: 0.05 },
      { description: 'Diesel Fuel (Grader)', unit: 'Liter', quantity: 10 },
      { description: 'Diesel Fuel (Roller)', unit: 'Liter', quantity: 8 },
    ],
    specification: 'Embankment with select fill material, compacted in layers',
    notes: 'Material quantity includes 15% swell factor. Compaction to 95% Modified Proctor density.',
  },
  {
    payItemNumber: '804 (1)',
    outputPerHour: 40,  // m³/hour for subgrade preparation
    laborTemplate: [
      { designation: 'Foreman', noOfPersons: 1, noOfHours: 1 },
      { designation: 'Equipment Operator', noOfPersons: 2, noOfHours: 1 },
      { designation: 'Unskilled Labor', noOfPersons: 2, noOfHours: 1 },
    ],
    equipmentTemplate: [
      { description: 'Motor Grader 140 HP', noOfUnits: 1, noOfHours: 1 },
      { description: 'Vibratory Roller 10T', noOfUnits: 1, noOfHours: 1 },
      { description: 'Water Truck 4000 gal', noOfUnits: 1, noOfHours: 0.3 },
    ],
    materialTemplate: [
      { description: 'Water', unit: 'Cubic Meter', quantity: 0.03 },
      { description: 'Diesel Fuel (Grader)', unit: 'Liter', quantity: 9 },
      { description: 'Diesel Fuel (Roller)', unit: 'Liter', quantity: 7 },
    ],
    specification: 'Subgrade Preparation for pavement base',
    notes: 'Includes scarifying, pulverizing, shaping, and compacting existing subgrade to 95% density.',
  },
];

async function populateEarthworkTemplates() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    let updated = 0;
    let failed = 0;
    const errors = [];

    for (const template of earthworkTemplates) {
      try {
        console.log(`\n📝 Updating template: ${template.payItemNumber}...`);
        
        const result = await DUPATemplate.findOneAndUpdate(
          { payItemNumber: template.payItemNumber },
          {
            $set: {
              outputPerHour: template.outputPerHour,
              laborTemplate: template.laborTemplate,
              equipmentTemplate: template.equipmentTemplate,
              materialTemplate: template.materialTemplate,
              specification: template.specification,
              notes: template.notes,
            }
          },
          { new: true }
        );

        if (result) {
          console.log(`✅ Updated ${template.payItemNumber}: ${result.payItemDescription}`);
          updated++;
        } else {
          console.log(`⚠️  Template not found: ${template.payItemNumber}`);
          failed++;
        }
      } catch (err) {
        console.error(`❌ Error updating ${template.payItemNumber}:`, err.message);
        errors.push({ payItemNumber: template.payItemNumber, error: err.message });
        failed++;
      }
    }

    console.log('\n📊 UPDATE SUMMARY:');
    console.log(`   Templates to update: ${earthworkTemplates.length}`);
    console.log(`   ✅ Successfully updated: ${updated}`);
    console.log(`   ❌ Failed: ${failed}`);

    if (errors.length > 0) {
      console.log('\n⚠️  ERRORS:');
      errors.forEach(err => {
        console.log(`   - ${err.payItemNumber}: ${err.error}`);
      });
    }

    console.log('\n✅ Earthwork template population completed!');
    
  } catch (error) {
    console.error('❌ Error populating earthwork templates:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the population
populateEarthworkTemplates()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
