/**
 * Version Manager Component
 * 
 * Main component that combines version timeline, estimate selector,
 * and generation wizard for complete version management
 */

'use client';

import React, { useState } from 'react';
import VersionTimeline from './VersionTimeline';
import CostEstimateSelector from './CostEstimateSelector';
import GenerateEstimateWizard from './GenerateEstimateWizard';
import CostBreakdown from './CostBreakdown';
import { ICostEstimate } from '@/types/versioning';

interface VersionManagerProps {
  projectId: string;
  initialVersionId?: string;
  initialEstimateId?: string;
  onVersionChange?: (versionId: string) => void;
  onEstimateChange?: (estimateId: string) => void;
}

export function VersionManager({
  projectId,
  initialVersionId,
  initialEstimateId,
  onVersionChange,
  onEstimateChange,
}: VersionManagerProps) {
  const [selectedVersion, setSelectedVersion] = useState<string | undefined>(initialVersionId);
  const [selectedEstimate, setSelectedEstimate] = useState<string | undefined>(initialEstimateId);
  const [showGenerateWizard, setShowGenerateWizard] = useState(false);
  const [currentEstimate, setCurrentEstimate] = useState<ICostEstimate | null>(null);
  const [activeTab, setActiveTab] = useState<'versions' | 'estimates'>('versions');

  const handleVersionSelect = (versionId: string) => {
    setSelectedVersion(versionId);
    setSelectedEstimate(undefined);
    setCurrentEstimate(null);
    onVersionChange?.(versionId);
  };

  const handleEstimateSelect = async (estimateId: string) => {
    setSelectedEstimate(estimateId);
    onEstimateChange?.(estimateId);
    
    // Fetch estimate details for breakdown
    try {
      const response = await fetch(`/api/cost-estimates/${estimateId}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentEstimate(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch estimate details:', err);
    }
  };

  const handleGenerateSuccess = (estimateId: string) => {
    setShowGenerateWizard(false);
    handleEstimateSelect(estimateId);
    setActiveTab('estimates');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('versions')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'versions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Takeoff Versions
          </button>
          <button
            onClick={() => setActiveTab('estimates')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'estimates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Cost Estimates
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'versions' && (
          <div className="space-y-6">
            <VersionTimeline
              projectId={projectId}
              onVersionSelect={handleVersionSelect}
              activeVersionId={selectedVersion}
            />
            
            {selectedVersion && (
              <div className="border-t border-gray-200 pt-6">
                <CostEstimateSelector
                  projectId={projectId}
                  takeoffVersionId={selectedVersion}
                  onEstimateSelect={handleEstimateSelect}
                  activeEstimateId={selectedEstimate}
                  showGenerateButton={true}
                  onGenerateClick={() => setShowGenerateWizard(true)}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'estimates' && (
          <div className="space-y-6">
            <CostEstimateSelector
              projectId={projectId}
              onEstimateSelect={handleEstimateSelect}
              activeEstimateId={selectedEstimate}
              showGenerateButton={selectedVersion !== undefined}
              onGenerateClick={() => setShowGenerateWizard(true)}
            />
            
            {currentEstimate && (
              <div className="border-t border-gray-200 pt-6">
                <CostBreakdown costSummary={currentEstimate.costSummary} />
              </div>
            )}
          </div>
        )}

        {!selectedVersion && activeTab === 'versions' && (
          <div className="text-center py-12 text-gray-500">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm">Select a version to view cost estimates</p>
          </div>
        )}
      </div>

      {/* Generate Wizard */}
      {selectedVersion && (
        <GenerateEstimateWizard
          isOpen={showGenerateWizard}
          onClose={() => setShowGenerateWizard(false)}
          projectId={projectId}
          takeoffVersionId={selectedVersion}
          onSuccess={handleGenerateSuccess}
        />
      )}
    </div>
  );
}

export default VersionManager;
