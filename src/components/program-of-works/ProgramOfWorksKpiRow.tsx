'use client';

interface ProgramOfWorksKpiRowProps {
  totalProjectCost: number;
  directCost: number;
  activeComponents: number;
}

export default function ProgramOfWorksKpiRow({
  totalProjectCost,
  directCost,
  activeComponents
}: ProgramOfWorksKpiRowProps) {
  const formatCurrency = (value: number) => {
    return '₱' + value.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase">Total Project Cost</p>
        <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(totalProjectCost)}</p>
        <p className="text-xs text-green-600 mt-2">Submitted totals</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase">Direct Cost (Submitted)</p>
        <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(directCost)}</p>
        <p className="text-xs text-gray-500 mt-2">Before OCM/CP/VAT</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase">Active Components</p>
        <p className="text-2xl font-bold text-gray-900 mt-2">{activeComponents} Categories</p>
        <p className="text-xs text-gray-500 mt-2">Parts with line items</p>
      </div>
    </div>
  );
}
