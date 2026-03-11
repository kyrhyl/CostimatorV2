'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface FinancialSummaryCardProps {
  allottedAmount: number;
  budgetBreakdown?: {
    directCosts?: number;
    indirectCosts?: number;
    vat?: number;
  };
}

export default function FinancialSummaryCard({ 
  allottedAmount,
  budgetBreakdown 
}: FinancialSummaryCardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  // Calculate breakdown if not provided
  const directCosts = budgetBreakdown?.directCosts ?? allottedAmount * 0.70;
  const indirectCosts = budgetBreakdown?.indirectCosts ?? allottedAmount * 0.20;
  const vat = budgetBreakdown?.vat ?? allottedAmount * 0.10;

  const data = [
    { name: 'Direct Costs', value: directCosts, color: '#2563EB' },
    { name: 'Indirect Costs', value: indirectCosts, color: '#F59E0B' },
    { name: 'VAT', value: vat, color: '#10B981' },
  ];

  const COLORS = ['#2563EB', '#F59E0B', '#10B981'];

  const formatCurrency = (value: number) => {
    return '₱' + value.toLocaleString('en-PH', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    });
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-semibold text-gray-900">{data.name}</p>
          <p className="text-sm text-dpwh-blue-600 font-bold">{formatCurrency(data.value)}</p>
          <p className="text-xs text-gray-600">
            {((data.value / allottedAmount) * 100).toFixed(1)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Financial Summary</h3>
      
      {/* Allotted Amount - Large Display */}
      <div className="mb-6">
        <label className="block text-xs text-gray-500 mb-1">Allotted Amount</label>
        <p className="text-3xl font-bold text-dpwh-blue-700">
          {formatCurrency(allottedAmount)}
        </p>
      </div>

      {/* Donut Chart */}
      <div className="mb-4" style={{ height: '200px' }}>
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${entry.name}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">
            Chart loading...
          </div>
        )}
      </div>

      {/* Legend / Breakdown */}
      <div className="space-y-3 border-t border-gray-200 pt-4">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-gray-700">{item.name}</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
