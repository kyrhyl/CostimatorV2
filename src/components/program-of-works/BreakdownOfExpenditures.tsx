'use client';

export interface ExpenditureBreakdown {
  // Direct Costs
  laborCost: number;
  materialCost: number;
  equipmentCost: number;
  
  // Indirect Costs
  ocmCost?: number; // Overhead, Contingencies, Miscellaneous
  profitMargin?: number;
  
  // Tax
  vat?: number;
  
  // Total
  totalEstimatedCost: number;
}

interface BreakdownOfExpendituresProps {
  breakdown: ExpenditureBreakdown;
}

export default function BreakdownOfExpenditures({ breakdown }: BreakdownOfExpendituresProps) {
  const formatCurrency = (value: number) => {
    return '₱' + value.toLocaleString('en-PH', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    });
  };

  const directCostsTotal = breakdown.laborCost + breakdown.materialCost + breakdown.equipmentCost;
  const indirectCostsTotal = (breakdown.ocmCost || 0) + (breakdown.profitMargin || 0);
  const vat = breakdown.vat || 0;

  const directCostItems = [
    { label: 'Labor', value: breakdown.laborCost, icon: '👷' },
    { label: 'Materials', value: breakdown.materialCost, icon: '🧱' },
    { label: 'Equipment', value: breakdown.equipmentCost, icon: '🚜' },
  ];

  const indirectCostItems = [
    { label: 'OCM (Overhead, Contingencies, Misc.)', value: breakdown.ocmCost || 0 },
    { label: 'Profit Margin', value: breakdown.profitMargin || 0 },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-6">Breakdown of Expenditures</h3>
      
      <div className="space-y-6">
        {/* Direct Costs Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700 uppercase">Direct Costs</h4>
            <span className="text-sm font-bold text-dpwh-blue-700">
              {formatCurrency(directCostsTotal)}
            </span>
          </div>
          <div className="space-y-2 pl-4">
            {directCostItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm text-gray-600">{item.label}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200"></div>

        {/* Indirect Costs Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700 uppercase">Indirect Costs</h4>
            <span className="text-sm font-bold text-dpwh-blue-700">
              {formatCurrency(indirectCostsTotal)}
            </span>
          </div>
          <div className="space-y-2 pl-4">
            {indirectCostItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{item.label}</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200"></div>

        {/* VAT Section */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700 uppercase">VAT (12%)</span>
          <span className="text-sm font-bold text-dpwh-blue-700">
            {formatCurrency(vat)}
          </span>
        </div>

        <div className="border-t-2 border-dpwh-blue-200"></div>

        {/* Total Estimated Cost */}
        <div className="bg-gradient-to-r from-dpwh-blue-600 to-dpwh-blue-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-blue-100 uppercase font-medium mb-1">
                Total Estimated Cost
              </div>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(breakdown.totalEstimatedCost)}
              </div>
            </div>
            <div className="text-4xl text-white opacity-50">💰</div>
          </div>
        </div>

        {/* Cost Distribution */}
        <div className="pt-2">
          <div className="text-xs text-gray-500 mb-2">Cost Distribution</div>
          <div className="flex h-3 rounded-full overflow-hidden">
            <div 
              className="bg-dpwh-blue-500"
              style={{ width: `${(directCostsTotal / breakdown.totalEstimatedCost) * 100}%` }}
              title={`Direct Costs: ${((directCostsTotal / breakdown.totalEstimatedCost) * 100).toFixed(1)}%`}
            />
            <div 
              className="bg-dpwh-yellow-500"
              style={{ width: `${(indirectCostsTotal / breakdown.totalEstimatedCost) * 100}%` }}
              title={`Indirect Costs: ${((indirectCostsTotal / breakdown.totalEstimatedCost) * 100).toFixed(1)}%`}
            />
            <div 
              className="bg-dpwh-green-500"
              style={{ width: `${(vat / breakdown.totalEstimatedCost) * 100}%` }}
              title={`VAT: ${((vat / breakdown.totalEstimatedCost) * 100).toFixed(1)}%`}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-600 mt-2">
            <span>
              Direct: {((directCostsTotal / breakdown.totalEstimatedCost) * 100).toFixed(1)}%
            </span>
            <span>
              Indirect: {((indirectCostsTotal / breakdown.totalEstimatedCost) * 100).toFixed(1)}%
            </span>
            <span>
              VAT: {((vat / breakdown.totalEstimatedCost) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
