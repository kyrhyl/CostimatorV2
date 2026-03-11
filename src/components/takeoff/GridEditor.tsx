'use client';

import { useState, useEffect } from 'react';
import type { GridLine } from '@/types';

interface GridEditorProps {
  gridX: GridLine[];
  gridY: GridLine[];
  onSave: (gridX: GridLine[], gridY: GridLine[]) => Promise<void>;
}

export default function GridEditor({ gridX: initialGridX, gridY: initialGridY, onSave }: GridEditorProps) {
  const [gridX, setGridX] = useState<GridLine[]>(initialGridX);
  const [gridY, setGridY] = useState<GridLine[]>(initialGridY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    console.log('[GridEditor] Props updated:', { initialGridX, initialGridY });
    setGridX(initialGridX);
    setGridY(initialGridY);
  }, [initialGridX, initialGridY]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Add new grid line
  const addLine = (axis: 'x' | 'y') => {
    const grid = axis === 'x' ? gridX : gridY;
    const setGrid = axis === 'x' ? setGridX : setGridY;
    
    // Generate next label
    const existingLabels = grid.map(g => g.label);
    let nextLabel = axis === 'x' ? 'A' : '1';
    
    if (axis === 'x') {
      // For X axis, use letters (A, B, C, ...)
      let charCode = 65; // 'A'
      while (existingLabels.includes(String.fromCharCode(charCode))) {
        charCode++;
      }
      nextLabel = String.fromCharCode(charCode);
    } else {
      // For Y axis, use numbers (1, 2, 3, ...)
      let num = 1;
      while (existingLabels.includes(String(num))) {
        num++;
      }
      nextLabel = String(num);
    }

    const newLine: GridLine = {
      label: nextLabel,
      offset: grid.length > 0 ? grid[grid.length - 1].offset + 5 : 0,
    };

    setGrid([...grid, newLine]);
  };

  // Update grid line
  const updateLine = (axis: 'x' | 'y', index: number, field: 'label' | 'offset', value: string | number) => {
    const grid = axis === 'x' ? [...gridX] : [...gridY];
    const setGrid = axis === 'x' ? setGridX : setGridY;

    if (field === 'offset') {
      grid[index].offset = Number(value);
    } else {
      grid[index].label = String(value);
    }

    setGrid(grid);
  };

  // Delete grid line
  const deleteLine = (axis: 'x' | 'y', index: number) => {
    const grid = axis === 'x' ? gridX : gridY;
    const setGrid = axis === 'x' ? setGridX : setGridY;
    setGrid(grid.filter((_, i) => i !== index));
  };

  // Save grid
  const handleSave = async () => {
    try {
      console.log('[GridEditor] Saving grid:', { gridX, gridY });
      setSaving(true);
      setError(null);
      setSuccess(null);
      await onSave(gridX, gridY);
      console.log('[GridEditor] Grid saved successfully');
      setSuccess('Grid system saved successfully to database!');
    } catch (err: any) {
      console.error('[GridEditor] Error saving grid:', err);
      setError(err.message || 'Failed to save grid');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Grid System</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Grid'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* X Axis (Vertical Lines) */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">X-Axis (Vertical)</h3>
            <button
              onClick={() => addLine('x')}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              + Add Line
            </button>
          </div>

          <div className="space-y-2">
            {gridX.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No grid lines defined</p>
            ) : (
              gridX.map((line, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={line.label}
                    onChange={(e) => updateLine('x', index, 'label', e.target.value)}
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Label"
                  />
                  <span className="text-sm text-gray-600">@</span>
                  <input
                    type="number"
                    step="0.01"
                    value={line.offset}
                    onChange={(e) => updateLine('x', index, 'offset', e.target.value)}
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Offset (m)"
                  />
                  <span className="text-sm text-gray-600">m</span>
                  <button
                    onClick={() => deleteLine('x', index)}
                    className="ml-auto px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Y Axis (Horizontal Lines) */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Y-Axis (Horizontal)</h3>
            <button
              onClick={() => addLine('y')}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              + Add Line
            </button>
          </div>

          <div className="space-y-2">
            {gridY.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No grid lines defined</p>
            ) : (
              gridY.map((line, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={line.label}
                    onChange={(e) => updateLine('y', index, 'label', e.target.value)}
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Label"
                  />
                  <span className="text-sm text-gray-600">@</span>
                  <input
                    type="number"
                    step="0.01"
                    value={line.offset}
                    onChange={(e) => updateLine('y', index, 'offset', e.target.value)}
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Offset (m)"
                  />
                  <span className="text-sm text-gray-600">m</span>
                  <button
                    onClick={() => deleteLine('y', index)}
                    className="ml-auto px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Grid Preview */}
      {(gridX.length > 0 || gridY.length > 0) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Grid Preview</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>X-Axis Lines: {gridX.map(g => g.label).join(', ') || 'None'}</p>
            <p>Y-Axis Lines: {gridY.map(g => g.label).join(', ') || 'None'}</p>
            <p>Total Grid Panels: {gridX.length > 0 && gridY.length > 0 ? (gridX.length - 1) * (gridY.length - 1) : 0}</p>
          </div>
        </div>
      )}
    </div>
  );
}
