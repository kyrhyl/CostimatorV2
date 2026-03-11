'use client';

import { useState, useEffect } from 'react';
import LevelsEditor from '@/components/takeoff/LevelsEditor';
import type { Level } from '@/types';

interface LevelsEditorWrapperProps {
  projectId: string;
}

export default function LevelsEditorWrapper({ projectId }: LevelsEditorWrapperProps) {
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLevels();
  }, [projectId]);

  const loadLevels = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/levels`);
      
      if (!res.ok) {
        throw new Error('Failed to load levels');
      }
      
      const result = await res.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load levels');
      }
      
      setLevels(result.data || []);
    } catch (err: any) {
      console.error('Error loading levels:', err);
      setError(err.message || 'Failed to load levels');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (newLevels: Level[]) => {
    const res = await fetch(`/api/projects/${projectId}/levels`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ levels: newLevels }),
    });
    
    if (!res.ok) {
      const result = await res.json();
      throw new Error(result.error || 'Failed to save levels');
    }
    
    const result = await res.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to save levels');
    }
    
    // Update local state
    setLevels(newLevels);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading levels...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600 font-medium">Error loading levels</p>
        <p className="text-sm text-red-600 mt-1">{error}</p>
        <button
          onClick={loadLevels}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return <LevelsEditor levels={levels} onSave={handleSave} />;
}
