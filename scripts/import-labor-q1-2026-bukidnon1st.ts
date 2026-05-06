import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import LaborRate from '../src/models/LaborRate';

const laborVersion = 'LR-2026-Q1';
const district = 'Bukidnon 1st';
const effectiveDate = new Date('2025-12-31T00:00:00.000Z');
const validFrom = new Date('2026-01-01T00:00:00.000Z');
const validTo = new Date('2026-03-31T23:59:59.999Z');

const rates = [
  {
    location: 'Cabanglasan',
    foreman: 133.16,
    leadman: 122.32,
    equipmentOperatorHeavy: 111.23,
    equipmentOperatorHighSkilled: 111.23,
    equipmentOperatorLightSkilled: 103.76,
    driver: 96.53,
    laborSkilled: 96.53,
    laborSemiSkilled: 88.97,
    laborUnskilled: 74.51,
  },
  {
    location: 'Impasug-ong',
    foreman: 133.16,
    leadman: 122.32,
    equipmentOperatorHeavy: 111.23,
    equipmentOperatorHighSkilled: 111.23,
    equipmentOperatorLightSkilled: 103.76,
    driver: 96.53,
    laborSkilled: 96.53,
    laborSemiSkilled: 88.97,
    laborUnskilled: 74.51,
  },
  {
    location: 'Lantapan',
    foreman: 133.16,
    leadman: 122.32,
    equipmentOperatorHeavy: 111.23,
    equipmentOperatorHighSkilled: 111.23,
    equipmentOperatorLightSkilled: 103.76,
    driver: 96.53,
    laborSkilled: 96.53,
    laborSemiSkilled: 88.97,
    laborUnskilled: 74.51,
  },
  {
    location: 'San Fernando',
    foreman: 133.16,
    leadman: 122.32,
    equipmentOperatorHeavy: 111.23,
    equipmentOperatorHighSkilled: 111.23,
    equipmentOperatorLightSkilled: 103.76,
    driver: 96.53,
    laborSkilled: 96.53,
    laborSemiSkilled: 88.97,
    laborUnskilled: 74.51,
  },
  {
    location: 'Malaybalay City',
    foreman: 137.51,
    leadman: 126.11,
    equipmentOperatorHeavy: 114.7,
    equipmentOperatorHighSkilled: 114.7,
    equipmentOperatorLightSkilled: 107.01,
    driver: 99.57,
    laborSkilled: 99.57,
    laborSemiSkilled: 91.88,
    laborUnskilled: 76.66,
  },
];

async function run() {
  const directEnvUri = process.env.MONGODB_URI;
  let mongoUri = directEnvUri;

  if (!mongoUri) {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const envRaw = fs.readFileSync(envPath, 'utf8');
      const line = envRaw.split(/\r?\n/).find((entry) => entry.startsWith('MONGODB_URI='));
      if (line) {
        mongoUri = line.slice('MONGODB_URI='.length).trim();
      }
    }
  }

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not available from environment or .env.local');
  }

  await mongoose.connect(mongoUri, { bufferCommands: false });

  let upserted = 0;
  for (const row of rates) {
    await LaborRate.updateOne(
      { location: row.location, district, laborVersion },
      {
        $set: {
          ...row,
          district,
          laborVersion,
          validFrom,
          validTo,
          status: 'published',
          isActive: true,
          publishedAt: new Date(),
          effectiveDate,
        },
      },
      { upsert: true }
    );
    upserted += 1;
  }

  process.stdout.write(`Imported ${upserted} labor rate rows for ${laborVersion} (${district}).\n`);
  await mongoose.disconnect();
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    process.stderr.write(`${error?.message || error}\n`);
    process.exit(1);
  });
