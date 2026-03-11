'use client';

import React, { useState, useEffect } from 'react';
import type { CalcRun } from '@/types';

interface CalcRunListProps {
  projectId: string;
}

export default function CalcRunList({ projectId }: CalcRunListProps) {
  const [calcRuns, setCalcRuns] = useState<CalcRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<CalcRun | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadCalcRuns();
  }, [projectId]);

  const loadCalcRuns = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}/calcruns`);
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          setCalcRuns(result.data);
        }
      } else {
        throw new Error('Failed to load calculation runs');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load calculation runs');
    } finally {
      setLoading(false);
    }
  };

  const viewDetails = async (run: any) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/calcruns/${run.runId}`);
      if (res.ok) {
        const result = await res.json();
        setSelectedRun(result.success ? result.data : result);
        setShowDetails(true);
      }
    } catch (err) {
      console.error('Failed to load run details:', err);
    }
  };

  const deleteRun = async (runId: string) => {
    if (!confirm('Are you sure you want to delete this calculation run? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/calcruns/${runId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        loadCalcRuns();
        if (selectedRun?.runId === runId) {
          setShowDetails(false);
          setSelectedRun(null);
        }
      } else {
        alert('Failed to delete calculation run');
      }
    } catch (err) {
      console.error('Failed to delete run:', err);
      alert('Failed to delete calculation run');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading calculation runs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600">Error: {error}</p>
        <button
          onClick={loadCalcRuns}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (calcRuns.length === 0) {
    return (
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">No Calculation Runs Yet</h3>
        <p className="text-sm text-blue-800 mb-4">
          You haven't run any quantity takeoff calculations for this project yet.
        </p>
        <p className="text-xs text-blue-700">
          Go to the Takeoff Viewer tab and click "Generate Takeoff" to create your first calculation run.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Calculation Runs</h3>
          <p className="text-sm text-gray-600 mt-1">
            {calcRuns.length} saved calculation{calcRuns.length !== 1 ? 's' : ''} for this project
          </p>
        </div>
        <button
          onClick={loadCalcRuns}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      <div className="grid gap-4">
        {calcRuns.map((run: any) => (
          <div
            key={run.runId}
            className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="font-medium text-gray-900">
                    {new Date(run.timestamp).toLocaleString()}
                  </h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    run.status === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : run.status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {run.status}
                  </span>
                  {run.summary?.boqLineCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      BOQ Generated
                    </span>
                  )}
                </div>
                
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Run ID:</span>
                    <p className="font-mono text-xs">{run.runId.slice(0, 8)}...</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Takeoff Lines:</span>
                    <p className="font-semibold">{run.summary?.takeoffLineCount || 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">BOQ Lines:</span>
                    <p className="font-semibold">{run.summary?.boqLineCount || 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Concrete:</span>
                    <p className="font-semibold">{(run.summary?.totalConcrete || 0).toFixed(2)} m³</p>
                  </div>
                </div>

                {run.validationErrors && run.validationErrors.length > 0 && (
                  <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
                    {run.validationErrors.length} warning{run.validationErrors.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => viewDetails(run)}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View
                </button>
                <button
                  onClick={() => deleteRun(run.runId)}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Details Modal */}
      {showDetails && selectedRun && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Calculation Run Details</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(selectedRun.timestamp).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Summary */}
              <div>
                <h3 className="font-semibold mb-3">Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded">
                  <div>
                    <span className="text-sm text-gray-600">Status</span>
                    <p className="font-semibold">{selectedRun.status}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Takeoff Lines</span>
                    <p className="font-semibold">{selectedRun.summary?.takeoffLineCount || 0}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">BOQ Lines</span>
                    <p className="font-semibold">{selectedRun.summary?.boqLineCount || 0}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Concrete</span>
                    <p className="font-semibold">{(selectedRun.summary?.totalConcrete || 0).toFixed(3)} m³</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Rebar</span>
                    <p className="font-semibold">{(selectedRun.summary?.totalRebar || 0).toFixed(2)} kg</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Formwork</span>
                    <p className="font-semibold">{(selectedRun.summary?.totalFormwork || 0).toFixed(2)} m²</p>
                  </div>
                </div>
              </div>

              {/* Errors/Warnings */}
              {selectedRun.validationErrors && selectedRun.validationErrors.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Warnings</h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                    <ul className="text-sm text-yellow-800 space-y-1">
                      {selectedRun.validationErrors.map((err: string, idx: number) => (
                        <li key={idx}>• {err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Takeoff Lines Preview */}
              {selectedRun.takeoffLines && selectedRun.takeoffLines.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Takeoff Lines ({selectedRun.takeoffLines.length})</h3>
                  <div className="bg-gray-50 rounded p-4 max-h-64 overflow-auto">
                    <div className="text-xs space-y-2">
                      {selectedRun.takeoffLines.slice(0, 10).map((line: any, idx: number) => (
                        <div key={idx} className="flex justify-between py-1 border-b border-gray-200">
                          <span className="font-mono">{line.id}</span>
                          <span className="text-gray-600">{line.trade}</span>
                          <span className="font-semibold">{line.quantity.toFixed(2)} {line.unit}</span>
                        </div>
                      ))}
                      {selectedRun.takeoffLines.length > 10 && (
                        <p className="text-center text-gray-500 py-2">
                          ... and {selectedRun.takeoffLines.length - 10} more
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* BOQ Lines Preview */}
              {selectedRun.boqLines && selectedRun.boqLines.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">BOQ Lines ({selectedRun.boqLines.length})</h3>
                  <div className="bg-gray-50 rounded p-4 max-h-64 overflow-auto">
                    <div className="text-xs space-y-2">
                      {selectedRun.boqLines.slice(0, 10).map((line: any, idx: number) => (
                        <div key={idx} className="flex justify-between py-1 border-b border-gray-200">
                          <span className="font-mono">{line.dpwhItemNumberRaw}</span>
                          <span className="text-gray-600 flex-1 mx-2">{line.description}</span>
                          <span className="font-semibold">{line.quantity.toFixed(2)} {line.unit}</span>
                        </div>
                      ))}
                      {selectedRun.boqLines.length > 10 && (
                        <p className="text-center text-gray-500 py-2">
                          ... and {selectedRun.boqLines.length - 10} more
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
