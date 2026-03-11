'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { TakeoffLine } from '@/types';
import { classifyDPWHItem, sortDPWHParts } from '@/lib/dpwhClassification';

interface TakeoffSummaryTableProps {
  takeoffLines: TakeoffLine[];
  projectId: string;
}

export default function TakeoffSummaryTable({ takeoffLines, projectId }: TakeoffSummaryTableProps) {
  const [expandedParts, setExpandedParts] = useState<Set<string>>(new Set(['Part D - Concrete & Reinforcement']));
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());

  // Group takeoff lines by Part and Subcategory
  const groupedData: Record<string, Record<string, TakeoffLine[]>> = {};
  
  takeoffLines.forEach(line => {
    // Extract DPWH item number
    const dpwhTag = line.tags.find(tag => tag.startsWith('dpwh:'));
    const dpwhItemNumber = dpwhTag ? dpwhTag.replace('dpwh:', '') : '';
    const category = line.trade;
    
    // Classify the item
    const classification = classifyDPWHItem(dpwhItemNumber, category);
    const partKey = classification.part;
    const subcategoryKey = classification.subcategory;
    
    if (!groupedData[partKey]) {
      groupedData[partKey] = {};
    }
    if (!groupedData[partKey][subcategoryKey]) {
      groupedData[partKey][subcategoryKey] = [];
    }
    groupedData[partKey][subcategoryKey].push(line);
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

  const toggleSubcategory = (subcategory: string) => {
    const newExpanded = new Set(expandedSubcategories);
    if (newExpanded.has(subcategory)) {
      newExpanded.delete(subcategory);
    } else {
      newExpanded.add(subcategory);
    }
    setExpandedSubcategories(newExpanded);
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

  if (takeoffLines.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No takeoff lines available</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="max-h-[600px] overflow-y-auto border border-gray-200 rounded-lg">
        <div className="min-w-full">
          {sortedParts.map(partName => {
            const subcategories = groupedData[partName];
            const partLineCount = Object.values(subcategories).flat().length;
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
                    <span className="text-sm text-gray-600">{partLineCount} lines</span>
                  </div>
                </div>

                {/* Subcategories */}
                {isPartExpanded && (
                  <div className="bg-white">
                    {Object.keys(subcategories).sort().map(subcategoryName => {
                      const lines = subcategories[subcategoryName];
                      const subcategoryKey = `${partName}::${subcategoryName}`;
                      const isSubcategoryExpanded = expandedSubcategories.has(subcategoryKey);

                      return (
                        <div key={subcategoryKey} className="border-t border-gray-100">
                          {/* Subcategory Header */}
                          <div
                            className="bg-gray-50 px-6 py-2 cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => toggleSubcategory(subcategoryKey)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <svg
                                  className={`w-3 h-3 transition-transform ${isSubcategoryExpanded ? 'rotate-90' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <span className="text-sm font-medium text-gray-800">{subcategoryName}</span>
                              </div>
                              <span className="text-xs text-gray-500">{lines.length} items</span>
                            </div>
                          </div>

                          {/* Lines Table */}
                          {isSubcategoryExpanded && (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                                      Description
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                                      Location
                                    </th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase">
                                      Quantity
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                                      Unit
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                                      Formula
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                  {lines.map((line, index) => {
                                    const templateTag = line.tags.find(tag => tag.startsWith('template:'))?.replace('template:', '') 
                                      || line.tags.find(tag => tag.startsWith('finish:'))?.replace('finish:', '')
                                      || line.resourceKey.split('-')[0]
                                      || 'N/A';
                                    const levelTag = line.tags.find(tag => tag.startsWith('level:'))?.replace('level:', '') 
                                      || line.tags.find(tag => tag.startsWith('space:'))?.replace('space:', '')
                                      || 'N/A';

                                    return (
                                      <tr key={`${line.resourceKey}-${index}`} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 text-sm text-gray-900">
                                          {line.resourceKey || templateTag}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-600">
                                          {levelTag}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">
                                          {formatQuantity(line.quantity, line.unit)}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-600">
                                          {line.unit}
                                        </td>
                                        <td className="px-4 py-2 text-xs text-gray-500 font-mono max-w-xs truncate">
                                          {line.formulaText || '-'}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
          Total: <span className="font-medium">{takeoffLines.length}</span> takeoff lines
        </p>
        <Link
          href={`/takeoff/${projectId}`}
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View Full Details in Workspace
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
