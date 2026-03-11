/**
 * Cost Estimate Selector Component
 * 
 * Allows users to select and manage cost estimates for a takeoff version
 * Shows estimate details and allows generation of new estimates
 */

'use client';

import React, { useState, useEffect } from 'react';
import VersionStatusBadge, { CostEstimateStatus } from './VersionStatusBadge';
import { ICostEstimate } from '@/types/versioning';

interface CostEstimateSelectorProps {
  projectId: string;
  takeoffVersionId?: string;
  onEstimateSelect?: (estimateId: string) => void;
  activeEstimateId?: string;
  showGenerateButton?: boolean;
  onGenerateClick?: () => void;
}

export function CostEstimateSelector({
  projectId,
  takeoffVersionId,
  onEstimateSelect,
  activeEstimateId,
  showGenerateButton = true,
  onGenerateClick,
}: CostEstimateSelectorProps) {
  const [estimates, setEstimates] = useState<ICostEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEstimate, setSelectedEstimate] = useState<string | undefined>(activeEstimateId);

  useEffect(() => {
    fetchEstimates();
  }, [projectId, takeoffVersionId]);

  useEffect(() => {
    setSelectedEstimate(activeEstimateId);
  }, [activeEstimateId]);

  const fetchEstimates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/cost-estimates`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch cost estimates');
      }
      
      const data = await response.json();
      let estimateList = data.data || [];
      
      // Filter by takeoff version if specified
      if (takeoffVersionId) {
        estimateList = estimateList.filter(
          (est: ICostEstimate) => est.takeoffVersionId.toString() === takeoffVersionId
        );
      }
      
      setEstimates(estimateList);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (estimateId: string) => {
    setSelectedEstimate(estimateId);
    onEstimateSelect?.(estimateId);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-gray-500 text-sm">Loading estimates...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <p className="text-red-700 text-sm">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">
          Cost Estimates ({estimates.length})
        </h4>
        {showGenerateButton && (
          <button
            onClick={onGenerateClick}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md font-medium"
          >
            + Generate New
          </button>
        )}
      </div>

      {/* Estimate List */}
      {estimates.length === 0 ? (
        <div className="text-center py-6 text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg">
          No cost estimates yet.
          {showGenerateButton && (
            <button
              onClick={onGenerateClick}
              className="block mx-auto mt-2 text-blue-600 hover:text-blue-800 underline"
            >
              Generate your first estimate
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {estimates.map((estimate) => (
            <EstimateCard
              key={estimate._id.toString()}
              estimate={estimate}
              isSelected={estimate._id.toString() === selectedEstimate}
              onSelect={() => handleSelect(estimate._id.toString())}
              formatCurrency={formatCurrency}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface EstimateCardProps {
  estimate: ICostEstimate;
  isSelected: boolean;
  onSelect: () => void;
  formatCurrency: (amount: number) => string;
}

function EstimateCard({ estimate, isSelected, onSelect, formatCurrency }: EstimateCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`border rounded-lg p-3 cursor-pointer transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h5 className="font-semibold text-sm text-gray-900">
              {estimate.estimateName}
            </h5>
            <VersionStatusBadge status={estimate.status as CostEstimateStatus} />
          </div>
          <p className="text-xs text-gray-600">
            {estimate.estimateNumber}
          </p>
        </div>
        {isSelected && (
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
        <div>
          <span className="text-gray-500">CMPD:</span>
          <span className="ml-1 font-medium text-gray-700">{estimate.cmpdVersion}</span>
        </div>
        <div>
          <span className="text-gray-500">District:</span>
          <span className="ml-1 font-medium text-gray-700">{estimate.district}</span>
        </div>
        <div>
          <span className="text-gray-500">OCM:</span>
          <span className="ml-1 font-medium text-gray-700">{estimate.ocmPercentage}%</span>
        </div>
        <div>
          <span className="text-gray-500">CP:</span>
          <span className="ml-1 font-medium text-gray-700">{estimate.cpPercentage}%</span>
        </div>
      </div>

      {/* Cost Summary */}
      <div className="border-t border-gray-200 pt-2 mt-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600">Grand Total:</span>
          <span className="text-sm font-bold text-gray-900">
            {formatCurrency(estimate.costSummary.grandTotal)}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {estimate.costSummary.rateItemsCount} line items
        </div>
      </div>

      {/* Date */}
      <div className="text-xs text-gray-400 mt-2">
        Created: {new Date(estimate.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}

export default CostEstimateSelector;
