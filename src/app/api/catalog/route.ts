import { NextRequest, NextResponse } from 'next/server';
import type { DPWHCatalogItem, CatalogSearchParams, Trade } from '@/types';
import catalogData from '@/data/dpwh-catalog.json';
import { classifyDPWHItem } from '@/lib/dpwhClassification';
import dbConnect from '@/lib/db/connect';
import PayItem from '@/models/PayItem';
import { normalizePayItemNumber } from '@/lib/costing/utils/normalize-pay-item';

const catalog = catalogData.items as DPWHCatalogItem[];

// Add Part classification to each item
const catalogWithParts = catalog.map(item => ({
  ...item,
  part: classifyDPWHItem(item.itemNumber, item.category).part,
  partName: classifyDPWHItem(item.itemNumber, item.category).partName,
}));

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const source = (searchParams.get('source') || 'merged').toLowerCase();
    
    const tradeParam = searchParams.get('trade') || undefined;
    const params: CatalogSearchParams = {
      query: searchParams.get('query') || undefined,
      trade: (tradeParam && tradeParam !== 'all') ? (tradeParam as Trade) : undefined,
      category: searchParams.get('category') || undefined,
      limit: Math.min(parseInt(searchParams.get('limit') || '1000'), 5000),
    };

    let results = [...catalogWithParts];

    // Filter by DPWH Part
    if (params.trade) {
      results = results.filter(item => item.part?.startsWith(params.trade as string));
    }

    // Filter by category
    if (params.category) {
      results = results.filter(item => 
        item.category.toLowerCase().includes(params.category!.toLowerCase())
      );
    }

    // Search by query (item number or description)
    if (params.query && params.query.trim() !== '') {
      const queryLower = params.query.toLowerCase();
      results = results.filter(item =>
        item.itemNumber.toLowerCase().includes(queryLower) ||
        item.description.toLowerCase().includes(queryLower)
      );
    }

    // Apply limit
    if (params.limit && params.limit > 0) {
      results = results.slice(0, params.limit);
    }

    if (source === 'catalog') {
      return NextResponse.json({
        success: true,
        data: results,
        total: results.length,
        catalogVersion: catalogData.version,
        source,
      });
    }

    let payItemMap = new Map<string, any>();
    try {
      await dbConnect();
      const normalizedNumbers = results.map(item => normalizePayItemNumber(item.itemNumber));
      const itemNumbers = results.map(item => item.itemNumber);
      const payItems = await PayItem.find({
        $or: [
          { normalizedPayItemNumber: { $in: normalizedNumbers } },
          { payItemNumber: { $in: itemNumbers } },
        ],
      }).lean();
      payItemMap = new Map(
        payItems.map(item => [
          item.normalizedPayItemNumber || normalizePayItemNumber(item.payItemNumber || ''),
          item,
        ])
      );
    } catch (dbError) {
      console.warn('Catalog merge: DB unavailable, returning catalog only.');
    }

    const mergedResults = results.map(item => {
      const normalized = normalizePayItemNumber(item.itemNumber);
      const payItem = payItemMap.get(normalized);

      if (!payItem) {
        return item;
      }

      return {
        ...item,
        description: payItem.description || item.description,
        unit: payItem.unit || item.unit,
        trade: payItem.trade || item.trade,
        category: payItem.category || item.category,
        payItemId: payItem._id?.toString(),
        payItemNumber: payItem.payItemNumber,
        payItemPart: payItem.part,
        division: payItem.division,
        item: payItem.item,
        isActive: payItem.isActive,
      };
    });

    return NextResponse.json({
      success: true,
      data: mergedResults,
      total: mergedResults.length,
      catalogVersion: catalogData.version,
      source,
    });
  } catch (error) {
    console.error('Error searching catalog:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search catalog' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/catalog
 * Get catalog statistics
 */
export async function POST() {
  try {
    const stats = {
      totalItems: catalogWithParts.length,
      byPart: {
        'PART A': catalogWithParts.filter(i => i.part?.startsWith('PART A')).length,
        'PART C': catalogWithParts.filter(i => i.part?.startsWith('PART C')).length,
        'PART D': catalogWithParts.filter(i => i.part?.startsWith('PART D')).length,
        'PART E': catalogWithParts.filter(i => i.part?.startsWith('PART E')).length,
        'PART F': catalogWithParts.filter(i => i.part?.startsWith('PART F')).length,
        'PART G': catalogWithParts.filter(i => i.part?.startsWith('PART G')).length,
      },
      categories: Array.from(new Set(catalogWithParts.map(i => i.category))),
      version: catalogData.version,
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting catalog stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get catalog stats' },
      { status: 500 }
    );
  }
}
