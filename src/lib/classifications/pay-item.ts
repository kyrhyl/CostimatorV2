import mongoose from 'mongoose';
import { normalizePart } from '@/lib/utils/dpwh-constants';
import PayItem from '@/models/PayItem';
import DUPATemplate from '@/models/DUPATemplate';
import PayItemClassification from '@/models/PayItemClassification';

type ClassificationInput = {
  classificationId?: string;
  part?: string;
  category?: string;
  subCategory?: string;
};

export function normalizeClassificationValue(value?: string | null) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

export function getClassificationDisplayLabel(category?: string | null, subCategory?: string | null) {
  const normalizedCategory = normalizeClassificationValue(category);
  const normalizedSubCategory = normalizeClassificationValue(subCategory);
  return normalizedSubCategory || normalizedCategory;
}

function getNormalizedPart(part?: string | null) {
  const normalized = normalizePart(String(part || '').trim());
  return normalized || String(part || '').trim();
}

function getSourceRecordsFilter() {
  return { $or: [{ category: { $ne: '' } }, { subCategory: { $ne: '' } }] };
}

export async function syncExistingPayItemClassifications() {
  const [payItems, templates] = await Promise.all([
    PayItem.find(getSourceRecordsFilter()).select('part category subCategory').lean(),
    DUPATemplate.find(getSourceRecordsFilter()).select('part category subCategory').lean(),
  ]);

  const records = [...payItems, ...templates];
  const seen = new Map<string, { part: string; category: string; subCategory: string; displayLabel: string }>();

  records.forEach((record: any) => {
    const part = getNormalizedPart(record.part);
    const category = normalizeClassificationValue(record.category);
    const subCategory = normalizeClassificationValue(record.subCategory);
    const displayLabel = getClassificationDisplayLabel(category, subCategory);
    if (!part || !displayLabel) return;
    const key = `${part}::${category}::${subCategory}`;
    if (!seen.has(key)) {
      seen.set(key, { part, category, subCategory, displayLabel });
    }
  });

  if (!seen.size) {
    return [] as any[];
  }

  const operations = Array.from(seen.values()).map((entry, index) => ({
    updateOne: {
      filter: { part: entry.part, category: entry.category, subCategory: entry.subCategory },
      update: {
        $set: {
          displayLabel: entry.displayLabel,
          isActive: true,
          sortOrder: index,
        },
        $setOnInsert: {
          part: entry.part,
          category: entry.category,
          subCategory: entry.subCategory,
        },
      },
      upsert: true,
    },
  }));

  if (operations.length > 0) {
    await PayItemClassification.bulkWrite(operations, { ordered: false });
  }

  return PayItemClassification.find({ isActive: true }).sort({ part: 1, sortOrder: 1, category: 1, subCategory: 1 }).lean();
}

export async function resolveClassificationInput(input: ClassificationInput) {
  const rawClassificationId = String(input.classificationId || '').trim();
  const part = getNormalizedPart(input.part);
  const category = normalizeClassificationValue(input.category);
  const subCategory = normalizeClassificationValue(input.subCategory);

  if (rawClassificationId) {
    if (!mongoose.Types.ObjectId.isValid(rawClassificationId)) {
      throw new Error('Invalid classification selection');
    }
    const classification = await PayItemClassification.findById(rawClassificationId).lean();
    if (!classification || !classification.isActive) {
      throw new Error('Selected classification was not found');
    }
    return {
      classificationId: String(classification._id),
      part: classification.part,
      category: normalizeClassificationValue(classification.category),
      subCategory: normalizeClassificationValue(classification.subCategory),
      displayLabel: classification.displayLabel,
    };
  }

  const displayLabel = getClassificationDisplayLabel(category, subCategory);
  if (!part || !displayLabel) {
    return {
      classificationId: '',
      part,
      category,
      subCategory,
      displayLabel,
    };
  }

  let classification = await PayItemClassification.findOne({ part, category, subCategory }).lean();
  if (!classification) {
    classification = (await PayItemClassification.create({
      part,
      category,
      subCategory,
      displayLabel,
      isActive: true,
    })).toObject();
  }

  return {
    classificationId: String(classification._id),
    part: classification.part,
    category: normalizeClassificationValue(classification.category),
    subCategory: normalizeClassificationValue(classification.subCategory),
    displayLabel: classification.displayLabel,
  };
}

export function requiresClassification(part?: string | null) {
  return getNormalizedPart(part) === 'PART E';
}
