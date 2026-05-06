import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
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

async function run() {
  const mongoUri = resolveMongoUri();
  await mongoose.connect(mongoUri, { bufferCommands: false });

  const totalBefore = await MaterialPrice.countDocuments({});
  const result = await MaterialPrice.deleteMany({});

  process.stdout.write(
    `CMPD hard reset complete. deleted=${result.deletedCount ?? 0} totalBefore=${totalBefore}\n`
  );

  await mongoose.disconnect();
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    process.stderr.write(`${error?.message || error}\n`);
    process.exit(1);
  });
