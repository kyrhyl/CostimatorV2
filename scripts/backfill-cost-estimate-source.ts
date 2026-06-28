/**
 * Backfill missing CostEstimate.boqSource metadata.
 *
 * Usage:
 *   npm run backfill:estimate-source
 *   npm run backfill:estimate-source -- --dry-run
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

const dryRun = process.argv.includes('--dry-run');

type SourceType = 'boqDatabase' | 'projectBOQ' | 'takeoffVersion' | 'calcRun' | 'manual';

function inferSource(estimate: any): { source: SourceType; sourceRef?: any } {
  if (estimate?.takeoffVersionId) {
    return { source: 'takeoffVersion', sourceRef: estimate.takeoffVersionId };
  }

  const estimateName = String(estimate?.estimateName || '').toLowerCase();
  const createdBy = String(estimate?.createdBy || '').toLowerCase();
  const description = String(estimate?.description || '').toLowerCase();

  if (
    estimateName.includes('manual') ||
    createdBy.includes('manual') ||
    description.includes('manual program of works')
  ) {
    return { source: 'manual' };
  }

  if (typeof estimate?.boqVersion === 'number') {
    return { source: 'boqDatabase' };
  }

  if (description.includes('takeoff version')) {
    return { source: 'takeoffVersion' };
  }

  return { source: 'projectBOQ' };
}

async function run() {
  const [{ default: dbConnect }, { default: CostEstimate }] = await Promise.all([
    import('../src/lib/db/connect.js'),
    import('../src/models/CostEstimate.js'),
  ]);

  await dbConnect();

  const query = {
    $expr: {
      $eq: [{ $ifNull: ['$boqSource', ''] }, ''],
    },
  };

  const estimates = await CostEstimate.find(query).select(
    '_id estimateNumber estimateName description createdBy takeoffVersionId boqVersion boqSource boqSourceRef',
  );

  if (!estimates.length) {
    console.log('No estimates require backfill.');
    return;
  }

  let updated = 0;
  const breakdown: Record<SourceType, number> = {
    manual: 0,
    takeoffVersion: 0,
    boqDatabase: 0,
    projectBOQ: 0,
    calcRun: 0,
  };

  for (const estimate of estimates) {
    const { source, sourceRef } = inferSource(estimate);
    breakdown[source] += 1;

    if (dryRun) {
      console.log(`[DRY RUN] ${estimate.estimateNumber || estimate._id} => ${source}`);
      continue;
    }

    await CostEstimate.updateOne(
      { _id: estimate._id },
      {
        $set: {
          boqSource: source,
          boqSourceRef: sourceRef || null,
        },
      },
    );
    updated += 1;
  }

  console.log(`Processed: ${estimates.length}`);
  if (dryRun) {
    console.log('Dry run only. No updates applied.');
  } else {
    console.log(`Updated: ${updated}`);
  }
  console.log('Inferred source breakdown:', breakdown);
}

run()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
