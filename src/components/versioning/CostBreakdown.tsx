/**
 * Cost Breakdown Visualization
 * 
 * Displays a visual breakdown of costs by category
 * Shows labor, equipment, materials, and markup components
 */

'use client';

import React from 'react';
import { ICostSummary } from '@/types/versioning';

interface CostBreakdownProps {
  costSummary: ICostSummary;
  className?: string;
}

export function CostBreakdown({ costSummary, className = '' }: CostBreakdownProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (part: number, total: number) => {
    if (total === 0) return '0%';
    return ((part / total) * 100).toFixed(1) + '%';
  };

  const total = costSummary.grandTotal;
  const directCost = costSummary.totalDirectCost;
  
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium mb-1">Direct Cost</p>
          <p className="text-2xl font-bold text-blue-900">
            {formatCurrency(directCost)}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            {formatPercent(directCost, total)} of total
          </p>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium mb-1">Grand Total</p>
          <p className="text-2xl font-bold text-green-900">
            {formatCurrency(total)}
          </p>
          <p className="text-xs text-green-600 mt-1">
            {costSummary.rateItemsCount} line items
          </p>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="space-y-3">
        {/* Direct Cost */}
        <CostItem
          label="Direct Cost"
          amount={directCost}
          total={total}
          color="blue"
          isSubtotal
        />
        
        {/* OCM */}
        {costSummary.totalOCM > 0 && (
          <CostItem
            label="OCM (Overhead, Contingencies & Misc)"
            amount={costSummary.totalOCM}
            total={total}
            color="purple"
          />
        )}
        
        {/* CP */}
        {costSummary.totalCP > 0 && (
          <CostItem
            label="CP (Contractor's Profit)"
            amount={costSummary.totalCP}
            total={total}
            color="indigo"
          />
        )}
        
        {/* Subtotal with Markup */}
        {costSummary.subtotalWithMarkup > 0 && (
          <CostItem
            label="Subtotal with Markup"
            amount={costSummary.subtotalWithMarkup}
            total={total}
            color="gray"
            isSubtotal
          />
        )}
        
        {/* VAT */}
        {costSummary.totalVAT > 0 && (
          <CostItem
            label="VAT (Value Added Tax)"
            amount={costSummary.totalVAT}
            total={total}
            color="orange"
          />
        )}
        
        {/* Grand Total */}
        <div className="border-t-2 border-gray-300 pt-3 mt-3">
          <CostItem
            label="Grand Total"
            amount={total}
            total={total}
            color="green"
            isTotal
          />
        </div>
      </div>

      {/* Visual Bar Chart */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Cost Distribution</h4>
        <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-blue-500"
            style={{ width: formatPercent(directCost, total) }}
          />
          <div
            className="absolute top-0 h-full bg-purple-500"
            style={{
              left: formatPercent(directCost, total),
              width: formatPercent(costSummary.totalOCM, total),
            }}
          />
          <div
            className="absolute top-0 h-full bg-indigo-500"
            style={{
              left: formatPercent(directCost + costSummary.totalOCM, total),
              width: formatPercent(costSummary.totalCP, total),
            }}
          />
          <div
            className="absolute top-0 h-full bg-orange-500"
            style={{
              left: formatPercent(costSummary.subtotalWithMarkup, total),
              width: formatPercent(costSummary.totalVAT, total),
            }}
          />
        </div>
        
        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded mr-2" />
            <span className="text-gray-600">Direct Cost</span>
          </div>
          {costSummary.totalOCM > 0 && (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-500 rounded mr-2" />
              <span className="text-gray-600">OCM</span>
            </div>
          )}
          {costSummary.totalCP > 0 && (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-indigo-500 rounded mr-2" />
              <span className="text-gray-600">CP</span>
            </div>
          )}
          {costSummary.totalVAT > 0 && (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-orange-500 rounded mr-2" />
              <span className="text-gray-600">VAT</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface CostItemProps {
  label: string;
  amount: number;
  total: number;
  color: string;
  isSubtotal?: boolean;
  isTotal?: boolean;
}

function CostItem({ label, amount, total, color, isSubtotal, isTotal }: CostItemProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (part: number, total: number) => {
    if (total === 0) return '0%';
    return ((part / total) * 100).toFixed(1) + '%';
  };

  const colorClasses: Record<string, string> = {
    blue: 'text-blue-700',
    purple: 'text-purple-700',
    indigo: 'text-indigo-700',
    orange: 'text-orange-700',
    gray: 'text-gray-700',
    green: 'text-green-700',
  };

  return (
    <div className={`flex items-center justify-between ${isSubtotal || isTotal ? 'font-semibold' : ''}`}>
      <span className={`text-sm ${colorClasses[color] || 'text-gray-700'}`}>
        {label}
      </span>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 min-w-[40px] text-right">
          {formatPercent(amount, total)}
        </span>
        <span className={`text-sm ${isTotal ? 'text-lg font-bold' : ''} ${colorClasses[color] || 'text-gray-900'}`}>
          {formatCurrency(amount)}
        </span>
      </div>
    </div>
  );
}

export default CostBreakdown;
