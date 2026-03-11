/**
 * Seed Script for DPWH Cost Estimator
 * Populates initial master data: Labor Rates, Equipment, Materials, Material Prices
 * 
 * Usage: node --import tsx scripts/seed.ts
 * Or: npm run seed (add to package.json scripts)
 */

// @ts-nocheck
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });
console.log('CWD:', process.cwd());
console.log('MONGODB_URI:', process.env.MONGODB_URI);

// Wait for dotenv to load before importing db-dependent modules
import mongoose from 'mongoose';
import dbConnect from '../src/lib/db/connect.js';

// Import models
import LaborRate from '../src/models/LaborRate.js';
import Equipment from '../src/models/Equipment.js';
import Material from '../src/models/Material.js';
import MaterialPrice from '../src/models/MaterialPrice.js';

const BUKIDNON_LOCATION = 'Malaybalay City, Bukidnon';
const EFFECTIVE_DATE = new Date('2024-01-01');

// DPWH Standard Labor Rates (Bukidnon Region)
const laborRates = [
  {
    location: 'Malaybalay City, Bukidnon',
    district: 'Bukidnon 1st',
    foreman: 95.00,
    leadman: 85.00,
    equipmentOperatorHeavy: 85.00,
    equipmentOperatorHighSkilled: 80.00,
    equipmentOperatorLightSkilled: 75.00,
    driver: 75.00,
    laborSkilled: 75.00,
    laborSemiSkilled: 70.00,
    laborUnskilled: 60.00,
    effectiveDate: EFFECTIVE_DATE,
  },
];

// Common Construction Equipment
const equipment = [
  {
    no: 1,
    completeDescription: 'Hydraulic backhoe loader',
    description: 'Backhoe',
    equipmentModel: '',
    capacity: '',
    flywheelHorsepower: 0,
    rentalRate: 850.00,
    hourlyRate: 850.00,
  },
  {
    no: 2,
    completeDescription: '6-wheeler dump truck',
    description: 'Dump Truck',
    equipmentModel: '',
    capacity: '6-wheeler',
    flywheelHorsepower: 0,
    rentalRate: 750.00,
    hourlyRate: 750.00,
  },
  {
    no: 3,
    completeDescription: 'Portable concrete mixer (1 bag capacity)',
    description: 'Concrete Mixer',
    equipmentModel: '',
    capacity: '1 bag',
    flywheelHorsepower: 0,
    rentalRate: 120.00,
    hourlyRate: 120.00,
  },
  {
    no: 4,
    completeDescription: 'Plate compactor',
    description: 'Compactor',
    equipmentModel: '',
    capacity: '',
    flywheelHorsepower: 0,
    rentalRate: 200.00,
    hourlyRate: 200.00,
  },
  {
    no: 5,
    completeDescription: 'Arc welding machine',
    description: 'Welding Machine',
    equipmentModel: '',
    capacity: '',
    flywheelHorsepower: 0,
    rentalRate: 150.00,
    hourlyRate: 150.00,
  },
  {
    no: 6,
    completeDescription: '2-inch water pump',
    description: 'Water Pump',
    equipmentModel: '',
    capacity: '2-inch',
    flywheelHorsepower: 0,
    rentalRate: 100.00,
    hourlyRate: 100.00,
  },
  {
    no: 7,
    completeDescription: 'Motor grader',
    description: 'Grader',
    equipmentModel: '',
    capacity: '',
    flywheelHorsepower: 0,
    rentalRate: 1200.00,
    hourlyRate: 1200.00,
  },
  {
    no: 8,
    completeDescription: 'Immersion concrete vibrator',
    description: 'Concrete Vibrator',
    equipmentModel: '',
    capacity: '',
    flywheelHorsepower: 0,
    rentalRate: 80.00,
    hourlyRate: 80.00,
  },
];

