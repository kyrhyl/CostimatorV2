'use client';

import { useState, useEffect } from 'react';
import GridEditor from '@/components/takeoff/GridEditor';
import type { GridLine } from '@/types';

interface GridEditorWrapperProps {
  projectId: string;
}

export default function GridEditorWrapper({ projectId }: GridEditorWrapperProps) {
  const [gridX, setGridX] = useState<GridLine[]>([]);
  const [gridY, setGridY] = useState<GridLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGrid();
  }, [projectId]);

  const loadGrid = async () => {
    try {
      console.log('[GridEditorWrapper] Loading grid for project:', projectId);
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/grid`);
      
      console.log('[GridEditorWrapper] API response status:', res.status);
      
      if (!res.ok) {
        throw new Error('Failed to load grid');
      }
      
      const result = await res.json();
      console.log('[GridEditorWrapper] API response data:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load grid');
      }
      
      const gridData = result.data || { xLines: [], yLines: [], gridX: [], gridY: [] };
      console.log('[GridEditorWrapper] Grid data extracted:', gridData);
      const xLines = gridData.gridX || gridData.xLines || [];
      const yLines = gridData.gridY || gridData.yLines || [];
      setGridX(xLines);
      setGridY(yLines);
    } catch (err: any) {
      console.error('[GridEditorWrapper] Error loading grid:', err);
      setError(err.message || 'Failed to load grid');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (newGridX: GridLine[], newGridY: GridLine[]) => {
    try {
      console.log('[GridEditorWrapper] Saving grid to API:', { newGridX, newGridY });
      const res = await fetch(`/api/projects/${projectId}/grid`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xLines: newGridX, yLines: newGridY }),
      });
      
      console.log('[GridEditorWrapper] Save API response status:', res.status);
      
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to save grid');
      }
      
      const result = await res.json();
      console.log('[GridEditorWrapper] Save API response data:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save grid');
      }
      
      // Update local state
      setGridX(newGridX);
      setGridY(newGridY);
      console.log('[GridEditorWrapper] Grid saved and state updated');
    } catch (err: any) {
      console.error('[GridEditorWrapper] Error saving grid:', err);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading grid...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600 font-medium">Error loading grid</p>
        <p className="text-sm text-red-600 mt-1">{error}</p>
        <button
          onClick={loadGrid}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!gridX || !gridY) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-700">No grid data available. Please create a grid system.</p>
      </div>
    );
  }

  return <GridEditor gridX={gridX} gridY={gridY} onSave={handleSave} />;
}
