'use client';

import { useState, useEffect } from 'react';
import FloorPlanVisualization from '@/components/takeoff/FloorPlanVisualization';
import type { ElementTemplate, GridLine, Level, ElementInstance } from '@/types';

interface FloorPlanVisualizationWrapperProps {
  projectId: string;
}

export default function FloorPlanVisualizationWrapper({ projectId }: FloorPlanVisualizationWrapperProps) {
  const [templates, setTemplates] = useState<ElementTemplate[]>([]);
  const [gridX, setGridX] = useState<GridLine[]>([]);
  const [gridY, setGridY] = useState<GridLine[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [instances, setInstances] = useState<ElementInstance[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string | undefined>(undefined);
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
      const [gridRes, levelsRes, templatesRes, instancesRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/grid`),
        fetch(`/api/projects/${projectId}/levels`),
        fetch(`/api/projects/${projectId}/templates`),
        fetch(`/api/projects/${projectId}/instances`),
      ]);

      // Check if all requests succeeded
      if (!gridRes.ok || !levelsRes.ok || !templatesRes.ok || !instancesRes.ok) {
        throw new Error('Failed to load project data');
      }

      // Parse responses
      const [gridData, levelsData, templatesData, instancesData] = await Promise.all([
        gridRes.json(),
        levelsRes.json(),
        templatesRes.json(),
        instancesRes.json(),
      ]);

      // Check success status
      if (!gridData.success || !levelsData.success || !templatesData.success || !instancesData.success) {
        throw new Error('Failed to load project data');
      }

      // Set state
      const grid = gridData.data || { xLines: [], yLines: [] };
      setGridX(grid.xLines || []);
      setGridY(grid.yLines || []);
      
      const loadedLevels = levelsData.data || [];
      setLevels(loadedLevels);
      
      // Set default selected level to the first level
      if (loadedLevels.length > 0 && !selectedLevel) {
        setSelectedLevel(loadedLevels[0].label);
      }
      
      setTemplates(templatesData.templates || []);
      setInstances(instancesData.instances || []);
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
          <p className="text-gray-600">Loading floor plan visualization...</p>
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
  if (gridX.length === 0 || gridY.length === 0) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">Grid System Required</h3>
        <p className="text-sm text-yellow-800 mb-4">
          Before viewing the floor plan, you need to define a grid system in the Grid tab.
        </p>
        <p className="text-xs text-yellow-700">
          Grid lines provide the coordinate system for visualizing structural elements in plan view.
        </p>
      </div>
    );
  }

  if (levels.length === 0) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">Levels Required</h3>
        <p className="text-sm text-yellow-800 mb-4">
          Before viewing the floor plan, you need to define building levels in the Levels tab.
        </p>
        <p className="text-xs text-yellow-700">
          Levels represent the different floor elevations in your building (e.g., Ground Floor, 2nd Floor, Roof).
        </p>
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">No Elements Placed</h3>
        <p className="text-sm text-blue-800 mb-4">
          You haven&apos;t placed any structural elements yet. Go to the Element Instances tab to add elements.
        </p>
        <p className="text-xs text-blue-700">
          Once you place beams, columns, slabs, or foundations, they will appear in this floor plan view.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Level Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Select Level:</label>
          <select
            value={selectedLevel || ''}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Levels</option>
            {levels
              .sort((a, b) => a.elevation - b.elevation)
              .map((level) => (
                <option key={level.label} value={level.label}>
                  {level.label} ({level.elevation}m)
                </option>
              ))}
          </select>
          <div className="text-xs text-gray-500">
            {instances.length} element{instances.length !== 1 ? 's' : ''} placed
          </div>
        </div>
      </div>

      {/* Floor Plan Component */}
      <FloorPlanVisualization
        gridX={gridX}
        gridY={gridY}
        instances={instances}
        templates={templates}
        selectedLevel={selectedLevel}
        levels={levels}
      />
    </div>
  );
}