// Common Construction Materials
const materials = [
  {
    materialCode: 'MAT-001',
    materialDescription: 'Type I Portland Cement, 40kg bag',
    unit: 'BAG',
    basePrice: 285.00,
    category: 'MG01',
    includeHauling: true,
    isActive: true,
  },
  {
    materialCode: 'MAT-002',
    materialDescription: 'Washed sand for concrete',
    unit: 'CU.M.',
    basePrice: 850.00,
    category: 'MG01',
    includeHauling: true,
    isActive: true,
  },
  {
    materialCode: 'MAT-003',
    materialDescription: 'Crushed gravel, 3/4 inch',
    unit: 'CU.M.',
    basePrice: 950.00,
    category: 'MG01',
    includeHauling: true,
    isActive: true,
  },
  {
    materialCode: 'MAT-004',
    materialDescription: 'Grade 40 deformed steel bar, 12mm diameter',
    unit: 'KG',
    basePrice: 52.00,
    category: 'MG02',
    includeHauling: true,
    isActive: true,
  },
  {
    materialCode: 'MAT-005',
    materialDescription: 'Grade 40 deformed steel bar, 16mm diameter',
    unit: 'KG',
    basePrice: 54.00,
    category: 'MG02',
    includeHauling: true,
    isActive: true,
  },
  {
    materialCode: 'MAT-006',
    materialDescription: 'Marine plywood for formwork, 1/4 inch',
    unit: 'SHEET',
    basePrice: 720.00,
    category: 'MG03',
    includeHauling: true,
    isActive: true,
  },
  {
    materialCode: 'MAT-007',
    materialDescription: 'Dressed lumber 2x4',
    unit: 'BD.FT.',
    basePrice: 45.00,
    category: 'MG03',
    includeHauling: true,
    isActive: true,
  },
  {
    materialCode: 'MAT-008',
    materialDescription: 'Latex paint for exterior, weather-resistant',
    unit: 'GALLON',
    basePrice: 1250.00,
    category: 'MG04',
    includeHauling: false,
    isActive: true,
  },
  {
    materialCode: 'MAT-009',
    materialDescription: 'Concrete hollow blocks, 4 inch (100mm x 200mm x 400mm)',
    unit: 'PCS',
    basePrice: 12.50,
    category: 'MG05',
    includeHauling: true,
    isActive: true,
  },
  {
    materialCode: 'MAT-010',
    materialDescription: 'Pre-mixed cement mortar, 40kg bag',
    unit: 'BAG',
    basePrice: 195.00,
    category: 'MG01',
    includeHauling: true,
    isActive: true,
  },
];

