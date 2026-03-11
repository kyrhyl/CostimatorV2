'use client';

import { useState } from 'react';
import type { Level } from '@/types';

interface LevelsEditorProps {
  levels: Level[];
  onSave: (levels: Level[]) => Promise<void>;
}

export default function LevelsEditor({ levels: initialLevels, onSave }: LevelsEditorProps) {
  const [levels, setLevels] = useState<Level[]>(initialLevels);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add new level
  const addLevel = () => {
    // Generate next label
    const existingLabels = levels.map(l => l.label);
    let nextLabel = 'L1';
    let num = 1;
    
    while (existingLabels.includes(`L${num}`)) {
      num++;
    }
    nextLabel = `L${num}`;

    // Default elevation (add 3m above the last level or 0 if first)
    const defaultElevation = levels.length > 0 
      ? Math.max(...levels.map(l => l.elevation)) + 3 
      : 0;

    const newLevel: Level = {
      label: nextLabel,
      elevation: defaultElevation,
    };

    setLevels([...levels, newLevel]);
  };

  // Update level
  const updateLevel = (index: number, field: 'label' | 'elevation', value: string | number) => {
    const newLevels = [...levels];
    if (field === 'elevation') {
      newLevels[index].elevation = Number(value);
    } else {
      newLevels[index].label = String(value);
    }
    setLevels(newLevels);
  };

  // Delete level
  const deleteLevel = (index: number) => {
    setLevels(levels.filter((_, i) => i !== index));
  };

  // Save levels
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await onSave(levels);
    } catch (err: any) {
      setError(err.message || 'Failed to save levels');
    } finally {
      setSaving(false);
    }
  };

  // Sort levels by elevation
  const sortedLevels = [...levels].sort((a, b) => a.elevation - b.elevation);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Levels</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Levels'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Level Definitions</h3>
          <button
            onClick={addLevel}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            + Add Level
          </button>
        </div>

        {levels.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No levels defined. Add a level to get started.</p>
        ) : (
          <div className="space-y-2">
            {levels.map((level, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Label
                    </label>
                    <input
                      type="text"
                      value={level.label}
                      onChange={(e) => updateLevel(index, 'label', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="e.g., L1, GF, 2F"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Elevation (m)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={level.elevation}
                      onChange={(e) => updateLevel(index, 'elevation', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <button
                  onClick={() => deleteLevel(index)}
                  className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Levels Preview */}
      {levels.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Levels Summary</h3>
          <div className="space-y-2">
            <div className="text-sm text-gray-600">
              <p className="font-medium">Total Levels: {levels.length}</p>
            </div>
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Sorted by Elevation:</h4>
              <div className="space-y-1">
                {sortedLevels.map((level, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900">{level.label}</span>
                    <span className="text-gray-600">+{level.elevation.toFixed(2)} m</span>
                    {index < sortedLevels.length - 1 && (
                      <span className="text-xs text-gray-500">
                        (↑ {(sortedLevels[index + 1].elevation - level.elevation).toFixed(2)} m)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
