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

// Concrete work template enhancements
const concreteTemplates = [
  {
    payItemNumber: '900 (1) a',
    outputPerHour: 3.5,  // m³/hour for structural concrete 3000 psi
    laborTemplate: [
      { designation: 'Foreman', noOfPersons: 1, noOfHours: 1 },
      { designation: 'Skilled Labor (Mason)', noOfPersons: 2, noOfHours: 1 },
      { designation: 'Unskilled Labor', noOfPersons: 4, noOfHours: 1 },
    ],
    equipmentTemplate: [
      { description: 'Concrete Mixer (10/7 cu.ft)', noOfUnits: 1, noOfHours: 1 },
      { description: 'Concrete Vibrator', noOfUnits: 1, noOfHours: 1 },
    ],
    materialTemplate: [
      { description: 'Portland Cement Type I, 40 kg/bag', unit: 'Bag', quantity: 7.5 },
      { description: 'Sand', unit: 'Cubic Meter', quantity: 0.5 },
      { description: 'Gravel 3/4"', unit: 'Cubic Meter', quantity: 0.8 },
      { description: 'Water', unit: 'Cubic Meter', quantity: 0.15 },
    ],
    specification: 'Structural Concrete 3000 psi Class A with 7 days curing',
    notes: 'Mix proportion: 1:2:4 (cement:sand:gravel). Water-cement ratio: 0.50. Slump: 3"-4"',
  },
  {
    payItemNumber: '900 (1) c',
    outputPerHour: 3.0,  // m³/hour for structural concrete 3000 psi 28 days
    laborTemplate: [
      { designation: 'Foreman', noOfPersons: 1, noOfHours: 1 },
      { designation: 'Skilled Labor (Mason)', noOfPersons: 2, noOfHours: 1 },
      { designation: 'Unskilled Labor', noOfPersons: 4, noOfHours: 1 },
    ],
    equipmentTemplate: [
      { description: 'Concrete Mixer (10/7 cu.ft)', noOfUnits: 1, noOfHours: 1 },
      { description: 'Concrete Vibrator', noOfUnits: 1, noOfHours: 1 },
    ],
    materialTemplate: [
      { description: 'Portland Cement Type I, 40 kg/bag', unit: 'Bag', quantity: 7.5 },
      { description: 'Sand', unit: 'Cubic Meter', quantity: 0.5 },
      { description: 'Gravel 3/4"', unit: 'Cubic Meter', quantity: 0.8 },
      { description: 'Water', unit: 'Cubic Meter', quantity: 0.15 },
    ],
    specification: 'Structural Concrete 3000 psi Class A with 28 days curing',
    notes: 'Mix proportion: 1:2:4 (cement:sand:gravel). Water-cement ratio: 0.50. Slump: 3"-4". Requires 28 days proper curing.',
  },
  {
    payItemNumber: '900 (1) d',
    outputPerHour: 2.8,  // m³/hour for higher strength concrete 4000 psi
    laborTemplate: [
      { designation: 'Foreman', noOfPersons: 1, noOfHours: 1 },
      { designation: 'Skilled Labor (Mason)', noOfPersons: 2, noOfHours: 1 },
      { designation: 'Unskilled Labor', noOfPersons: 5, noOfHours: 1 },
    ],
    equipmentTemplate: [
      { description: 'Concrete Mixer (10/7 cu.ft)', noOfUnits: 1, noOfHours: 1 },
      { description: 'Concrete Vibrator', noOfUnits: 2, noOfHours: 1 },
    ],
    materialTemplate: [
      { description: 'Portland Cement Type I, 40 kg/bag', unit: 'Bag', quantity: 8.5 },
      { description: 'Sand', unit: 'Cubic Meter', quantity: 0.45 },
      { description: 'Gravel 3/4"', unit: 'Cubic Meter', quantity: 0.75 },
      { description: 'Water', unit: 'Cubic Meter', quantity: 0.14 },
    ],
    specification: 'Structural Concrete 4000 psi Class A with 28 days curing',
    notes: 'Higher strength mix proportion: 1:1.8:3.5 (cement:sand:gravel). Water-cement ratio: 0.45. Slump: 2"-3".',
  },
  {
    payItemNumber: '900 (1) e',
    outputPerHour: 2.5,  // m³/hour for 5000 psi
    laborTemplate: [
      { designation: 'Foreman', noOfPersons: 1, noOfHours: 1 },
      { designation: 'Skilled Labor (Mason)', noOfPersons: 3, noOfHours: 1 },
      { designation: 'Unskilled Labor', noOfPersons: 5, noOfHours: 1 },
    ],
    equipmentTemplate: [
      { description: 'Concrete Mixer (10/7 cu.ft)', noOfUnits: 1, noOfHours: 1 },
      { description: 'Concrete Vibrator', noOfUnits: 2, noOfHours: 1 },
    ],
    materialTemplate: [
      { description: 'Portland Cement Type I, 40 kg/bag', unit: 'Bag', quantity: 9.5 },
      { description: 'Sand', unit: 'Cubic Meter', quantity: 0.42 },
      { description: 'Gravel 3/4"', unit: 'Cubic Meter', quantity: 0.72 },
      { description: 'Water', unit: 'Cubic Meter', quantity: 0.13 },
      { description: 'Water Reducer Admixture', unit: 'Liter', quantity: 0.5 },
    ],
    specification: 'Structural Concrete 5000 psi Class A with 28 days curing',
    notes: 'High strength mix with admixture. Mix proportion: 1:1.6:3.2. Water-cement ratio: 0.40. Requires proper curing.',
  },
  {
    payItemNumber: '901 (1)',
    outputPerHour: 5.0,  // m³/hour for lean concrete (simpler mix)
    laborTemplate: [
      { designation: 'Foreman', noOfPersons: 1, noOfHours: 1 },
      { designation: 'Skilled Labor (Mason)', noOfPersons: 1, noOfHours: 1 },
      { designation: 'Unskilled Labor', noOfPersons: 3, noOfHours: 1 },
    ],
    equipmentTemplate: [
      { description: 'Concrete Mixer (10/7 cu.ft)', noOfUnits: 1, noOfHours: 1 },
    ],
    materialTemplate: [
      { description: 'Portland Cement Type I, 40 kg/bag', unit: 'Bag', quantity: 4.0 },
      { description: 'Sand', unit: 'Cubic Meter', quantity: 0.6 },
      { description: 'Gravel 3/4"', unit: 'Cubic Meter', quantity: 0.9 },
      { description: 'Water', unit: 'Cubic Meter', quantity: 0.15 },
    ],
    specification: 'Lean Concrete for bedding and filling',
    notes: 'Lower strength mix proportion: 1:3:6 (cement:sand:gravel). Used for leveling and bedding.',
  },
];

async function populateConcreteTemplates() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    let updated = 0;
    let failed = 0;
    const errors = [];

    for (const template of concreteTemplates) {
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
    console.log(`   Templates to update: ${concreteTemplates.length}`);
    console.log(`   ✅ Successfully updated: ${updated}`);
    console.log(`   ❌ Failed: ${failed}`);

    if (errors.length > 0) {
      console.log('\n⚠️  ERRORS:');
      errors.forEach(err => {
        console.log(`   - ${err.payItemNumber}: ${err.error}`);
      });
    }

    console.log('\n✅ Concrete template population completed!');
    
  } catch (error) {
    console.error('❌ Error populating concrete templates:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the population
populateConcreteTemplates()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
