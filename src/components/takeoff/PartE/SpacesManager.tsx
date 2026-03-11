'use client';

import { useState, useEffect } from 'react';

interface Space {
  id: string;
  name: string;
  levelId: string;
  boundary: any;
  computed: {
    area_m2: number;
    perimeter_m: number;
  };
}

interface GridLine {
  label: string;
  offset: number;
}

interface Level {
  label: string;
  elevation: number;
}

interface SpacesManagerProps {
  projectId: string;
  levels: Level[];
  gridX: GridLine[];
  gridY: GridLine[];
}

export default function SpacesManager({ projectId, levels, gridX, gridY }: SpacesManagerProps) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>(levels[0]?.label || '');
  const [formData, setFormData] = useState({
    name: '',
    levelId: '',
    gridXStart: '',
    gridXEnd: '',
    gridYStart: '',
    gridYEnd: '',
  });

  useEffect(() => {
    loadSpaces();
  }, [projectId]);

  const loadSpaces = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/spaces`);
      const data = await res.json();
      setSpaces(data.spaces || []);
    } catch (error) {
      console.error('Error loading spaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form data:', formData);
    console.log('Available gridX labels:', gridX.map(g => g.label));
    console.log('Available gridY labels:', gridY.map(g => g.label));
    console.log('Available gridX:', gridX);
    console.log('Available gridY:', gridY);
    console.log('Sending boundary:', {
      type: 'gridRect',
      data: {
        gridX: [formData.gridXStart, formData.gridXEnd],
        gridY: [formData.gridYStart, formData.gridYEnd],
      },
    });
    
    try {
      const res = await fetch(`/api/projects/${projectId}/spaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          boundary: {
            type: 'gridRect',
            data: {
              gridX: [formData.gridXStart, formData.gridXEnd],
              gridY: [formData.gridYStart, formData.gridYEnd],
            },
          },
        }),
      });

      if (res.ok) {
        loadSpaces();
        setFormData({
          name: '',
          levelId: '',
          gridXStart: '',
          gridXEnd: '',
          gridYStart: '',
          gridYEnd: '',
        });
      } else {
        const data = await res.json();
        console.error('API Error Response:', data);
        alert(`Failed to create space: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating space:', error);
      alert('Failed to create space. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this space?')) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/spaces/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadSpaces();
      } else {
        const data = await res.json();
        alert(`Failed to delete space: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting space:', error);
      alert('Failed to delete space. Please try again.');
    }
  };

  const totalFloorArea = spaces.reduce((sum, s) => sum + (s.computed?.area_m2 || 0), 0);

  // Floor Plan Visualization Component
  const FloorPlanVisualization = () => {
    const padding = 60;
    const width = 600;
    const height = 600;

    // Calculate bounds
    const minX = Math.min(...gridX.map(g => g.offset));
    const maxX = Math.max(...gridX.map(g => g.offset));
    const minY = Math.min(...gridY.map(g => g.offset));
    const maxY = Math.max(...gridY.map(g => g.offset));

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scale = Math.min((width - 2 * padding) / rangeX, (height - 2 * padding) / rangeY);

    const toSvgX = (offset: number) => padding + (offset - minX) * scale;
    const toSvgY = (offset: number) => height - padding - (offset - minY) * scale;

    return (
      <svg width={width} height={height} className="border border-gray-200 rounded-lg bg-white">
        {/* Grid Lines X */}
        {gridX.map((grid) => {
          const x = toSvgX(grid.offset);
          return (
            <g key={`gridX-${grid.label}`}>
              <line
                x1={x}
                y1={toSvgY(minY)}
                x2={x}
                y2={toSvgY(maxY)}
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={x}
                y={height - padding + 20}
                textAnchor="middle"
                fontSize="12"
                fill="#6b7280"
              >
                {grid.label}
              </text>
            </g>
          );
        })}

        {/* Grid Lines Y */}
        {gridY.map((grid) => {
          const y = toSvgY(grid.offset);
          return (
            <g key={`gridY-${grid.label}`}>
              <line
                x1={toSvgX(minX)}
                y1={y}
                x2={toSvgX(maxX)}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding - 20}
                y={y}
                textAnchor="middle"
                fontSize="12"
                fill="#6b7280"
                dominantBaseline="middle"
              >
                {grid.label}
              </text>
            </g>
          );
        })}

        {/* Spaces */}
        {spaces
          .filter(space => space.levelId === selectedLevelFilter)
          .map((space) => {
          const isSelected = space.id === selectedSpaceId;
          
          if (!space.boundary?.data?.gridX || !space.boundary?.data?.gridY) return null;

          const [xStart, xEnd] = space.boundary.data.gridX;
          const [yStart, yEnd] = space.boundary.data.gridY;

          const xStartGrid = gridX.find(g => g.label === xStart);
          const xEndGrid = gridX.find(g => g.label === xEnd);
          const yStartGrid = gridY.find(g => g.label === yStart);
          const yEndGrid = gridY.find(g => g.label === yEnd);

          if (!xStartGrid || !xEndGrid || !yStartGrid || !yEndGrid) return null;

          const x1 = toSvgX(Math.min(xStartGrid.offset, xEndGrid.offset));
          const x2 = toSvgX(Math.max(xStartGrid.offset, xEndGrid.offset));
          const y1 = toSvgY(Math.max(yStartGrid.offset, yEndGrid.offset));
          const y2 = toSvgY(Math.min(yStartGrid.offset, yEndGrid.offset));

          const rectWidth = x2 - x1;
          const rectHeight = y2 - y1;
          const centerX = (x1 + x2) / 2;
          const centerY = (y1 + y2) / 2;

          return (
            <g key={space.id}>
              <rect
                x={x1}
                y={y1}
                width={rectWidth}
                height={rectHeight}
                fill={isSelected ? '#3b82f6' : '#10b981'}
                fillOpacity={isSelected ? 0.3 : 0.15}
                stroke={isSelected ? '#3b82f6' : '#10b981'}
                strokeWidth={isSelected ? 3 : 2}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedSpaceId(space.id)}
              />
              <text
                x={centerX}
                y={centerY}
                textAnchor="middle"
                fontSize="11"
                fill={isSelected ? '#1e40af' : '#047857'}
                fontWeight={isSelected ? 'bold' : 'normal'}
                dominantBaseline="middle"
                style={{ pointerEvents: 'none' }}
              >
                {space.name}
              </text>
              <text
                x={centerX}
                y={centerY + 14}
                textAnchor="middle"
                fontSize="9"
                fill="#6b7280"
                dominantBaseline="middle"
                style={{ pointerEvents: 'none' }}
              >
                {space.computed?.area_m2?.toFixed(1)}m²
              </text>
            </g>
          );
        })}

        {/* Title */}
        <text x={padding} y={20} fontSize="12" fill="#6b7280" fontWeight="500">
          Spaces Floor Plan - Click to select
        </text>
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-600 mb-1">Total Spaces</div>
          <div className="text-2xl font-bold text-green-900">{spaces.length}</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-600 mb-1">Total Floor Area</div>
          <div className="text-2xl font-bold text-blue-900">{totalFloorArea.toFixed(1)} m²</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-purple-600 mb-1">Grid Lines</div>
          <div className="text-2xl font-bold text-purple-900">{gridX.length + gridY.length}</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-4">
          <div className="text-sm text-amber-600 mb-1">Levels</div>
          <div className="text-2xl font-bold text-amber-900">{levels.length}</div>
        </div>
      </div>

      {/* Top Row: Create Form + Floor Plan */}
      <div className="grid grid-cols-2 gap-6" style={{ height: '600px' }}>
        {/* Left Column: Create Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 overflow-y-auto">
          <h3 className="font-semibold text-base mb-3">Create New Space</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Space Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g., Living Room, Bedroom 1"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Level</label>
              <select
                value={formData.levelId}
                onChange={(e) => setFormData({ ...formData, levelId: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="">Select Level</option>
                {levels.map((l) => (
                  <option key={l.label} value={l.label}>{l.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">X Start</label>
                <select
                  value={formData.gridXStart}
                  onChange={(e) => setFormData({ ...formData, gridXStart: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="">Select</option>
                  {gridX.map((g) => (
                    <option key={g.label} value={g.label}>{g.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">X End</label>
                <select
                  value={formData.gridXEnd}
                  onChange={(e) => setFormData({ ...formData, gridXEnd: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="">Select</option>
                  {gridX.map((g) => (
                    <option key={g.label} value={g.label}>{g.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Y Start</label>
                <select
                  value={formData.gridYStart}
                  onChange={(e) => setFormData({ ...formData, gridYStart: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="">Select</option>
                  {gridY.map((g) => (
                    <option key={g.label} value={g.label}>{g.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Y End</label>
                <select
                  value={formData.gridYEnd}
                  onChange={(e) => setFormData({ ...formData, gridYEnd: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="">Select</option>
                  {gridY.map((g) => (
                    <option key={g.label} value={g.label}>{g.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              onClick={() => console.log('Create Space button clicked', formData)}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm shadow-sm transition-colors"
            >
              Create Space
            </button>
          </form>
        </div>

        {/* Right Column: Floor Plan Visualization */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Floor Plan View</h3>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Level:</label>
              <select
                value={selectedLevelFilter}
                onChange={(e) => setSelectedLevelFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {levels.map((level) => (
                  <option key={level.label} value={level.label}>
                    {level.label} ({level.elevation}m)
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <FloorPlanVisualization />
          </div>
          <p className="text-xs text-gray-500 text-center mt-3">
            Click on a space to select it
            <span className="text-green-600 font-medium"> • Showing: {selectedLevelFilter}</span>
          </p>
        </div>
      </div>

      {/* Bottom Row: Spaces Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-lg">Spaces ({spaces.length})</h3>
          {selectedSpaceId && (
            <button
              onClick={() => setSelectedSpaceId(null)}
              className="text-sm text-green-600 hover:text-green-700"
            >
              Clear Selection
            </button>
          )}
        </div>

        {spaces.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 text-5xl mb-4">🏠</div>
            <p className="text-gray-500">No spaces defined yet</p>
            <p className="text-sm text-gray-400 mt-1">Create your first space using the form above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Grid Bounds</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Dimensions (m)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Area (m²)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Perimeter (m)</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {spaces.map((space) => {
                  // Calculate dimensions from grid bounds
                  let dimensions = '';
                  if (space.boundary?.type === 'gridRect' && space.boundary?.data?.gridX && space.boundary?.data?.gridY) {
                    const [xStart, xEnd] = space.boundary.data.gridX;
                    const [yStart, yEnd] = space.boundary.data.gridY;
                    const xStartLine = gridX.find(g => g.label === xStart);
                    const xEndLine = gridX.find(g => g.label === xEnd);
                    const yStartLine = gridY.find(g => g.label === yStart);
                    const yEndLine = gridY.find(g => g.label === yEnd);
                    
                    if (xStartLine && xEndLine && yStartLine && yEndLine) {
                      const width = Math.abs(xEndLine.offset - xStartLine.offset);
                      const length = Math.abs(yEndLine.offset - yStartLine.offset);
                      dimensions = `${width.toFixed(2)} × ${length.toFixed(2)}`;
                    }
                  }

                  return (
                    <tr 
                      key={space.id} 
                      className={`transition-colors cursor-pointer ${
                        selectedSpaceId === space.id ? 'bg-green-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedSpaceId(space.id)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{space.name}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">{space.levelId}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {space.boundary?.data?.gridX?.join(' - ')} × {space.boundary?.data?.gridY?.join(' - ')}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                        {dimensions || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-green-600">
                          {space.computed?.area_m2?.toFixed(2) || '0.00'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">
                        {space.computed?.perimeter_m?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(space.id);
                          }}
                          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
