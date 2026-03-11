'use client';

import { computePercentOfProjectCost } from '@/lib/utils/pow-math';

export interface WorksPart {
  part: string;
  description: string;
  quantity?: number;
  unit?: string;
  asSubmitted: number;
  asEvaluated?: number;
}

interface DescriptionOfWorksTableProps {
  parts: WorksPart[];
  onPartClick?: (part: string) => void;
}

export default function DescriptionOfWorksTable({ 
  parts,
  onPartClick 
}: DescriptionOfWorksTableProps) {
  const totalSubmitted = parts.reduce((sum, part) => sum + part.asSubmitted, 0);

  const formatCurrency = (value: number) => {
    return '₱' + value.toLocaleString('en-PH', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    });
  };

  const handlePartClick = (part: string) => {
    if (onPartClick) {
      onPartClick(part);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-dpwh-blue-700 text-white">
        <h3 className="text-lg font-semibold">Description of Works</h3>
        <p className="text-sm text-blue-100 mt-1">Bill of Quantities Summary by Part</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Part
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Submitted Cost
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                % Cost
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {parts.map((part) => {
              const percent = computePercentOfProjectCost(part.asSubmitted, totalSubmitted);
              
              return (
                <tr 
                  key={part.part} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handlePartClick(part.part)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-dpwh-blue-700">{part.part}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">{part.description}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(part.asSubmitted)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm text-gray-600">{percent.toFixed(2)}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-dpwh-blue-50 border-t-2 border-dpwh-blue-200">
            <tr>
              <td colSpan={2} className="px-6 py-4">
                <span className="text-sm font-bold text-gray-900 uppercase">Total Project Cost</span>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="text-base font-bold text-dpwh-blue-700">
                  {formatCurrency(totalSubmitted)}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="text-sm font-semibold text-gray-600">100.00%</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
