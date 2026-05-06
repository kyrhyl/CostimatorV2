import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Material from '../src/models/Material';
import MaterialPrice from '../src/models/MaterialPrice';

dotenv.config({ path: '.env.local' });
dotenv.config();

function resolveMongoUri(): string {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envRaw = fs.readFileSync(envPath, 'utf8');
    const line = envRaw.split(/\r?\n/).find((entry) => entry.startsWith('MONGODB_URI='));
    if (line) return line.slice('MONGODB_URI='.length).trim();
  }
  throw new Error('MONGODB_URI is not available from environment or .env.local');
}

const fix = (s: string) => s.replace(/\uFFFD/g, 'φ');

async function run() {
  await mongoose.connect(resolveMongoUri(), { bufferCommands: false });

  const mats = await Material.find({ materialDescription: /�/ }).select('_id materialDescription unit').lean();
  for (const m of mats) {
    await Material.updateOne(
      { _id: m._id },
      {
        $set: {
          materialDescription: fix(String((m as any).materialDescription || '')),
          unit: fix(String((m as any).unit || '')),
        },
      }
    );
  }

  const prices = await MaterialPrice.find({ $or: [{ description: /�/ }, { unit: /�/ }] })
    .select('_id description unit')
    .lean();
  for (const p of prices) {
    await MaterialPrice.updateOne(
      { _id: p._id },
      {
        $set: {
          description: fix(String((p as any).description || '')),
          unit: fix(String((p as any).unit || '')),
        },
      }
    );
  }

  process.stdout.write(`Normalized replacement character to phi. materials=${mats.length}, prices=${prices.length}\n`);
  await mongoose.disconnect();
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    process.stderr.write(`${error?.message || error}\n`);
    process.exit(1);
  });
