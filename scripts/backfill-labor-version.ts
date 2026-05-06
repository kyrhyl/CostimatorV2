import dbConnect from '../src/lib/db/connect';
import LaborRate from '../src/models/LaborRate';

async function run() {
  const targetVersion = process.argv[2] || 'LR-LEGACY';

  await dbConnect();

  const result = await LaborRate.updateMany(
    {
      $or: [{ laborVersion: { $exists: false } }, { laborVersion: null }, { laborVersion: '' }],
    },
    {
      $set: {
        laborVersion: targetVersion,
        status: 'published',
        isActive: true,
        publishedAt: new Date(),
      },
    }
  );

  process.stdout.write(
    `Backfill complete. matched=${result.matchedCount} modified=${result.modifiedCount} laborVersion=${targetVersion}\n`
  );
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    process.stderr.write(`${error?.message || error}\n`);
    process.exit(1);
  });