// Material Prices for Bukidnon Location
const materialPrices = [
  {
    materialCode: 'MAT-001',
    description: 'Type I Portland Cement, 40kg bag',
    unit: 'BAG',
    location: BUKIDNON_LOCATION,
    unitCost: 285.00,
    brand: 'Republic Cement',
    specification: 'Conforms to ASTM C150',
    supplier: 'Market Survey 2024',
    effectiveDate: EFFECTIVE_DATE,
  },
  {
    materialCode: 'MAT-002',
    description: 'Washed sand for concrete',
    unit: 'CU.M.',
    location: BUKIDNON_LOCATION,
    unitCost: 850.00,
    brand: '',
    specification: 'Conforms to ASTM C33',
    supplier: 'Local Quarry',
    effectiveDate: EFFECTIVE_DATE,
  },
  {
    materialCode: 'MAT-003',
    description: 'Crushed gravel, 3/4 inch',
    unit: 'CU.M.',
    location: BUKIDNON_LOCATION,
    unitCost: 950.00,
    brand: '',
    specification: 'Conforms to ASTM C33',
    supplier: 'Local Quarry',
    effectiveDate: EFFECTIVE_DATE,
  },
  {
    materialCode: 'MAT-004',
    description: 'Grade 40 deformed steel bar, 12mm diameter',
    unit: 'KG',
    location: BUKIDNON_LOCATION,
    unitCost: 52.00,
    brand: '',
    specification: 'Conforms to ASTM A615',
    supplier: 'Hardware Store',
    effectiveDate: EFFECTIVE_DATE,
  },
  {
    materialCode: 'MAT-005',
    description: 'Grade 40 deformed steel bar, 16mm diameter',
    unit: 'KG',
    location: BUKIDNON_LOCATION,
    unitCost: 54.00,
    brand: '',
    specification: 'Conforms to ASTM A615',
    supplier: 'Hardware Store',
    effectiveDate: EFFECTIVE_DATE,
  },
  {
    materialCode: 'MAT-006',
    description: 'Marine plywood for formwork, 1/4 inch',
    unit: 'SHEET',
    location: BUKIDNON_LOCATION,
    unitCost: 720.00,
    brand: '',
    specification: '4ft x 8ft',
    supplier: 'Hardware Store',
    effectiveDate: EFFECTIVE_DATE,
  },
  {
    materialCode: 'MAT-007',
    description: 'Dressed lumber 2x4',
    unit: 'BD.FT.',
    location: BUKIDNON_LOCATION,
    unitCost: 45.00,
    brand: '',
    specification: 'S4S',
    supplier: 'Lumber Yard',
    effectiveDate: EFFECTIVE_DATE,
  },
  {
    materialCode: 'MAT-008',
    description: 'Latex paint for exterior, weather-resistant',
    unit: 'GALLON',
    location: BUKIDNON_LOCATION,
    unitCost: 1250.00,
    brand: 'Boysen',
    specification: 'Weather-resistant',
    supplier: 'Hardware Store',
    effectiveDate: EFFECTIVE_DATE,
  },
  {
    materialCode: 'MAT-009',
    description: 'Concrete hollow blocks, 4 inch',
    unit: 'PCS',
    location: BUKIDNON_LOCATION,
    unitCost: 12.50,
    brand: '',
    specification: '100mm x 200mm x 400mm',
    supplier: 'Local Supplier',
    effectiveDate: EFFECTIVE_DATE,
  },
  {
    materialCode: 'MAT-010',
    description: 'Pre-mixed cement mortar, 40kg bag',
    unit: 'BAG',
    location: BUKIDNON_LOCATION,
    unitCost: 195.00,
    brand: '',
    specification: '40kg bag',
    supplier: 'Hardware Store',
    effectiveDate: EFFECTIVE_DATE,
  },
];

async function seed() {
  console.log('🌱 Starting seed process...\n');

  try {
    // Connect to database
    await dbConnect();
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data (optional - comment out to keep existing data)
    console.log('🗑️  Clearing existing data...');
    await LaborRate.collection.drop().catch(() => {}); // Ignore if collection doesn't exist
    await Equipment.collection.drop().catch(() => {});
    await Material.collection.drop().catch(() => {});
    await MaterialPrice.collection.drop().catch(() => {});
    console.log('✅ Existing data cleared\n');

    // Seed Labor Rates
    console.log('👷 Seeding Labor Rates...');
    await LaborRate.insertMany(laborRates);
    console.log(`✅ ${laborRates.length} labor rates inserted\n`);

    // Seed Equipment
    console.log('🚜 Seeding Equipment...');
    await Equipment.insertMany(equipment);
    console.log(`✅ ${equipment.length} equipment items inserted\n`);

    // Seed Materials
    console.log('🧱 Seeding Materials...');
    await Material.insertMany(materials);
    console.log(`✅ ${materials.length} materials inserted\n`);

    // Seed Material Prices
    console.log('💰 Seeding Material Prices...');
    await MaterialPrice.insertMany(materialPrices);
    console.log(`✅ ${materialPrices.length} material prices inserted\n`);

    console.log('🎉 Seed process completed successfully!');
    console.log('\nSummary:');
    console.log(`  - Labor Rates: ${laborRates.length}`);
    console.log(`  - Equipment: ${equipment.length}`);
    console.log(`  - Materials: ${materials.length}`);
    console.log(`  - Material Prices: ${materialPrices.length}`);
    console.log(`  - Location: ${BUKIDNON_LOCATION}`);
    console.log(`  - Effective Date: ${EFFECTIVE_DATE.toDateString()}\n`);

  } catch (error: unknown) {
    console.error('❌ Seed process failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
  }
}

// Run seed
seed();
