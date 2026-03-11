import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import PayItem from '@/models/PayItem';
import catalogData from '@/data/dpwh-catalog.json';
import type { DPWHCatalogItem } from '@/types';
import { classifyDPWHItem } from '@/lib/dpwhClassification';
import { normalizePayItemNumber } from '@/lib/costing/utils/normalize-pay-item';

const catalogItems = catalogData.items as DPWHCatalogItem[];

type MismatchSample = {
  itemNumber: string;
  field: 'description' | 'unit' | 'trade' | 'category' | 'part';
  catalogValue: string;
  payItemValue: string;
};

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const force = searchParams.get('force') === 'true';

    const normalizedNumbers = catalogItems.map(item => normalizePayItemNumber(item.itemNumber));
    const itemNumbers = catalogItems.map(item => item.itemNumber);

    const existingPayItems = await PayItem.find({
      $or: [
        { normalizedPayItemNumber: { $in: normalizedNumbers } },
        { payItemNumber: { $in: itemNumbers } },
      ],
    }).lean();

    const existingByNormalized = new Map<string, any>();
    const duplicateNormalized = new Set<string>();

    for (const item of existingPayItems) {
      const normalized = item.normalizedPayItemNumber || normalizePayItemNumber(item.payItemNumber || '');
      if (existingByNormalized.has(normalized)) {
        duplicateNormalized.add(normalized);
        continue;
      }
      existingByNormalized.set(normalized, item);
    }

    const mismatchSamples: MismatchSample[] = [];
    const mismatchCounts = {
      description: 0,
      unit: 0,
      trade: 0,
      category: 0,
      part: 0,
    };

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const catalogItem of catalogItems) {
      const normalized = normalizePayItemNumber(catalogItem.itemNumber);
      const existing = existingByNormalized.get(normalized);
      const partCode = classifyDPWHItem(catalogItem.itemNumber, catalogItem.category).part.split(':')[0];

      if (duplicateNormalized.has(normalized)) {
        skipped += 1;
        continue;
      }

      if (!existing) {
        await PayItem.create({
          payItemNumber: catalogItem.itemNumber,
          normalizedPayItemNumber: normalized,
          description: catalogItem.description,
          unit: catalogItem.unit,
          trade: catalogItem.trade,
          category: catalogItem.category,
          part: partCode,
          isActive: true,
        });
        inserted += 1;
        continue;
      }

      const updates: Record<string, any> = {};

      if (force) {
        if (existing.normalizedPayItemNumber !== normalized) {
          updates.normalizedPayItemNumber = normalized;
        }
        if (existing.payItemNumber !== catalogItem.itemNumber) {
          updates.payItemNumber = catalogItem.itemNumber;
        }
        if (existing.description !== catalogItem.description) {
          updates.description = catalogItem.description;
        }
        if (existing.unit !== catalogItem.unit) {
          updates.unit = catalogItem.unit;
        }
        if (catalogItem.trade && existing.trade !== catalogItem.trade) {
          updates.trade = catalogItem.trade;
        }
        if (catalogItem.category && existing.category !== catalogItem.category) {
          updates.category = catalogItem.category;
        }
        if (existing.part !== partCode) {
          updates.part = partCode;
        }
      } else {
        if (!existing.normalizedPayItemNumber) updates.normalizedPayItemNumber = normalized;
        if (!existing.description) updates.description = catalogItem.description;
        if (!existing.unit) updates.unit = catalogItem.unit;
        if (!existing.trade && catalogItem.trade) updates.trade = catalogItem.trade;
        if (!existing.category && catalogItem.category) updates.category = catalogItem.category;
        if (!existing.part) updates.part = partCode;
      }

      if (existing.description && existing.description !== catalogItem.description) {
        mismatchCounts.description += 1;
        if (mismatchSamples.length < 100) {
          mismatchSamples.push({
            itemNumber: catalogItem.itemNumber,
            field: 'description',
            catalogValue: catalogItem.description,
            payItemValue: existing.description,
          });
        }
      }

      if (existing.unit && existing.unit !== catalogItem.unit) {
        mismatchCounts.unit += 1;
        if (mismatchSamples.length < 100) {
          mismatchSamples.push({
            itemNumber: catalogItem.itemNumber,
            field: 'unit',
            catalogValue: catalogItem.unit,
            payItemValue: existing.unit,
          });
        }
      }

      if (catalogItem.trade && existing.trade && existing.trade !== catalogItem.trade) {
        mismatchCounts.trade += 1;
        if (mismatchSamples.length < 100) {
          mismatchSamples.push({
            itemNumber: catalogItem.itemNumber,
            field: 'trade',
            catalogValue: catalogItem.trade,
            payItemValue: existing.trade,
          });
        }
      }

      if (catalogItem.category && existing.category && existing.category !== catalogItem.category) {
        mismatchCounts.category += 1;
        if (mismatchSamples.length < 100) {
          mismatchSamples.push({
            itemNumber: catalogItem.itemNumber,
            field: 'category',
            catalogValue: catalogItem.category,
            payItemValue: existing.category,
          });
        }
      }

      if (existing.part && existing.part !== partCode) {
        mismatchCounts.part += 1;
        if (mismatchSamples.length < 100) {
          mismatchSamples.push({
            itemNumber: catalogItem.itemNumber,
            field: 'part',
            catalogValue: partCode,
            payItemValue: existing.part,
          });
        }
      }

      if (Object.keys(updates).length > 0) {
        await PayItem.updateOne({ _id: existing._id }, { $set: updates });
        updated += 1;
      } else {
        skipped += 1;
      }
    }

    return NextResponse.json({
      success: true,
      totalCatalogItems: catalogItems.length,
      inserted,
      updated,
      skipped,
      force,
      mismatchCounts,
      mismatchSamples,
      duplicateNormalizedCount: duplicateNormalized.size,
    });
  } catch (error: any) {
    console.error('Error syncing pay items:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync pay items' },
      { status: 500 }
    );
  }
}
