/**
 * Cost Estimate Generation Wizard
 * 
 * Modal wizard for generating a new cost estimate from a takeoff version
 * Guides user through configuration and shows generation progress
 */

'use client';

import React, { useState, useEffect } from 'react';

interface GenerateEstimateWizardProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  takeoffVersionId: string;
  onSuccess?: (estimateId: string) => void;
}

interface CMPDVersion {
  version: string;
  label: string;
}

export function GenerateEstimateWizard({
  isOpen,
  onClose,
  projectId,
  takeoffVersionId,
  onSuccess,
}: GenerateEstimateWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form data
  const [estimateName, setEstimateName] = useState('');
  const [cmpdVersion, setCmpdVersion] = useState('');
  const [district, setDistrict] = useState('Bukidnon 1st');
  const [location, setLocation] = useState('');
  const [ocmPercentage, setOcmPercentage] = useState(10);
  const [cpPercentage, setCpPercentage] = useState(10);
  const [vatPercentage, setVatPercentage] = useState(12);
  
  // Generation status
  const [generationProgress, setGenerationProgress] = useState<any>(null);
  
  // Available CMPD versions (fetch from API or hardcode common ones)
  const [cmpdVersions, setCmpdVersions] = useState<CMPDVersion[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchCMPDVersions();
      fetchProjectDefaults();
    }
  }, [isOpen, projectId]);

  const fetchCMPDVersions = async () => {
    try {
      const response = await fetch('/api/master/materials/prices/versions');
      if (response.ok) {
        const data = await response.json();
        setCmpdVersions(data.versions || []);
      } else {
        // Fallback to common versions
        setCmpdVersions([
          { version: 'CMPD-2024-Q1', label: 'CMPD 2024 Q1' },
          { version: 'CMPD-2024-Q2', label: 'CMPD 2024 Q2' },
          { version: 'CMPD-2024-Q3', label: 'CMPD 2024 Q3' },
          { version: 'CMPD-2024-Q4', label: 'CMPD 2024 Q4' },
        ]);
      }
    } catch (err) {
      // Use fallback versions
      setCmpdVersions([
        { version: 'CMPD-2024-Q1', label: 'CMPD 2024 Q1' },
        { version: 'CMPD-2024-Q2', label: 'CMPD 2024 Q2' },
      ]);
    }
  };

  const fetchProjectDefaults = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        const project = data.project || data.data;
        
        setLocation(project.projectLocation || '');
        setDistrict(project.district || 'Bukidnon 1st');
        setCmpdVersion(project.cmpdVersion || '');
      }
    } catch (err) {
      console.error('Failed to fetch project defaults:', err);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setGenerationProgress(null);
    
    try {
      const response = await fetch(
        `/api/takeoff-versions/${takeoffVersionId}/cost-estimates/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            estimateName,
            cmpdVersion,
            district,
            location,
            ocmPercentage,
            cpPercentage,
            vatPercentage,
            createdBy: 'current-user', // TODO: Get from auth
          }),
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate estimate');
      }
      
      setGenerationProgress(data.processing);
      setStep(3); // Move to success step
      
      // Call success callback after a short delay
      setTimeout(() => {
        onSuccess?.(data.data._id);
        handleClose();
      }, 2000);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setError(null);
    setGenerationProgress(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Generate Cost Estimate
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-center mt-4 space-x-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    s === step
                      ? 'bg-blue-600 text-white'
                      : s < step
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {s < step ? '✓' : s}
                </div>
                {s < 3 && <div className="w-12 h-0.5 bg-gray-200 mx-2" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Step 1: Basic Information
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimate Name *
                </label>
                <input
                  type="text"
                  value={estimateName}
                  onChange={(e) => setEstimateName(e.target.value)}
                  placeholder="e.g., Q1 2024 Estimate"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CMPD Version *
                </label>
                <select
                  value={cmpdVersion}
                  onChange={(e) => setCmpdVersion(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select CMPD Version</option>
                  {cmpdVersions.map((v) => (
                    <option key={v.version} value={v.version}>
                      {v.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Material prices will be based on this CMPD version
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  District *
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g., Bukidnon 1st"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location *
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Malaybalay City, Bukidnon"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Labor rates will be based on this location
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Step 2: Markup Configuration
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OCM (Overhead, Contingencies & Miscellaneous) %
                </label>
                <input
                  type="number"
                  value={ocmPercentage}
                  onChange={(e) => setOcmPercentage(Number(e.target.value))}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CP (Contractor&apos;s Profit) %
                </label>
                <input
                  type="number"
                  value={cpPercentage}
                  onChange={(e) => setCpPercentage(Number(e.target.value))}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  VAT (Value Added Tax) %
                </label>
                <input
                  type="number"
                  value={vatPercentage}
                  onChange={(e) => setVatPercentage(Number(e.target.value))}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                <p className="text-sm text-blue-700">
                  ℹ️ These percentages will be applied to calculate the final cost of each line item.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-8">
              {loading ? (
                <>
                  <div className="mb-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Generating Cost Estimate...
                  </h3>
                  <p className="text-sm text-gray-600">
                    Processing BOQ lines and applying pricing...
                  </p>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <svg className="w-16 h-16 text-green-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Cost Estimate Generated Successfully!
                  </h3>
                  {generationProgress && (
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        Processed: {generationProgress.processed} / {generationProgress.totalBoqLines} BOQ lines
                      </p>
                      {generationProgress.errors > 0 && (
                        <p className="text-orange-600">
                          ⚠️ {generationProgress.errors} items had errors
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mt-4">
                    Redirecting...
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-between">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          
          <div className="space-x-2">
            {step > 1 && step < 3 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={loading}
              >
                Back
              </button>
            )}
            
            {step < 2 && (
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                disabled={!estimateName || !cmpdVersion || !district || !location}
              >
                Next
              </button>
            )}
            
            {step === 2 && (
              <button
                onClick={handleGenerate}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate Estimate'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GenerateEstimateWizard;
