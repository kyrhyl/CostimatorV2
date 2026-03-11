'use client';

import { useState, useEffect } from 'react';
import BOQViewer from '@/components/takeoff/BOQViewer';
import type { TakeoffLine } from '@/types';

interface BOQViewerWrapperProps {
  projectId: string;
}

interface CalcRun {
  runId: string;
  projectId: string;
  timestamp: string;
  status: 'running' | 'completed' | 'failed';
  takeoffLines: TakeoffLine[];
  boqLines: any[];
  summary: {
    totalConcrete: number;
    totalRebar: number;
    totalFormwork: number;
    takeoffLineCount: number;
    boqLineCount: number;
  };
  validationErrors?: string[]; // Renamed from 'errors' to avoid Mongoose reserved keyword
}

export default function BOQViewerWrapper({ projectId }: BOQViewerWrapperProps) {
  const [takeoffLines, setTakeoffLines] = useState<TakeoffLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCalcRun, setHasCalcRun] = useState(false);

  useEffect(() => {
    loadLatestCalcRun();
  }, [projectId]);

  const loadLatestCalcRun = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/projects/${projectId}/calcruns/latest`);
      
      if (res.status === 404) {
        // No calc run exists yet
        setHasCalcRun(false);
        setTakeoffLines([]);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to load calculation results');
      }

      const response = await res.json();
      const data: CalcRun = response.data;
      
      if (data.status === 'completed' && data.takeoffLines) {
        setTakeoffLines(data.takeoffLines);
        setHasCalcRun(true);
      } else if (data.status === 'failed') {
        setError('Last calculation run failed: ' + (data.validationErrors?.join(', ') || 'Unknown error'));
        setHasCalcRun(false);
      } else if (data.status === 'running') {
        setError('Calculation is still running. Please wait...');
        setHasCalcRun(false);
      } else {
        setTakeoffLines([]);
        setHasCalcRun(false);
      }
    } catch (err: any) {
      console.error('Error loading calc run:', err);
      setError(err.message || 'Failed to load calculation results');
      setHasCalcRun(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading BOQ data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600 font-medium">Error loading BOQ data</p>
        <p className="text-sm text-red-600 mt-1">{error}</p>
        <button
          onClick={loadLatestCalcRun}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!hasCalcRun) {
    return (
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">No Calculation Results Yet</h3>
        <p className="text-sm text-blue-800 mb-4">
          You need to run a takeoff calculation first before viewing the Bill of Quantities.
        </p>
        <p className="text-xs text-blue-700 mb-4">
          To generate a BOQ:
        </p>
        <ol className="text-xs text-blue-700 mb-4 list-decimal list-inside space-y-1">
          <li>Set up your grid system (Grid tab)</li>
          <li>Define building levels (Levels tab)</li>
          <li>Create element templates (Templates tab)</li>
          <li>Place element instances (Instances tab)</li>
          <li>Go to the Takeoff Viewer tab and click &quot;Run Takeoff Calculation&quot;</li>
        </ol>
        <p className="text-xs text-blue-700">
          Once the calculation completes, the BOQ will be automatically generated and displayed here.
        </p>
      </div>
    );
  }

  return (
    <BOQViewer 
      projectId={projectId} 
      takeoffLines={takeoffLines}
    />
  );
}
