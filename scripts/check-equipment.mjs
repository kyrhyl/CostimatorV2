import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/upa-estimating';

async function checkEquipment() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const Equipment = mongoose.model('Equipment', new mongoose.Schema({}, { strict: false }));
    
    const equipment = await Equipment.find().limit(5).lean();
    
    console.log('\nFirst 5 equipment items:');
    equipment.forEach(eq => {
      console.log(`\nNo: ${eq.no}`);
      console.log(`Description: ${eq.description}`);
      console.log(`Model: ${eq.equipmentModel || 'N/A'}`);
      console.log(`Rental Rate: ₱${eq.rentalRate || 0}`);
      console.log(`Hourly Rate: ₱${eq.hourlyRate || 0}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkEquipment();
