'use client';

import { useState, useEffect } from 'react';
import type { ElementInstance, ElementTemplate, GridLine, Level } from '@/types';
import FloorPlanVisualization from './FloorPlanVisualization';

interface ElementInstancesEditorProps {
  projectId: string;
  templates: ElementTemplate[];
  gridX: GridLine[];
  gridY: GridLine[];
  levels: Level[];
}

type PlacementMode = 'beam' | 'slab' | 'column' | 'foundation';

export default function ElementInstancesEditor({ 
  projectId, 
  templates: initialTemplates, 
  gridX, 
  gridY, 
  levels 
}: ElementInstancesEditorProps) {
  const [instances, setInstances] = useState<ElementInstance[]>([]);
  const [templates, setTemplates] = useState<ElementTemplate[]>(initialTemplates);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [placementMode, setPlacementMode] = useState<PlacementMode>('beam');
  
  // Beam placement (span)
  const [beamAxis, setBeamAxis] = useState<'X' | 'Y'>('X');
  const [beamStart, setBeamStart] = useState('');
  const [beamEnd, setBeamEnd] = useState('');
  const [beamGridLine, setBeamGridLine] = useState('');
  
  // Slab placement (panel)
  const [slabXStart, setSlabXStart] = useState('');
  const [slabXEnd, setSlabXEnd] = useState('');
  const [slabYStart, setSlabYStart] = useState('');
  const [slabYEnd, setSlabYEnd] = useState('');
  
  // Column placement (intersection)
  const [columnGridX, setColumnGridX] = useState('');
  const [columnGridY, setColumnGridY] = useState('');
  const [columnEndLevelId, setColumnEndLevelId] = useState('');
  
  // Tags
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    loadInstances();
    loadTemplates();
  }, [projectId]);

  useEffect(() => {
    // Auto-select first level if available
    if (levels.length > 0 && !selectedLevelId) {
      setSelectedLevelId(levels[0].label);
    }
  }, [levels]);

  const loadTemplates = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/templates`);
      if (!res.ok) throw new Error('Failed to load templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
      // Keep using initial templates if fetch fails
    }
  };

  const loadInstances = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/instances`);
      if (!res.ok) throw new Error('Failed to load instances');
      const data = await res.json();
      setInstances(data.instances || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load instances');
    } finally {
      setLoading(false);
    }
  };

  const saveInstances = async (updatedInstances: ElementInstance[]) => {
    try {
      setSaving(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/instances`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instances: updatedInstances }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details?.join(', ') || errorData.error || 'Failed to save instances');
      }
      
      const data = await res.json();
      setInstances(data.instances);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save instances');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedTemplateId('');
    setBeamStart('');
    setBeamEnd('');
    setBeamGridLine('');
    setSlabXStart('');
    setSlabXEnd('');
    setSlabYStart('');
    setSlabYEnd('');
    setColumnGridX('');
    setColumnGridY('');
    setColumnEndLevelId('');
    setTagsInput('');
    setEditingId(null);
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setPlacementMode(template.type as PlacementMode);
      resetPlacementInputs();
    }
  };

  const resetPlacementInputs = () => {
    setBeamStart('');
    setBeamEnd('');
    setBeamGridLine('');
    setSlabXStart('');
    setSlabXEnd('');
    setSlabYStart('');
    setSlabYEnd('');
    setColumnGridX('');
    setColumnGridY('');
    setColumnEndLevelId('');
  };

  const handleAdd = async () => {
    if (!selectedTemplateId) {
      setError('Please select a template');
      return;
    }

    if (!selectedLevelId) {
      setError('Please select a level');
      return;
    }

    const gridRef: string[] = [];
    const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t);

    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) {
      setError('Invalid template');
      return;
    }

    // Build gridRef based on placement mode
    if (placementMode === 'beam') {
      if (!beamStart || !beamEnd) {
        setError('Please select start and end points for the beam');
        return;
      }
      
      if (beamAxis === 'X') {
        // Beam along X-axis, specified by Y grid line
        if (!beamGridLine) {
          setError('Please select a grid line for the beam');
          return;
        }
        gridRef.push(`${beamStart}-${beamEnd}`);
        gridRef.push(beamGridLine);
      } else {
        // Beam along Y-axis, specified by X grid line
        if (!beamGridLine) {
          setError('Please select a grid line for the beam');
          return;
        }
        gridRef.push(beamGridLine);
        gridRef.push(`${beamStart}-${beamEnd}`);
      }
    } else if (placementMode === 'slab') {
      if (!slabXStart || !slabXEnd || !slabYStart || !slabYEnd) {
        setError('Please select all slab panel boundaries');
        return;
      }
      gridRef.push(`${slabXStart}-${slabXEnd}`);
      gridRef.push(`${slabYStart}-${slabYEnd}`);
    } else if (placementMode === 'column') {
      // Columns can be placed at intersections or anywhere
      if (columnGridX && columnGridY) {
        gridRef.push(columnGridX);
        gridRef.push(columnGridY);
      }
    } else if (placementMode === 'foundation') {
      // Foundation placement depends on type:
      // - Mat foundation (has thickness) -> panel placement like slab
      // - Isolated footing (has length/width/depth) -> point placement like column
      const isMat = template.properties.thickness !== undefined;
      
      if (isMat) {
        // Mat foundation - requires panel boundaries
        if (!slabXStart || !slabXEnd || !slabYStart || !slabYEnd) {
          setError('Mat foundation requires panel boundaries (X Start/End, Y Start/End)');
          return;
        }
        gridRef.push(`${slabXStart}-${slabXEnd}`);
        gridRef.push(`${slabYStart}-${slabYEnd}`);
      } else {
        // Isolated footing - can be at intersection or free
        if (columnGridX && columnGridY) {
          gridRef.push(columnGridX);
          gridRef.push(columnGridY);
        }
        // Allow free placement for footings
      }
    }

    const newInstance: ElementInstance = {
      id: editingId || `inst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      templateId: selectedTemplateId,
      placement: {
        gridRef: gridRef.length > 0 ? gridRef : undefined,
        levelId: selectedLevelId,
        endLevelId: placementMode === 'column' ? (columnEndLevelId || undefined) : undefined,
      },
      tags,
    };

    let updatedInstances: ElementInstance[];
    if (editingId) {
      updatedInstances = instances.map(i => i.id === editingId ? newInstance : i);
    } else {
      updatedInstances = [...instances, newInstance];
    }

    const success = await saveInstances(updatedInstances);
    if (success) {
      resetForm();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this element?')) return;
    const updatedInstances = instances.filter(i => i.id !== id);
    await saveInstances(updatedInstances);
  };

  const handleEdit = (instance: ElementInstance) => {
    setEditingId(instance.id);
    setSelectedTemplateId(instance.templateId);
    setSelectedLevelId(instance.placement.levelId);
    setTagsInput(instance.tags?.join(', ') || '');

    const template = templates.find(t => t.id === instance.templateId);
    if (!template) return;

    setPlacementMode(template.type as PlacementMode);

    // Parse grid references based on type
    const gridRef = instance.placement.gridRef || [];

    if (template.type === 'beam' && gridRef.length >= 2) {
      const [ref1, ref2] = gridRef;
      if (ref1.includes('-')) {
        setBeamAxis('X');
        const [start, end] = ref1.split('-');
        setBeamStart(start);
        setBeamEnd(end);
        setBeamGridLine(ref2);
      } else {
        setBeamAxis('Y');
        const [start, end] = ref2.split('-');
        setBeamStart(start);
        setBeamEnd(end);
        setBeamGridLine(ref1);
      }
    } else if (template.type === 'slab' && gridRef.length >= 2) {
      const [xRef, yRef] = gridRef;
      const [xStart, xEnd] = xRef.split('-');
      const [yStart, yEnd] = yRef.split('-');
      setSlabXStart(xStart);
      setSlabXEnd(xEnd);
      setSlabYStart(yStart);
      setSlabYEnd(yEnd);
    } else if (template.type === 'column' && gridRef.length >= 2) {
      setColumnGridX(gridRef[0]);
      setColumnGridY(gridRef[1]);
      setColumnEndLevelId(instance.placement.endLevelId || '');
    } else if (template.type === 'foundation') {
      const isMat = template.properties.thickness !== undefined;
      if (isMat && gridRef.length >= 2) {
        const [xRef, yRef] = gridRef;
        const [xStart, xEnd] = xRef.split('-');
        const [yStart, yEnd] = yRef.split('-');
        setSlabXStart(xStart);
        setSlabXEnd(xEnd);
        setSlabYStart(yStart);
        setSlabYEnd(yEnd);
      } else if (gridRef.length >= 2) {
        setColumnGridX(gridRef[0]);
        setColumnGridY(gridRef[1]);
      }
    }
  };

  const getTemplateName = (templateId: string): string => {
    const template = templates.find(t => t.id === templateId);
    return template ? template.name : 'Unknown';
  };

  const getTemplateType = (templateId: string): string => {
    const template = templates.find(t => t.id === templateId);
    return template ? template.type : 'unknown';
  };

  const formatGridRef = (gridRef?: string[]): string => {
    if (!gridRef || gridRef.length === 0) return 'Free placement';
    return gridRef.join(' × ');
  };

  const getLevelLabel = (levelId: string): string => {
    const level = levels.find(l => l.label === levelId);
    return level ? `${level.label} (${level.elevation}m)` : levelId;
  };

  if (loading) {
    return <div className="p-4 text-gray-500">Loading instances...</div>;
  }

  if (templates.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
        No templates available. Please create templates first in the Templates tab.
      </div>
    );
  }

  if (levels.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
        No levels defined. Please create levels first in the Levels tab.
      </div>
    );
  }

  const beamTemplates = templates.filter(t => t.type === 'beam');
  const slabTemplates = templates.filter(t => t.type === 'slab');
  const columnTemplates = templates.filter(t => t.type === 'column');
  const foundationTemplates = templates.filter(t => t.type === 'foundation');

  const beamInstances = instances.filter(i => getTemplateType(i.templateId) === 'beam');
  const slabInstances = instances.filter(i => getTemplateType(i.templateId) === 'slab');
  const columnInstances = instances.filter(i => getTemplateType(i.templateId) === 'column');
  const foundationInstances = instances.filter(i => getTemplateType(i.templateId) === 'foundation');

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">
          {editingId ? 'Edit Element' : 'Place New Element'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select a template...</option>
              {beamTemplates.length > 0 && (
                <optgroup label="Beams">
                  {beamTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </optgroup>
              )}
              {slabTemplates.length > 0 && (
                <optgroup label="Slabs">
                  {slabTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </optgroup>
              )}
              {columnTemplates.length > 0 && (
                <optgroup label="Columns">
                  {columnTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </optgroup>
              )}
              {foundationTemplates.length > 0 && (
                <optgroup label="Foundations">
                  {foundationTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Level Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Level
            </label>
            <select
              value={selectedLevelId}
              onChange={(e) => setSelectedLevelId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {levels.map(level => (
                <option key={level.label} value={level.label}>
                  {level.label} ({level.elevation}m)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Placement Inputs */}
        {placementMode === 'beam' && selectedTemplateId && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-medium text-sm text-blue-900 mb-3">Beam Placement (Span)</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beam Direction
                </label>
                <select
                  value={beamAxis}
                  onChange={(e) => {
                    setBeamAxis(e.target.value as 'X' | 'Y');
                    setBeamStart('');
                    setBeamEnd('');
                    setBeamGridLine('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="X">Along X-axis</option>
                  <option value="Y">Along Y-axis</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start {beamAxis === 'X' ? 'X' : 'Y'}
                </label>
                <select
                  value={beamStart}
                  onChange={(e) => setBeamStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select...</option>
                  {(beamAxis === 'X' ? gridX : gridY).map(g => (
                    <option key={g.label} value={g.label}>{g.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End {beamAxis === 'X' ? 'X' : 'Y'}
                </label>
                <select
                  value={beamEnd}
                  onChange={(e) => setBeamEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select...</option>
                  {(beamAxis === 'X' ? gridX : gridY).map(g => (
                    <option key={g.label} value={g.label}>{g.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  At Grid {beamAxis === 'X' ? 'Y' : 'X'}
                </label>
                <select
                  value={beamGridLine}
                  onChange={(e) => setBeamGridLine(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select...</option>
                  {(beamAxis === 'X' ? gridY : gridX).map(g => (
                    <option key={g.label} value={g.label}>{g.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {placementMode === 'slab' && selectedTemplateId && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
            <h4 className="font-medium text-sm text-green-900 mb-3">Slab Placement (Panel)</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  X Start
                </label>
                <select
                  value={slabXStart}
                  onChange={(e) => setSlabXStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select...</option>
                  {gridX.map(g => (
                    <option key={g.label} value={g.label}>{g.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  X End
                </label>
                <select
                  value={slabXEnd}
                  onChange={(e) => setSlabXEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select...</option>
                  {gridX.map(g => (
                    <option key={g.label} value={g.label}>{g.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Y Start
                </label>
                <select
                  value={slabYStart}
                  onChange={(e) => setSlabYStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select...</option>
                  {gridY.map(g => (
                    <option key={g.label} value={g.label}>{g.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Y End
                </label>
                <select
                  value={slabYEnd}
                  onChange={(e) => setSlabYEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select...</option>
                  {gridY.map(g => (
                    <option key={g.label} value={g.label}>{g.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {placementMode === 'column' && selectedTemplateId && (() => {
          // Get next level above current level for default end level
          const currentLevel = levels.find(l => l.label === selectedLevelId);
          const sortedLevels = [...levels].sort((a, b) => a.elevation - b.elevation);
          const currentIndex = currentLevel ? sortedLevels.findIndex(l => l.label === currentLevel.label) : -1;
          const levelsAbove = currentIndex >= 0 ? sortedLevels.slice(currentIndex + 1) : [];
          
          return (
            <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded">
              <h4 className="font-medium text-sm text-purple-900 mb-3">Column Placement</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grid X (Optional)
                  </label>
                  <select
                    value={columnGridX}
                    onChange={(e) => setColumnGridX(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select or leave free...</option>
                    {gridX.map(g => (
                      <option key={g.label} value={g.label}>{g.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grid Y (Optional)
                  </label>
                  <select
                    value={columnGridY}
                    onChange={(e) => setColumnGridY(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select or leave free...</option>
                    {gridY.map(g => (
                      <option key={g.label} value={g.label}>{g.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Level (Optional)
                  </label>
                  <select
                    value={columnEndLevelId}
                    onChange={(e) => setColumnEndLevelId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Next level (auto)</option>
                    {levelsAbove.map(level => (
                      <option key={level.label} value={level.label}>
                        {level.label} ({level.elevation}m)
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-purple-600 mt-1">
                    Column height from {currentLevel?.label || selectedLevelId} ({currentLevel?.elevation || 0}m)
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {placementMode === 'foundation' && selectedTemplateId && (() => {
          const template = templates.find(t => t.id === selectedTemplateId);
          const isMat = template?.properties.thickness !== undefined;
          
          return (
            <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded">
              <h4 className="font-medium text-sm text-orange-900 mb-3">
                {isMat ? 'Mat Foundation Placement (Panel)' : 'Isolated Footing Placement (Point)'}
              </h4>
              <p className="text-sm text-orange-700 mb-3">
                {isMat 
                  ? 'Mat foundations are placed as panels. Select the grid boundaries.'
                  : 'Isolated footings are placed at specific points. Select grid intersection or leave free.'
                }
              </p>
              
              {isMat ? (
                // Mat foundation - panel placement
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      X Start
                    </label>
                    <select
                      value={slabXStart}
                      onChange={(e) => setSlabXStart(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select...</option>
                      {gridX.map(g => (
                        <option key={g.label} value={g.label}>{g.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      X End
                    </label>
                    <select
                      value={slabXEnd}
                      onChange={(e) => setSlabXEnd(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select...</option>
                      {gridX.map(g => (
                        <option key={g.label} value={g.label}>{g.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Y Start
                    </label>
                    <select
                      value={slabYStart}
                      onChange={(e) => setSlabYStart(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select...</option>
                      {gridY.map(g => (
                        <option key={g.label} value={g.label}>{g.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Y End
                    </label>
                    <select
                      value={slabYEnd}
                      onChange={(e) => setSlabYEnd(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select...</option>
                      {gridY.map(g => (
                        <option key={g.label} value={g.label}>{g.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                // Isolated footing - point placement
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Grid X (Optional)
                    </label>
                    <select
                      value={columnGridX}
                      onChange={(e) => setColumnGridX(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select or leave free...</option>
                      {gridX.map(g => (
                        <option key={g.label} value={g.label}>{g.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Grid Y (Optional)
                    </label>
                    <select
                      value={columnGridY}
                      onChange={(e) => setColumnGridY(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select or leave free...</option>
                      {gridY.map(g => (
                        <option key={g.label} value={g.label}>{g.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Tags */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags (comma-separated, optional)
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g., main-frame, perimeter, typical"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            disabled={saving || !selectedTemplateId}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {saving ? 'Saving...' : editingId ? 'Update Element' : 'Place Element'}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Floor Plan Visualization */}
      <FloorPlanVisualization
        gridX={gridX}
        gridY={gridY}
        instances={instances}
        templates={templates}
        selectedLevel={selectedLevelId}
        levels={levels}
      />

      {/* Instance Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Beams */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-700 mb-3">Beams ({beamInstances.length})</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {beamInstances.length === 0 ? (
              <p className="text-sm text-gray-400">No beams placed</p>
            ) : (
              beamInstances.map(instance => (
                <div key={instance.id} className="p-2 bg-gray-50 rounded text-sm">
                  <div className="font-medium">{getTemplateName(instance.templateId)}</div>
                  <div className="text-xs text-gray-600">{formatGridRef(instance.placement.gridRef)}</div>
                  <div className="text-xs text-gray-600">{getLevelLabel(instance.placement.levelId)}</div>
                  {instance.tags && instance.tags.length > 0 && (
                    <div className="text-xs text-blue-600 mt-1">{instance.tags.join(', ')}</div>
                  )}
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => handleEdit(instance)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(instance.id)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Slabs */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-700 mb-3">Slabs ({slabInstances.length})</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {slabInstances.length === 0 ? (
              <p className="text-sm text-gray-400">No slabs placed</p>
            ) : (
              slabInstances.map(instance => (
                <div key={instance.id} className="p-2 bg-gray-50 rounded text-sm">
                  <div className="font-medium">{getTemplateName(instance.templateId)}</div>
                  <div className="text-xs text-gray-600">{formatGridRef(instance.placement.gridRef)}</div>
                  <div className="text-xs text-gray-600">{getLevelLabel(instance.placement.levelId)}</div>
                  {instance.tags && instance.tags.length > 0 && (
                    <div className="text-xs text-blue-600 mt-1">{instance.tags.join(', ')}</div>
                  )}
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => handleEdit(instance)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(instance.id)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Columns */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-700 mb-3">Columns ({columnInstances.length})</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {columnInstances.length === 0 ? (
              <p className="text-sm text-gray-400">No columns placed</p>
            ) : (
              columnInstances.map(instance => (
                <div key={instance.id} className="p-2 bg-gray-50 rounded text-sm">
                  <div className="font-medium">{getTemplateName(instance.templateId)}</div>
                  <div className="text-xs text-gray-600">{formatGridRef(instance.placement.gridRef)}</div>
                  <div className="text-xs text-gray-600">
                    {getLevelLabel(instance.placement.levelId)}
                    {instance.placement.endLevelId ? (
                      <> → {getLevelLabel(instance.placement.endLevelId)}</>
                    ) : (
                      <span className="text-gray-400"> → Next level (auto)</span>
                    )}
                  </div>
                  {instance.tags && instance.tags.length > 0 && (
                    <div className="text-xs text-blue-600 mt-1">{instance.tags.join(', ')}</div>
                  )}
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => handleEdit(instance)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(instance.id)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Foundations */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-700 mb-3">Foundations ({foundationInstances.length})</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {foundationInstances.length === 0 ? (
              <p className="text-sm text-gray-400">No foundations placed</p>
            ) : (
              foundationInstances.map(instance => (
                <div key={instance.id} className="p-2 bg-gray-50 rounded text-sm">
                  <div className="font-medium">{getTemplateName(instance.templateId)}</div>
                  <div className="text-xs text-gray-600">{formatGridRef(instance.placement.gridRef)}</div>
                  <div className="text-xs text-gray-600">{getLevelLabel(instance.placement.levelId)}</div>
                  {instance.tags && instance.tags.length > 0 && (
                    <div className="text-xs text-blue-600 mt-1">{instance.tags.join(', ')}</div>
                  )}
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => handleEdit(instance)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(instance.id)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Total Elements:</strong> {instances.length} ({beamInstances.length} beams, {slabInstances.length} slabs, {columnInstances.length} columns, {foundationInstances.length} foundations)
        </p>
      </div>
    </div>
  );
}
