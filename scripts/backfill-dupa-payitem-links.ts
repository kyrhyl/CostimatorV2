import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const [{ default: dbConnect }, { default: DUPATemplate }, { default: PayItem }, { normalizePayItemNumber }] = await Promise.all([
    import('../src/lib/db/connect'),
    import('../src/models/DUPATemplate'),
    import('../src/models/PayItem'),
    import('../src/lib/costing/utils/normalize-pay-item'),
  ]);

  await dbConnect();

  const templates = await DUPATemplate.find({}).select(
    '_id payItemId payItemNumber payItemDescription unitOfMeasurement part category normalizedPayItemNumber'
  );

  const payItems = await PayItem.find({}).select('_id payItemNumber normalizedPayItemNumber description unit part isActive').lean();

  const payItemById = new Map(payItems.map((item: any) => [String(item._id), item]));
  const payItemByNormalized = new Map<string, any>();
  for (const item of payItems) {
    const normalized = String(item.normalizedPayItemNumber || normalizePayItemNumber(String(item.payItemNumber || '')) || '').trim();
    if (normalized && !payItemByNormalized.has(normalized)) {
      payItemByNormalized.set(normalized, item);
    }
  }

  const unresolved: Array<Record<string, unknown>> = [];
  const mismatches: Array<Record<string, unknown>> = [];
  let updatedCount = 0;
  let alreadyLinkedCount = 0;

  for (const template of templates) {
    const currentPayItem = template.payItemId ? payItemById.get(String(template.payItemId)) : null;
    const normalized = String(template.normalizedPayItemNumber || normalizePayItemNumber(String(template.payItemNumber || '')) || '').trim();
    const matchedPayItem = currentPayItem || payItemByNormalized.get(normalized);

    if (!matchedPayItem) {
      unresolved.push({
        templateId: String(template._id),
        payItemNumber: template.payItemNumber,
        normalizedPayItemNumber: normalized,
        payItemDescription: template.payItemDescription,
      });
      continue;
    }

    const desired = {
      payItemId: matchedPayItem._id,
      payItemNumber: String(matchedPayItem.payItemNumber || '').trim(),
      payItemDescription: String(matchedPayItem.description || '').trim(),
      unitOfMeasurement: String(matchedPayItem.unit || '').trim(),
      part: String(matchedPayItem.part || '').trim(),
    };

    const needsUpdate =
      String(template.payItemId || '') !== String(desired.payItemId) ||
      String(template.payItemNumber || '').trim() !== desired.payItemNumber ||
      String(template.payItemDescription || '').trim() !== desired.payItemDescription ||
      String(template.unitOfMeasurement || '').trim() !== desired.unitOfMeasurement ||
      String(template.part || '').trim() !== desired.part;

    if (!needsUpdate) {
      alreadyLinkedCount += 1;
      continue;
    }

    mismatches.push({
      templateId: String(template._id),
      before: {
        payItemId: template.payItemId,
        payItemNumber: template.payItemNumber,
        payItemDescription: template.payItemDescription,
        unitOfMeasurement: template.unitOfMeasurement,
        part: template.part,
      },
      after: desired,
    });

    template.payItemId = desired.payItemId;
    template.payItemNumber = desired.payItemNumber;
    template.payItemDescription = desired.payItemDescription;
    template.unitOfMeasurement = desired.unitOfMeasurement;
    template.part = desired.part;
    template.payItemSnapshotDate = new Date();
    await template.save();
    updatedCount += 1;
  }

  console.log(
    JSON.stringify(
      {
        totalTemplates: templates.length,
        totalPayItems: payItems.length,
        updatedCount,
        alreadyLinkedCount,
        unresolvedCount: unresolved.length,
        unresolved,
        sampleMismatches: mismatches.slice(0, 20),
      },
      null,
      2,
    ),
  );

  if (unresolved.length > 0) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
