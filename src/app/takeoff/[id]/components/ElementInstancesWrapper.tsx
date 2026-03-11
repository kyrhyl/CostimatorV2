'use client';

import { useState, useEffect } from 'react';
import ElementInstancesEditor from '@/components/takeoff/ElementInstancesEditor';
import type { ElementTemplate, GridLine, Level } from '@/types';

interface ElementInstancesWrapperProps {
  projectId: string;
}

export default function ElementInstancesWrapper({ projectId }: ElementInstancesWrapperProps) {
  const [templates, setTemplates] = useState<ElementTemplate[]>([]);
  const [gridX, setGridX] = useState<GridLine[]>([]);
  const [gridY, setGridY] = useState<GridLine[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all required data in parallel
      const [gridRes, levelsRes, templatesRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/grid`),
        fetch(`/api/projects/${projectId}/levels`),
        fetch(`/api/projects/${projectId}/templates`),
      ]);

      // Check if all requests succeeded
      if (!gridRes.ok || !levelsRes.ok || !templatesRes.ok) {
        throw new Error('Failed to load project data');
      }

      // Parse responses
      const [gridData, levelsData, templatesData] = await Promise.all([
        gridRes.json(),
        levelsRes.json(),
        templatesRes.json(),
      ]);

      // Check success status
      if (!gridData.success || !levelsData.success || !templatesData.success) {
        throw new Error('Failed to load project data');
      }

      // Set state
      const grid = gridData.data || { xLines: [], yLines: [] };
      setGridX(grid.xLines || []);
      setGridY(grid.yLines || []);
      setLevels(levelsData.data || []);
      setTemplates(templatesData.templates || []);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading element placement data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600 font-medium">Error loading data</p>
        <p className="text-sm text-red-600 mt-1">{error}</p>
        <button
          onClick={loadData}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  // Show message if prerequisites are missing
  if (templates.length === 0) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">Templates Required</h3>
        <p className="text-sm text-yellow-800 mb-4">
          Before placing elements, you need to create element templates in the Templates tab.
        </p>
        <p className="text-xs text-yellow-700">
          Templates define the types of structural elements (beams, columns, slabs, foundations) you can place in your project.
        </p>
      </div>
    );
  }

  if (levels.length === 0) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">Levels Required</h3>
        <p className="text-sm text-yellow-800 mb-4">
          Before placing elements, you need to define building levels in the Levels tab.
        </p>
        <p className="text-xs text-yellow-700">
          Levels represent the different floor elevations in your building (e.g., Ground Floor, 2nd Floor, Roof).
        </p>
      </div>
    );
  }

  if (gridX.length === 0 && gridY.length === 0) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">Grid System Recommended</h3>
        <p className="text-sm text-yellow-800 mb-4">
          While not required, defining a grid system in the Grid tab makes element placement much easier.
        </p>
        <p className="text-xs text-yellow-700 mb-4">
          Grid lines provide reference points for placing beams, columns, and other structural elements.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
        >
          Continue Anyway
        </button>
      </div>
    );
  }

  return (
    <ElementInstancesEditor
      projectId={projectId}
      templates={templates}
      gridX={gridX}
      gridY={gridY}
      levels={levels}
    />
  );
}
