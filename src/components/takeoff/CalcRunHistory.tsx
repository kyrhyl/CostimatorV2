'use client';

import { useState, useEffect } from 'react';

interface CalcRunSummary {
  runId: string;
  timestamp: string;
  status: string;
  summary: {
    elementCount?: number;
    takeoffLineCount?: number;
    boqLineCount?: number;
    totalConcrete?: number;
    totalRebar?: number;
    totalFormwork?: number;
  };
  validationErrors?: string[];
}

interface CalcRunHistoryProps {
  projectId: string;
}

export default function CalcRunHistory({ projectId }: CalcRunHistoryProps) {
  const [calcRuns, setCalcRuns] = useState<CalcRunSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCalcRuns();
  }, [projectId]);

  const loadCalcRuns = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/projects/${projectId}/calcruns`);
      if (!res.ok) {
        throw new Error('Failed to load calculation history');
      }

      const data = await res.json();
      setCalcRuns(data.calcRuns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calculation history');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (runId: string) => {
    const newExpanded = new Set(expandedRuns);
    if (newExpanded.has(runId)) {
      newExpanded.delete(runId);
    } else {
      newExpanded.add(runId);
    }
    setExpandedRuns(newExpanded);
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold mb-2">Calculation Run History</h3>
            <p className="text-sm text-gray-600">
              View all past takeoff and BOQ calculations for this project
            </p>
          </div>
          <button
            onClick={loadCalcRuns}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Calculation Runs List */}
      {calcRuns.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="font-semibold text-gray-700">
              {calcRuns.length} Calculation Run{calcRuns.length !== 1 ? 's' : ''}
            </h4>
          </div>

          <div className="divide-y divide-gray-200">
            {calcRuns.map((run) => {
              const isExpanded = expandedRuns.has(run.runId);
              const hasErrors = run.validationErrors && run.validationErrors.length > 0;

              return (
                <div key={run.runId} className="hover:bg-gray-50">
                  {/* Run Summary */}
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-gray-500">
                            {run.runId.substring(0, 8)}
                          </span>
                          <span className="text-sm text-gray-700">
                            {formatDate(run.timestamp)}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            run.status === 'completed' 
                              ? 'bg-green-100 text-green-700' 
                              : run.status === 'error'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {run.status}
                          </span>
                          {hasErrors && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                              {run.validationErrors!.length} warning{run.validationErrors!.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {/* Summary Stats */}
                        <div className="mt-2 flex gap-6 text-sm">
                          {run.summary.totalConcrete !== undefined && (
                            <div>
                              <span className="text-gray-500">Concrete:</span>{' '}
                              <span className="font-semibold text-blue-700">
                                {run.summary.totalConcrete.toLocaleString('en-US', { 
                                  minimumFractionDigits: 3, 
                                  maximumFractionDigits: 3 
                                })} m³
                              </span>
                            </div>
                          )}
                          {run.summary.totalRebar !== undefined && run.summary.totalRebar > 0 && (
                            <div>
                              <span className="text-gray-500">Rebar:</span>{' '}
                              <span className="font-semibold text-orange-700">
                                {run.summary.totalRebar.toLocaleString('en-US', { 
                                  minimumFractionDigits: 2, 
                                  maximumFractionDigits: 2 
                                })} kg
                              </span>
                            </div>
                          )}
                          {run.summary.totalFormwork !== undefined && run.summary.totalFormwork > 0 && (
                            <div>
                              <span className="text-gray-500">Formwork:</span>{' '}
                              <span className="font-semibold text-purple-700">
                                {run.summary.totalFormwork.toLocaleString('en-US', { 
                                  minimumFractionDigits: 2, 
                                  maximumFractionDigits: 2 
                                })} m²
                              </span>
                            </div>
                          )}
                          {run.summary.takeoffLineCount !== undefined && (
                            <div>
                              <span className="text-gray-500">Takeoff Lines:</span>{' '}
                              <span className="font-semibold text-gray-700">
                                {run.summary.takeoffLineCount}
                              </span>
                            </div>
                          )}
                          {run.summary.boqLineCount !== undefined && run.summary.boqLineCount > 0 && (
                            <div>
                              <span className="text-gray-500">BOQ Lines:</span>{' '}
                              <span className="font-semibold text-gray-700">
                                {run.summary.boqLineCount}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expand Button */}
                      {hasErrors && (
                        <button
                          onClick={() => toggleExpand(run.runId)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          {isExpanded ? 'Hide Details' : 'Show Details'}
                        </button>
                      )}
                    </div>

                    {/* Expanded Details (Errors/Warnings) */}
                    {isExpanded && hasErrors && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h5 className="text-sm font-semibold text-gray-700 mb-2">Warnings:</h5>
                        <ul className="space-y-1 text-sm text-gray-600">
                          {run.validationErrors!.map((error, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-yellow-600">⚠</span>
                              <span>{error}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        !loading && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
            <p className="text-gray-500">
              No calculation runs yet. Generate a takeoff to create the first run.
            </p>
          </div>
        )
      )}
    </div>
  );
}
