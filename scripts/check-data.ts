// @ts-nocheck
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

import mongoose from 'mongoose';
import LaborRate from '../src/models/LaborRate';
import Equipment from '../src/models/Equipment';
import Material from '../src/models/Material';
import MaterialPrice from '../src/models/MaterialPrice';

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas\n');

    const laborCount = await LaborRate.countDocuments();
    const equipCount = await Equipment.countDocuments();
    const matCount = await Material.countDocuments();
    const priceCount = await MaterialPrice.countDocuments();

    console.log('Data counts:');
    console.log(`- Labor Rates: ${laborCount}`);
    console.log(`- Equipment: ${equipCount}`);
    console.log(`- Materials: ${matCount}`);
    console.log(`- Material Prices: ${priceCount}\n`);

    if (laborCount > 0) {
      const sampleLabor = await LaborRate.findOne().lean();
      console.log('Sample Labor Rate:', sampleLabor);
    }

    if (equipCount > 0) {
      const sampleEquip = await Equipment.findOne().lean();
      console.log('Sample Equipment:', sampleEquip);
    }

    await mongoose.disconnect();
    console.log('\nDatabase connection closed');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error checking data:', errorMessage);
  }
}

checkData();