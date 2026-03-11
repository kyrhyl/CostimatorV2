'use client';

import { useState, useEffect } from 'react';
import type { ElementTemplate, DPWHCatalogItem } from '@/types';
import dpwhCatalog from '@/data/dpwh-catalog.json';
import { getDPWHRebarItem } from '@/lib/math/rebar';

interface ElementTemplatesEditorProps {
  projectId: string;
}

type ElementType = 'beam' | 'slab' | 'column' | 'foundation';
type ColumnShape = 'rectangular' | 'circular';
type FoundationType = 'mat' | 'footing';

export default function ElementTemplatesEditor({ projectId }: ElementTemplatesEditorProps) {
  const [templates, setTemplates] = useState<ElementTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formType, setFormType] = useState<ElementType>('beam');
  const [formName, setFormName] = useState('');
  const [formWidth, setFormWidth] = useState('');
  const [formHeight, setFormHeight] = useState('');
  const [formThickness, setFormThickness] = useState('');
  const [formDiameter, setFormDiameter] = useState('');
  const [columnShape, setColumnShape] = useState<ColumnShape>('rectangular');
  
  // Foundation
  const [foundationType, setFoundationType] = useState<FoundationType>('mat');
  const [foundationLength, setFoundationLength] = useState('');
  const [foundationWidth, setFoundationWidth] = useState('');
  const [foundationDepth, setFoundationDepth] = useState('');
  
  // DPWH Item
  const [formDpwhItemNumber, setFormDpwhItemNumber] = useState('');
  
  // Rebar Configuration
  const [formMainBarCount, setFormMainBarCount] = useState('');
  const [formMainBarDiameter, setFormMainBarDiameter] = useState('');
  const [formMainBarSpacing, setFormMainBarSpacing] = useState('');
  const [formStirrupDiameter, setFormStirrupDiameter] = useState('');
  const [formStirrupSpacing, setFormStirrupSpacing] = useState('');
  const [formSecondaryBarDiameter, setFormSecondaryBarDiameter] = useState('');
  const [formSecondaryBarSpacing, setFormSecondaryBarSpacing] = useState('');
  const [formDpwhRebarItem, setFormDpwhRebarItem] = useState('');
  
  // Get concrete and rebar items from catalog
  const catalog = dpwhCatalog as { items: DPWHCatalogItem[] };
  const concreteItems = catalog.items.filter(item => item.trade === 'Concrete');
  const rebarItems = catalog.items.filter(item => item.trade === 'Rebar');
  
  // Standard rebar diameters (mm)
  const rebarDiameters = [10, 12, 16, 20, 25, 28, 32, 36, 40];

  useEffect(() => {
    loadTemplates();
  }, [projectId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/templates`);
      if (!res.ok) throw new Error('Failed to load templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const saveTemplates = async (updatedTemplates: ElementTemplate[]) => {
    try {
      setSaving(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/templates`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates: updatedTemplates }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details?.join(', ') || errorData.error || 'Failed to save templates');
      }
      
      const data = await res.json();
      console.log('=== SAVED TEMPLATES ===');
      console.log('Returned templates:', data.templates);
      setTemplates(data.templates);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save templates');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormWidth('');
    setFormHeight('');
    setFormThickness('');
    setFormDiameter('');
    setColumnShape('rectangular');
    setFoundationType('mat');
    setFoundationLength('');
    setFoundationWidth('');
    setFoundationDepth('');
    setFormDpwhItemNumber('');
    setFormMainBarCount('');
    setFormMainBarDiameter('');
    setFormMainBarSpacing('');
    setFormStirrupDiameter('');
    setFormStirrupSpacing('');
    setFormSecondaryBarDiameter('');
    setFormSecondaryBarSpacing('');
    setFormDpwhRebarItem('');
    setEditingId(null);
  };

  const handleAdd = async () => {
    const properties: Record<string, number> = {};

    // Build properties based on type
    if (formType === 'beam') {
      const width = parseFloat(formWidth);
      const height = parseFloat(formHeight);
      if (isNaN(width) || width <= 0 || isNaN(height) || height <= 0) {
        setError('Beam requires positive width and height');
        return;
      }
      properties.width = width;
      properties.height = height;
    } else if (formType === 'slab') {
      const thickness = parseFloat(formThickness);
      if (isNaN(thickness) || thickness <= 0) {
        setError('Slab requires positive thickness');
        return;
      }
      properties.thickness = thickness;
    } else if (formType === 'foundation') {
      if (foundationType === 'mat') {
        // Mat foundation (like slab)
        const thickness = parseFloat(formThickness);
        if (isNaN(thickness) || thickness <= 0) {
          setError('Mat foundation requires positive thickness');
          return;
        }
        properties.thickness = thickness;
      } else {
        // Footing (box)
        const length = parseFloat(foundationLength);
        const width = parseFloat(foundationWidth);
        const depth = parseFloat(foundationDepth);
        if (isNaN(length) || length <= 0 || isNaN(width) || width <= 0 || isNaN(depth) || depth <= 0) {
          setError('Footing requires positive length, width, and depth');
          return;
        }
        properties.length = length;
        properties.width = width;
        properties.depth = depth;
      }
    } else if (formType === 'column') {
      if (columnShape === 'circular') {
        const diameter = parseFloat(formDiameter);
        if (isNaN(diameter) || diameter <= 0) {
          setError('Circular column requires positive diameter');
          return;
        }
        properties.diameter = diameter;
      } else {
        const width = parseFloat(formWidth);
        const height = parseFloat(formHeight);
        if (isNaN(width) || width <= 0 || isNaN(height) || height <= 0) {
          setError('Rectangular column requires positive width and height');
          return;
        }
        properties.width = width;
        properties.height = height;
      }
    }

    if (!formName.trim()) {
      setError('Template name is required');
      return;
    }

    // Build rebar config if any rebar fields are filled
    const rebarConfig: any = {};
    
    if (formMainBarDiameter) {
      rebarConfig.mainBars = {
        diameter: parseInt(formMainBarDiameter),
      };
      if (formMainBarCount) {
        rebarConfig.mainBars.count = parseInt(formMainBarCount);
      }
      if (formMainBarSpacing) {
        rebarConfig.mainBars.spacing = parseFloat(formMainBarSpacing);
      }
    }
    
    if (formStirrupDiameter && formStirrupSpacing) {
      rebarConfig.stirrups = {
        diameter: parseInt(formStirrupDiameter),
        spacing: parseFloat(formStirrupSpacing),
      };
    }
    
    if (formSecondaryBarDiameter && formSecondaryBarSpacing) {
      rebarConfig.secondaryBars = {
        diameter: parseInt(formSecondaryBarDiameter),
        spacing: parseFloat(formSecondaryBarSpacing),
      };
    }
    
    if (formDpwhRebarItem) {
      rebarConfig.dpwhRebarItem = formDpwhRebarItem;
    }

    const newTemplate: ElementTemplate = {
      id: editingId || `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: formType,
      name: formName.trim(),
      properties,
      dpwhItemNumber: formDpwhItemNumber || undefined,
      rebarConfig: Object.keys(rebarConfig).length > 0 ? rebarConfig : undefined,
    };

    let updatedTemplates: ElementTemplate[];
    if (editingId) {
      updatedTemplates = templates.map(t => t.id === editingId ? newTemplate : t);
    } else {
      updatedTemplates = [...templates, newTemplate];
    }

    const success = await saveTemplates(updatedTemplates);
    if (success) {
      resetForm();
    }
  };

  const handleEdit = (template: ElementTemplate) => {
    setEditingId(template.id);
    setFormType(template.type);
    setFormName(template.name);
    setFormDpwhItemNumber(template.dpwhItemNumber || '');
    
    // Load rebar config
    if (template.rebarConfig) {
      setFormMainBarCount(template.rebarConfig.mainBars?.count?.toString() || '');
      setFormMainBarDiameter(template.rebarConfig.mainBars?.diameter?.toString() || '');
      setFormMainBarSpacing(template.rebarConfig.mainBars?.spacing?.toString() || '');
      setFormStirrupDiameter(template.rebarConfig.stirrups?.diameter?.toString() || '');
      setFormStirrupSpacing(template.rebarConfig.stirrups?.spacing?.toString() || '');
      setFormSecondaryBarDiameter(template.rebarConfig.secondaryBars?.diameter?.toString() || '');
      setFormSecondaryBarSpacing(template.rebarConfig.secondaryBars?.spacing?.toString() || '');
      setFormDpwhRebarItem(template.rebarConfig.dpwhRebarItem || '');
    }

    if (template.type === 'beam') {
      setFormWidth(template.properties.width?.toString() || '');
      setFormHeight(template.properties.height?.toString() || '');
    } else if (template.type === 'slab') {
      setFormThickness(template.properties.thickness?.toString() || '');
    } else if (template.type === 'foundation') {
      if (template.properties.thickness !== undefined) {
        setFoundationType('mat');
        setFormThickness(template.properties.thickness.toString());
      } else {
        setFoundationType('footing');
        setFoundationLength(template.properties.length?.toString() || '');
        setFoundationWidth(template.properties.width?.toString() || '');
        setFoundationDepth(template.properties.depth?.toString() || '');
      }
    } else if (template.type === 'column') {
      if (template.properties.diameter !== undefined) {
        setColumnShape('circular');
        setFormDiameter(template.properties.diameter.toString());
      } else {
        setColumnShape('rectangular');
        setFormWidth(template.properties.width?.toString() || '');
        setFormHeight(template.properties.height?.toString() || '');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    const updatedTemplates = templates.filter(t => t.id !== id);
    await saveTemplates(updatedTemplates);
  };

  const formatProperties = (template: ElementTemplate): string => {
    const props = template.properties;
    if (template.type === 'beam') {
      return `${props.width}m × ${props.height}m`;
    } else if (template.type === 'slab') {
      return `${props.thickness}m thick`;
    } else if (template.type === 'foundation') {
      if (props.thickness !== undefined) {
        return `${props.thickness}m thick (mat)`;
      } else {
        return `${props.length}m × ${props.width}m × ${props.depth}m (footing)`;
      }
    } else if (template.type === 'column') {
      if (props.diameter !== undefined) {
        return `Ø ${props.diameter}m`;
      } else {
        return `${props.width}m × ${props.height}m`;
      }
    }
    return '';
  };

  const formatRebarConfig = (template: ElementTemplate): string | null => {
    if (!template.rebarConfig) return null;
    
    const parts: string[] = [];
    
    if (template.rebarConfig.mainBars) {
      if (template.rebarConfig.mainBars.count) {
        parts.push(`${template.rebarConfig.mainBars.count}-${template.rebarConfig.mainBars.diameter}mm`);
      } else if (template.rebarConfig.mainBars.spacing) {
        parts.push(`${template.rebarConfig.mainBars.diameter}mm @ ${(template.rebarConfig.mainBars.spacing * 1000).toFixed(0)}mm`);
      } else {
        parts.push(`${template.rebarConfig.mainBars.diameter}mm`);
      }
    }
    
    if (template.rebarConfig.stirrups) {
      parts.push(`${template.rebarConfig.stirrups.diameter}mm @ ${(template.rebarConfig.stirrups.spacing * 1000).toFixed(0)}mm`);
    }
    
    if (template.rebarConfig.secondaryBars) {
      parts.push(`Secondary: ${template.rebarConfig.secondaryBars.diameter}mm @ ${(template.rebarConfig.secondaryBars.spacing * 1000).toFixed(0)}mm`);
    }
    
    return parts.length > 0 ? parts.join(', ') : null;
  };

  if (loading) {
    return <div className="p-4 text-gray-500">Loading templates...</div>;
  }

  const beams = templates.filter(t => t.type === 'beam');
  const slabs = templates.filter(t => t.type === 'slab');
  const columns = templates.filter(t => t.type === 'column');
  const foundations = templates.filter(t => t.type === 'foundation');

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
          {editingId ? 'Edit Template' : 'Add New Template'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Element Type
            </label>
            <select
              value={formType}
              onChange={(e) => {
                setFormType(e.target.value as ElementType);
                resetForm();
                setFormType(e.target.value as ElementType);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={!!editingId}
            >
              <option value="beam">Beam</option>
              <option value="slab">Slab</option>
              <option value="column">Column</option>
              <option value="foundation">Foundation</option>
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder={`e.g., ${formType === 'beam' ? 'B300x500' : formType === 'slab' ? 'S120' : 'C400x400'}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* Dimension Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {formType === 'beam' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Width (m)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formWidth}
                  onChange={(e) => setFormWidth(e.target.value)}
                  placeholder="0.30"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height (m)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formHeight}
                  onChange={(e) => setFormHeight(e.target.value)}
                  placeholder="0.50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </>
          )}

          {formType === 'slab' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thickness (m)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formThickness}
                onChange={(e) => setFormThickness(e.target.value)}
                placeholder="0.12"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          )}

          {formType === 'foundation' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Foundation Type
                </label>
                <select
                  value={foundationType}
                  onChange={(e) => {
                    setFoundationType(e.target.value as FoundationType);
                    setFormThickness('');
                    setFoundationLength('');
                    setFoundationWidth('');
                    setFoundationDepth('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={!!editingId}
                >
                  <option value="mat">Mat Foundation / Slab-on-Grade</option>
                  <option value="footing">Isolated Footing</option>
                </select>
              </div>

              {foundationType === 'mat' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thickness (m)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formThickness}
                    onChange={(e) => setFormThickness(e.target.value)}
                    placeholder="0.30"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Length (m)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={foundationLength}
                      onChange={(e) => setFoundationLength(e.target.value)}
                      placeholder="1.50"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Width (m)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={foundationWidth}
                      onChange={(e) => setFoundationWidth(e.target.value)}
                      placeholder="1.50"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Depth (m)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={foundationDepth}
                      onChange={(e) => setFoundationDepth(e.target.value)}
                      placeholder="0.40"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {formType === 'column' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Column Shape
                </label>
                <select
                  value={columnShape}
                  onChange={(e) => {
                    setColumnShape(e.target.value as ColumnShape);
                    setFormWidth('');
                    setFormHeight('');
                    setFormDiameter('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={!!editingId}
                >
                  <option value="rectangular">Rectangular</option>
                  <option value="circular">Circular</option>
                </select>
              </div>

              {columnShape === 'circular' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diameter (m)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formDiameter}
                    onChange={(e) => setFormDiameter(e.target.value)}
                    placeholder="0.40"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Width (m)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formWidth}
                      onChange={(e) => setFormWidth(e.target.value)}
                      placeholder="0.40"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Height (m)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formHeight}
                      onChange={(e) => setFormHeight(e.target.value)}
                      placeholder="0.40"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* DPWH Item Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            DPWH Concrete Item (for BOQ)
          </label>
          <select
            value={formDpwhItemNumber}
            onChange={(e) => setFormDpwhItemNumber(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Select concrete class (optional)</option>
            {concreteItems.map((item) => (
              <option key={item.itemNumber} value={item.itemNumber}>
                {item.itemNumber} - {item.description}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            This determines which DPWH pay item to use in the Bill of Quantities
          </p>
        </div>

        {/* Rebar Configuration */}
        <div className="mb-4 border-t pt-4">
          <h4 className="font-medium text-gray-700 mb-3">Rebar Configuration (Optional)</h4>
          
          {/* Main Bars */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Main Bars {formType === 'slab' || formType === 'foundation' ? '(Direction 1)' : '(Longitudinal)'}
            </label>
            <div className={`grid gap-2 ${formType === 'slab' || formType === 'foundation' ? 'grid-cols-2' : 'grid-cols-2'}`}>
              {formType !== 'slab' && formType !== 'foundation' && (
                <div>
                  <input
                    type="number"
                    placeholder="Count"
                    value={formMainBarCount}
                    onChange={(e) => setFormMainBarCount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    min="0"
                    step="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Number of bars</p>
                </div>
              )}
              <div>
                <select
                  value={formMainBarDiameter}
                  onChange={(e) => {
                    const diameter = e.target.value;
                    setFormMainBarDiameter(diameter);
                    // Auto-populate DPWH rebar item based on diameter
                    if (diameter && !formDpwhRebarItem) {
                      setFormDpwhRebarItem(getDPWHRebarItem(parseInt(diameter)));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Diameter (mm)</option>
                  {rebarDiameters.map(d => (
                    <option key={d} value={d}>{d}mm</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Bar diameter</p>
              </div>
              {(formType === 'slab' || formType === 'foundation') && (
                <div>
                  <input
                    type="number"
                    placeholder="Spacing (m)"
                    value={formMainBarSpacing}
                    onChange={(e) => setFormMainBarSpacing(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    min="0"
                    step="0.05"
                  />
                  <p className="text-xs text-gray-500 mt-1">Spacing (e.g., 0.15)</p>
                </div>
              )}
            </div>
          </div>

          {/* Stirrups/Ties */}
          {(formType === 'beam' || formType === 'column') && (
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formType === 'beam' ? 'Stirrups' : 'Ties'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <select
                    value={formStirrupDiameter}
                    onChange={(e) => setFormStirrupDiameter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Diameter (mm)</option>
                    {rebarDiameters.map(d => (
                      <option key={d} value={d}>{d}mm</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Bar diameter</p>
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Spacing (m)"
                    value={formStirrupSpacing}
                    onChange={(e) => setFormStirrupSpacing(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-gray-500 mt-1">Center-to-center (m)</p>
                </div>
              </div>
            </div>
          )}

          {/* Secondary Bars (Slabs only) */}
          {formType === 'slab' && (
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secondary Bars (Direction 2)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <select
                    value={formSecondaryBarDiameter}
                    onChange={(e) => setFormSecondaryBarDiameter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Diameter (mm)</option>
                    {rebarDiameters.map(d => (
                      <option key={d} value={d}>{d}mm</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Bar diameter</p>
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Spacing (m)"
                    value={formSecondaryBarSpacing}
                    onChange={(e) => setFormSecondaryBarSpacing(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-gray-500 mt-1">Center-to-center (m)</p>
                </div>
              </div>
            </div>
          )}

          {/* DPWH Rebar Item */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              DPWH Rebar Item (for BOQ)
            </label>
            <select
              value={formDpwhRebarItem}
              onChange={(e) => setFormDpwhRebarItem(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Select rebar class (optional)</option>
              {rebarItems.map((item) => (
                <option key={item.itemNumber} value={item.itemNumber}>
                  {item.itemNumber} - {item.description}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formMainBarDiameter ? (
                <span className="text-green-600">
                  Auto-selected: {getDPWHRebarItem(parseInt(formMainBarDiameter))} (Grade {parseInt(formMainBarDiameter) <= 12 ? '40' : parseInt(formMainBarDiameter) <= 36 ? '60' : '80'}) - Can override manually
                </span>
              ) : (
                'Automatically selected based on main bar diameter (≤12mm = Grade 40, 16-36mm = Grade 60, ≥40mm = Grade 80)'
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {saving ? 'Saving...' : editingId ? 'Update Template' : 'Add Template'}
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

      {/* Template Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Beams */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-700 mb-3">Beams ({beams.length})</h4>
          <div className="space-y-2">
            {beams.length === 0 ? (
              <p className="text-sm text-gray-400">No beam templates</p>
            ) : (
              beams.map(template => (
                <div key={template.id} className="flex justify-between items-start p-2 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{template.name}</div>
                    <div className="text-xs text-gray-600">{formatProperties(template)}</div>
                    {template.dpwhItemNumber && (
                      <div className="text-xs text-blue-600 mt-1">DPWH: {template.dpwhItemNumber}</div>
                    )}
                    {formatRebarConfig(template) && (
                      <div className="text-xs text-green-600 mt-1">Rebar: {formatRebarConfig(template)}</div>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="text-red-600 hover:text-red-800 text-xs px-2 py-1"
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
          <h4 className="font-semibold text-gray-700 mb-3">Slabs ({slabs.length})</h4>
          <div className="space-y-2">
            {slabs.length === 0 ? (
              <p className="text-sm text-gray-400">No slab templates</p>
            ) : (
              slabs.map(template => (
                <div key={template.id} className="flex justify-between items-start p-2 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{template.name}</div>
                    <div className="text-xs text-gray-600">{formatProperties(template)}</div>
                    {template.dpwhItemNumber && (
                      <div className="text-xs text-blue-600 mt-1">DPWH: {template.dpwhItemNumber}</div>
                    )}
                    {formatRebarConfig(template) && (
                      <div className="text-xs text-green-600 mt-1">Rebar: {formatRebarConfig(template)}</div>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="text-red-600 hover:text-red-800 text-xs px-2 py-1"
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
          <h4 className="font-semibold text-gray-700 mb-3">Columns ({columns.length})</h4>
          <div className="space-y-2">
            {columns.length === 0 ? (
              <p className="text-sm text-gray-400">No column templates</p>
            ) : (
              columns.map(template => (
                <div key={template.id} className="flex justify-between items-start p-2 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{template.name}</div>
                    <div className="text-xs text-gray-600">{formatProperties(template)}</div>
                    {template.dpwhItemNumber && (
                      <div className="text-xs text-blue-600 mt-1">DPWH: {template.dpwhItemNumber}</div>
                    )}
                    {formatRebarConfig(template) && (
                      <div className="text-xs text-green-600 mt-1">Rebar: {formatRebarConfig(template)}</div>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="text-red-600 hover:text-red-800 text-xs px-2 py-1"
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
          <h4 className="font-semibold text-gray-700 mb-3">Foundations ({foundations.length})</h4>
          <div className="space-y-2">
            {foundations.length === 0 ? (
              <p className="text-sm text-gray-400">No foundation templates</p>
            ) : (
              foundations.map(template => (
                <div key={template.id} className="flex justify-between items-start p-2 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{template.name}</div>
                    <div className="text-xs text-gray-600">{formatProperties(template)}</div>
                    {template.dpwhItemNumber && (
                      <div className="text-xs text-blue-600 mt-1">DPWH: {template.dpwhItemNumber}</div>
                    )}
                    {formatRebarConfig(template) && (
                      <div className="text-xs text-green-600 mt-1">Rebar: {formatRebarConfig(template)}</div>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="text-red-600 hover:text-red-800 text-xs px-2 py-1"
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
          <strong>Total Templates:</strong> {templates.length} ({beams.length} beams, {slabs.length} slabs, {columns.length} columns, {foundations.length} foundations)
        </p>
      </div>
    </div>
  );
}
