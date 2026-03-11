'use client';

import { useState, useEffect } from 'react';

interface WallSurface {
  id: string;
  name: string;
  gridLine: {
    axis: 'X' | 'Y';
    label: string;
    span: [string, string];
  };
  levelStart: string;
  levelEnd: string;
  surfaceType: 'exterior' | 'interior' | 'both';
  facing?: 'north' | 'south' | 'east' | 'west';
  computed: {
    length_m: number;
    height_m: number;
    grossArea_m2: number;
    sidesCount: number;
    totalArea_m2: number;
  };
  tags: string[];
}

interface GridLine {
  label: string;
  offset: number;
}

interface Level {
  label: string;
  elevation: number;
}

interface WallSurfacesManagerProps {
  projectId: string;
  levels: Level[];
  gridX: GridLine[];
  gridY: GridLine[];
}

export default function WallSurfacesManager({ projectId, levels, gridX, gridY }: WallSurfacesManagerProps) {
  const [wallSurfaces, setWallSurfaces] = useState<WallSurface[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    axis: 'X' as 'X' | 'Y',
    gridLabel: '',
    spanStart: '',
    spanEnd: '',
    levelStart: '',
    levelEnd: '',
    surfaceType: 'exterior' as 'exterior' | 'interior' | 'both',
    facing: '' as '' | 'north' | 'south' | 'east' | 'west',
  });

  useEffect(() => {
    loadWallSurfaces();
  }, [projectId]);

  const loadWallSurfaces = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/wall-surfaces`);
      const data = await res.json();
      setWallSurfaces(data.wallSurfaces || []);
    } catch (error) {
      console.error('Error loading wall surfaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const res = await fetch(`/api/projects/${projectId}/wall-surfaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          gridLine: {
            axis: formData.axis,
            label: formData.gridLabel,
            span: [formData.spanStart, formData.spanEnd],
          },
          levelStart: formData.levelStart,
          levelEnd: formData.levelEnd,
          surfaceType: formData.surfaceType,
          facing: formData.facing || undefined,
          tags: [],
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(`Error: ${error.error}\\n${error.details?.join('\\n')}`);
        return;
      }

      await loadWallSurfaces();
      
      // Reset form
      setFormData({
        name: '',
        axis: 'X',
        gridLabel: '',
        spanStart: '',
        spanEnd: '',
        levelStart: '',
        levelEnd: '',
        surfaceType: 'exterior',
        facing: '',
      });
      
      alert('Wall surface created successfully');
    } catch (error) {
      console.error('Error creating wall surface:', error);
      alert('Failed to create wall surface');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this wall surface? Related openings will also be removed.')) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/wall-surfaces/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete');

      await loadWallSurfaces();
      alert('Wall surface deleted');
    } catch (error) {
      console.error('Error deleting wall surface:', error);
      alert('Failed to delete wall surface');
    }
  };

  // Get available grid lines for span selection based on axis
  const getSpanGridLines = () => {
    return formData.axis === 'X' ? gridY : gridX;
  };

  // Get available grid labels for wall line selection
  const getWallGridLines = () => {
    return formData.axis === 'X' ? gridX : gridY;
  };

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

        {/* Wall Surfaces */}
        {wallSurfaces.map((ws) => {
          const isSelected = ws.id === selectedWallId;
          const color = 
            ws.surfaceType === 'exterior' ? '#10b981' :
            ws.surfaceType === 'interior' ? '#8b5cf6' :
            '#3b82f6';
          
          const wallGrid = ws.gridLine.axis === 'X' 
            ? gridX.find(g => g.label === ws.gridLine.label)
            : gridY.find(g => g.label === ws.gridLine.label);
          
          const spanGrids = ws.gridLine.axis === 'X'
            ? gridY.filter(g => g.label === ws.gridLine.span[0] || g.label === ws.gridLine.span[1])
            : gridX.filter(g => g.label === ws.gridLine.span[0] || g.label === ws.gridLine.span[1]);

          if (!wallGrid || spanGrids.length !== 2) return null;

          const [spanStart, spanEnd] = spanGrids.sort((a, b) => a.offset - b.offset);

          if (ws.gridLine.axis === 'X') {
            // Wall along X-axis (horizontal)
            const x = toSvgX(wallGrid.offset);
            const y1 = toSvgY(spanStart.offset);
            const y2 = toSvgY(spanEnd.offset);

            return (
              <g key={ws.id}>
                <line
                  x1={x}
                  y1={y1}
                  x2={x}
                  y2={y2}
                  stroke={color}
                  strokeWidth={isSelected ? "6" : "4"}
                  opacity={isSelected ? 1 : 0.8}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedWallId(ws.id)}
                />
                {isSelected && (
                  <text
                    x={x + 10}
                    y={(y1 + y2) / 2}
                    fontSize="11"
                    fill={color}
                    fontWeight="bold"
                  >
                    {ws.name}
                  </text>
                )}
              </g>
            );
          } else {
            // Wall along Y-axis (vertical)
            const y = toSvgY(wallGrid.offset);
            const x1 = toSvgX(spanStart.offset);
            const x2 = toSvgX(spanEnd.offset);

            return (
              <g key={ws.id}>
                <line
                  x1={x1}
                  y1={y}
                  x2={x2}
                  y2={y}
                  stroke={color}
                  strokeWidth={isSelected ? "6" : "4"}
                  opacity={isSelected ? 1 : 0.8}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedWallId(ws.id)}
                />
                {isSelected && (
                  <text
                    x={(x1 + x2) / 2}
                    y={y - 10}
                    fontSize="11"
                    fill={color}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {ws.name}
                  </text>
                )}
              </g>
            );
          }
        })}

        {/* Legend */}
        <g transform={`translate(${padding}, 20)`}>
          <rect x="0" y="0" width="12" height="4" fill="#10b981" />
          <text x="18" y="4" fontSize="10" fill="#6b7280">Exterior</text>
          
          <rect x="80" y="0" width="12" height="4" fill="#8b5cf6" />
          <text x="98" y="4" fontSize="10" fill="#6b7280">Interior</text>
          
          <rect x="160" y="0" width="12" height="4" fill="#3b82f6" />
          <text x="178" y="4" fontSize="10" fill="#6b7280">Both</text>
        </g>
      </svg>
    );
  };

  if (loading) {
    return <div className="p-6">Loading wall surfaces...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm p-4 border border-blue-200">
          <div className="text-sm text-blue-600 mb-1">Total Surfaces</div>
          <div className="text-2xl font-bold text-blue-900">{wallSurfaces.length}</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm p-4 border border-green-200">
          <div className="text-sm text-green-600 mb-1">Exterior</div>
          <div className="text-2xl font-bold text-green-900">
            {wallSurfaces.filter(ws => ws.surfaceType === 'exterior').length}
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-sm p-4 border border-purple-200">
          <div className="text-sm text-purple-600 mb-1">Interior</div>
          <div className="text-2xl font-bold text-purple-900">
            {wallSurfaces.filter(ws => ws.surfaceType === 'interior').length}
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg shadow-sm p-4 border border-amber-200">
          <div className="text-sm text-amber-600 mb-1">Total Area (m²)</div>
          <div className="text-2xl font-bold text-amber-900">
            {wallSurfaces.reduce((sum, ws) => sum + ws.computed.totalArea_m2, 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Top Row: Create Form + Floor Plan */}
      <div className="grid grid-cols-2 gap-6" style={{ height: '600px' }}>
        {/* Left Column: Create Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 overflow-y-auto">
          <h3 className="font-semibold text-base mb-3">Create New Wall Surface</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Wall Surface Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., North Exterior Wall"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Wall Axis</label>
              <select
                value={formData.axis}
                onChange={(e) => setFormData({ ...formData, axis: e.target.value as 'X' | 'Y', gridLabel: '', spanStart: '', spanEnd: '' })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="X">X Axis (Grid A, B, C...)</option>
                <option value="Y">Y Axis (Grid 1, 2, 3...)</option>
              </select>
              <p className="text-xs text-gray-500 mt-0.5">
                {formData.axis === 'X' ? 'Wall along gridX' : 'Wall along gridY'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Grid Line</label>
              <select
                value={formData.gridLabel}
                onChange={(e) => setFormData({ ...formData, gridLabel: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Grid Line</option>
                {getWallGridLines().map((g) => (
                  <option key={g.label} value={g.label}>{g.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Span Start</label>
                <select
                  value={formData.spanStart}
                  onChange={(e) => setFormData({ ...formData, spanStart: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select</option>
                  {getSpanGridLines().map((g) => (
                    <option key={g.label} value={g.label}>{g.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Span End</label>
                <select
                  value={formData.spanEnd}
                  onChange={(e) => setFormData({ ...formData, spanEnd: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select</option>
                  {getSpanGridLines().map((g) => (
                    <option key={g.label} value={g.label}>{g.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Level Start</label>
                <select
                  value={formData.levelStart}
                  onChange={(e) => setFormData({ ...formData, levelStart: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Level</option>
                  {levels.map((l) => (
                    <option key={l.label} value={l.label}>{l.label} ({l.elevation}m)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Level End</label>
                <select
                  value={formData.levelEnd}
                  onChange={(e) => setFormData({ ...formData, levelEnd: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Level</option>
                  {levels.map((l) => (
                    <option key={l.label} value={l.label}>{l.label} ({l.elevation}m)</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Surface Type</label>
              <select
                value={formData.surfaceType}
                onChange={(e) => setFormData({ ...formData, surfaceType: e.target.value as any })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="exterior">Exterior (1 side)</option>
                <option value="interior">Interior (2 sides)</option>
                <option value="both">Both (2 sides)</option>
              </select>
              <p className="text-xs text-gray-500 mt-0.5">
                {formData.surfaceType === 'exterior' && 'Only exterior face counted'}
                {formData.surfaceType === 'interior' && 'Both faces counted'}
                {formData.surfaceType === 'both' && 'Both faces counted'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Facing (Optional)</label>
              <select
                value={formData.facing}
                onChange={(e) => setFormData({ ...formData, facing: e.target.value as any })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Not specified</option>
                <option value="north">North</option>
                <option value="south">South</option>
                <option value="east">East</option>
                <option value="west">West</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-sm transition-colors"
            >
              Create Wall Surface
            </button>
          </form>
        </div>

        {/* Right Column: Floor Plan Visualization */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col">
          <h3 className="font-semibold text-lg mb-4">Floor Plan View</h3>
          <div className="flex-1 flex items-center justify-center">
            <FloorPlanVisualization />
          </div>
          <p className="text-xs text-gray-500 text-center mt-3">
            Click on a wall to select it
          </p>
        </div>
      </div>

      {/* Bottom Row: Wall Surfaces List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-lg">Wall Surfaces ({wallSurfaces.length})</h3>
          {selectedWallId && (
            <button
              onClick={() => setSelectedWallId(null)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Clear Selection
            </button>
          )}
        </div>

        {wallSurfaces.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <div className="text-4xl mb-3">🧱</div>
            <p>No wall surfaces defined yet</p>
            <p className="text-sm mt-1">Create your first wall surface above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grid</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Span</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Levels</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dimensions</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {wallSurfaces.map((ws) => (
                  <tr 
                    key={ws.id}
                    className={`transition-colors cursor-pointer ${
                      selectedWallId === ws.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedWallId(ws.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{ws.name}</span>
                        {ws.facing && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {ws.facing}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        ws.surfaceType === 'exterior' ? 'bg-green-100 text-green-700' :
                        ws.surfaceType === 'interior' ? 'bg-purple-100 text-purple-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {ws.surfaceType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {ws.gridLine.axis} = {ws.gridLine.label}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {ws.gridLine.span.join(' - ')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {ws.levelStart} → {ws.levelEnd}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {ws.computed.length_m.toFixed(2)}m × {ws.computed.height_m.toFixed(2)}m
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <div className="text-gray-600">{ws.computed.grossArea_m2.toFixed(2)}m² × {ws.computed.sidesCount}</div>
                        <div className="font-semibold text-blue-600">{ws.computed.totalArea_m2.toFixed(2)}m²</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(ws.id);
                        }}
                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
