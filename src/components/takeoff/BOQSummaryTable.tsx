'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { BOQLine } from '@/types';
import { classifyDPWHItem, sortDPWHParts } from '@/lib/dpwhClassification';

interface BOQSummaryTableProps {
  boqItems: BOQLine[];
  projectId: string;
}

export default function BOQSummaryTable({ boqItems, projectId }: BOQSummaryTableProps) {
  const [expandedParts, setExpandedParts] = useState<Set<string>>(new Set(['Part D - Concrete & Reinforcement']));

  // Group BOQ items by Part
  const groupedData: Record<string, BOQLine[]> = {};
  
  boqItems.forEach(item => {
    const classification = classifyDPWHItem(item.dpwhItemNumberRaw || '');
    const partKey = classification.part;
    
    if (!groupedData[partKey]) {
      groupedData[partKey] = [];
    }
    groupedData[partKey].push(item);
  });

  // Sort parts in DPWH order
  const sortedParts = Object.keys(groupedData).sort(sortDPWHParts);

  const togglePart = (part: string) => {
    const newExpanded = new Set(expandedParts);
    if (newExpanded.has(part)) {
      newExpanded.delete(part);
    } else {
      newExpanded.add(part);
    }
    setExpandedParts(newExpanded);
  };

  const getPartColor = (part: string) => {
    if (part.includes('Part C')) return 'bg-amber-50 border-l-4 border-amber-500';
    if (part.includes('Part D')) return 'bg-blue-50 border-l-4 border-blue-500';
    if (part.includes('Part E')) return 'bg-green-50 border-l-4 border-green-500';
    if (part.includes('Part F')) return 'bg-yellow-50 border-l-4 border-yellow-500';
    if (part.includes('Part G')) return 'bg-purple-50 border-l-4 border-purple-500';
    return 'bg-gray-50 border-l-4 border-gray-500';
  };

  const formatQuantity = (quantity: number, unit: string) => {
    const decimals = unit === 'kg' ? 2 : 3;
    return quantity.toLocaleString('en-US', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  if (boqItems.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No BOQ items available</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="max-h-[600px] overflow-y-auto border border-gray-200 rounded-lg">
        <div className="min-w-full">
          {sortedParts.map(partName => {
            const items = groupedData[partName];
            const isPartExpanded = expandedParts.has(partName);

            return (
              <div key={partName} className="border-b border-gray-200 last:border-b-0">
                {/* Part Header */}
                <div
                  className={`${getPartColor(partName)} p-3 cursor-pointer hover:opacity-80 transition-opacity`}
                  onClick={() => togglePart(partName)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg
                        className={`w-4 h-4 transition-transform ${isPartExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="font-semibold text-gray-900">{partName}</span>
                    </div>
                    <span className="text-sm text-gray-600">{items.length} items</span>
                  </div>
                </div>

                {/* BOQ Items Table */}
                {isPartExpanded && (
                  <div className="bg-white overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                            Item No.
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                            Description
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase">
                            Quantity
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                            Unit
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                            Trade
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {items.map((item, index) => (
                          <tr key={`${item.dpwhItemNumberRaw}-${index}`} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                              {item.dpwhItemNumberRaw || '-'}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {item.description || 'N/A'}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">
                              {formatQuantity(item.quantity, item.unit)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {item.unit}
                            </td>
                            <td className="px-4 py-2">
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                {item.tags.join(', ') || 'General'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-sm text-gray-600">
          Total: <span className="font-medium">{boqItems.length}</span> BOQ items
        </p>
        <Link
          href={`/takeoff/${projectId}#boq`}
          className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-800 font-medium"
        >
          View Full BOQ
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
