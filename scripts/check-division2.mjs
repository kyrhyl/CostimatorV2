import mongoose from 'mongoose';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const partA = await db.collection('payitems').find({ part: /^PART A/i }).limit(3).project({ payItemNumber: 1, part: 1, division: 1 }).toArray();
  console.log('PART A:');
  partA.forEach(i => console.log('  ' + i.payItemNumber + ' | div: "' + (i.division || '') + '"'));

  const partB = await db.collection('payitems').find({ part: /^PART B/i }).limit(3).project({ payItemNumber: 1, part: 1, division: 1 }).toArray();
  console.log('PART B:');
  partB.forEach(i => console.log('  ' + i.payItemNumber + ' | div: "' + (i.division || '') + '"'));

  // Count empty division for both
  const emptyA = await db.collection('payitems').countDocuments({ part: /^PART A/i, $or: [{ division: { $exists: false } }, { division: '' }, { division: null }] });
  const emptyB = await db.collection('payitems').countDocuments({ part: /^PART B/i, $or: [{ division: { $exists: false } }, { division: '' }, { division: null }] });
  console.log('\nPART A with missing/empty division: ' + emptyA);
  console.log('PART B with missing/empty division: ' + emptyB);

  // Show all distinct division values
  const allDivs = await db.collection('payitems').distinct('division');
  console.log('All distinct division values:', allDivs);

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
