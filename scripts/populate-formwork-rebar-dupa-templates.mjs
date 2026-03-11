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

// Formwork and Rebar template enhancements
const formworkAndRebarTemplates = [
  {
    payItemNumber: '1002 (1)',
    outputPerHour: 12,  // m²/hour for formwork
    laborTemplate: [
      { designation: 'Foreman', noOfPersons: 1, noOfHours: 1 },
      { designation: 'Skilled Labor (Carpenter)', noOfPersons: 3, noOfHours: 1 },
      { designation: 'Unskilled Labor', noOfPersons: 3, noOfHours: 1 },
    ],
    equipmentTemplate: [
      { description: 'Portable Power Saw', noOfUnits: 1, noOfHours: 0.5 },
      { description: 'Electric Drill', noOfUnits: 2, noOfHours: 0.5 },
    ],
    materialTemplate: [
      { description: 'Plywood 12mm Marine Grade', unit: 'Sheet (4x8 ft)', quantity: 0.32 },
      { description: 'Lumber 2x4x12 ft', unit: 'Piece', quantity: 1.5 },
      { description: 'Form Oil', unit: 'Liter', quantity: 0.1 },
      { description: 'Common Wire Nails 3"', unit: 'Kilogram', quantity: 0.3 },
      { description: 'Form Tie', unit: 'Piece', quantity: 2.5 },
    ],
    specification: 'Formwork for walls, columns, and beams',
    notes: 'Includes fabrication, installation, and stripping. Material quantities allow for multiple uses (5 times average).',
  },
  {
    payItemNumber: '1003 (1)',
    outputPerHour: 15,  // m²/hour for slab formwork
    laborTemplate: [
      { designation: 'Foreman', noOfPersons: 1, noOfHours: 1 },
      { designation: 'Skilled Labor (Carpenter)', noOfPersons: 2, noOfHours: 1 },
      { designation: 'Unskilled Labor', noOfPersons: 3, noOfHours: 1 },
    ],
    equipmentTemplate: [
      { description: 'Portable Power Saw', noOfUnits: 1, noOfHours: 0.3 },
    ],
    materialTemplate: [
      { description: 'Plywood 12mm Marine Grade', unit: 'Sheet (4x8 ft)', quantity: 0.32 },
      { description: 'Lumber 2x3x12 ft', unit: 'Piece', quantity: 1.2 },
      { description: 'Form Oil', unit: 'Liter', quantity: 0.08 },
      { description: 'Common Wire Nails 2.5"', unit: 'Kilogram', quantity: 0.25 },
    ],
    specification: 'Formwork for concrete slabs',
    notes: 'Simpler than wall/column formwork. Material quantities allow for multiple uses.',
  },
  {
    payItemNumber: '1001 (1)',
    outputPerHour: 120,  // kg/hour for rebar installation
    laborTemplate: [
      { designation: 'Foreman', noOfPersons: 1, noOfHours: 1 },
      { designation: 'Skilled Labor (Rebar Worker)', noOfPersons: 3, noOfHours: 1 },
      { designation: 'Unskilled Labor', noOfPersons: 2, noOfHours: 1 },
    ],
    equipmentTemplate: [
      { description: 'Rebar Bending Machine', noOfUnits: 1, noOfHours: 0.5 },
      { description: 'Rebar Cutter', noOfUnits: 1, noOfHours: 0.5 },
    ],
    materialTemplate: [
      { description: 'Deformed Steel Bar (Various Sizes)', unit: 'Kilogram', quantity: 1.05 },
      { description: 'Tie Wire #16', unit: 'Kilogram', quantity: 0.02 },
      { description: 'Concrete Spacers/Chairs', unit: 'Piece', quantity: 3 },
    ],
    specification: 'Reinforcing Steel Bars - Cutting, Bending, and Placement',
    notes: 'Material quantity includes 5% waste allowance. Includes all cutting, bending, tying, and placing activities.',
  },
  {
    payItemNumber: '1001 (2)',
    outputPerHour: 100,  // kg/hour for epoxy-coated rebar
    laborTemplate: [
      { designation: 'Foreman', noOfPersons: 1, noOfHours: 1 },
      { designation: 'Skilled Labor (Rebar Worker)', noOfPersons: 3, noOfHours: 1 },
      { designation: 'Unskilled Labor', noOfPersons: 2, noOfHours: 1 },
    ],
    equipmentTemplate: [
      { description: 'Rebar Bending Machine', noOfUnits: 1, noOfHours: 0.5 },
      { description: 'Rebar Cutter', noOfUnits: 1, noOfHours: 0.5 },
    ],
    materialTemplate: [
      { description: 'Epoxy-Coated Deformed Steel Bar', unit: 'Kilogram', quantity: 1.05 },
      { description: 'Plastic-Coated Tie Wire', unit: 'Kilogram', quantity: 0.02 },
      { description: 'Non-Metallic Spacers/Chairs', unit: 'Piece', quantity: 3 },
    ],
    specification: 'Epoxy-Coated Reinforcing Steel Bars',
    notes: 'Lower productivity than regular rebar due to special handling requirements. Avoid damage to coating.',
  },
];

async function populateFormworkRebarTemplates() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    let updated = 0;
    let failed = 0;
    const errors = [];

    for (const template of formworkAndRebarTemplates) {
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
    console.log(`   Templates to update: ${formworkAndRebarTemplates.length}`);
    console.log(`   ✅ Successfully updated: ${updated}`);
    console.log(`   ❌ Failed: ${failed}`);

    if (errors.length > 0) {
      console.log('\n⚠️  ERRORS:');
      errors.forEach(err => {
        console.log(`   - ${err.payItemNumber}: ${err.error}`);
      });
    }

    console.log('\n✅ Formwork and Rebar template population completed!');
    
  } catch (error) {
    console.error('❌ Error populating formwork/rebar templates:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the population
populateFormworkRebarTemplates()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
