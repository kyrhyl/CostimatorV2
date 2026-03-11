'use client';

import { useState, useEffect } from 'react';
import { generateTruss, calculateTrussQuantity, type TrussType, type TrussParameters, type TrussResult } from '@/lib/math/roofing/truss';
import { calculateRoofFraming, roofingMaterials, purlinSections, DEFAULT_DPWH_MAPPINGS, type FramingParameters, type FramingResult } from '@/lib/math/roofing/framing';
import type { DPWHItemMapping } from '@/types';
import TrussVisualization from './TrussVisualization';
import FramingPlanVisualization from './FramingPlanVisualization';

interface RoofingManagerProps {
  projectId: string;
}

type RoofingTab = 'design' | 'plan';

const steelSections = [
  { section: 'C75x40x15x2.3', weight_kg_per_m: 3.45 },
  { section: 'C100x50x20x2.5', weight_kg_per_m: 4.89 },
  { section: 'C125x65x20x2.5', weight_kg_per_m: 5.85 },
  { section: 'C150x75x20x3.0', weight_kg_per_m: 8.37 },
  { section: '2L50x50x6', weight_kg_per_m: 4.5 },
  { section: '2L65x65x6', weight_kg_per_m: 5.9 },
  { section: '2L75x75x6', weight_kg_per_m: 6.8 },
  { section: 'Custom', weight_kg_per_m: 0 },
];

export default function RoofingManager({ projectId }: RoofingManagerProps) {
  const [activeTab, setActiveTab] = useState<RoofingTab>('design');
  const [trussParams, setTrussParams] = useState<TrussParameters>({
    type: 'howe',
    span_mm: 8000,
    middleRise_mm: 1600,
    overhang_mm: 450,
    spacing_mm: 600,
    verticalWebCount: 3,
    plateThickness: '1.0mm (20 gauge)',
    topChordMaterial: { section: 'C100x50x20x2.5', weight_kg_per_m: 4.89 },
    bottomChordMaterial: { section: 'C100x50x20x2.5', weight_kg_per_m: 4.89 },
    webMaterial: { section: '2L50x50x6', weight_kg_per_m: 4.5 },
  });
  const [trussResult, setTrussResult] = useState<TrussResult | null>(null);
  const [buildingLength_mm, setBuildingLength_mm] = useState(10000);
  
  // Framing parameters
  const [framingParams, setFramingParams] = useState<Partial<FramingParameters>>({
    roofingMaterial: roofingMaterials[0], // Default to first option (GI Sheet Gauge 26)
    purlinSpacing_mm: 600,
    purlinSpec: purlinSections[2], // C100x50x20x2.0
    bracing: {
      type: 'X-Brace',
      interval_mm: 6000,
      material: { section: '2L50x50x6', weight_kg_per_m: 4.6 },
    },
    includeRidgeCap: true,
    includeEaveGirt: true,
  });
  const [framingResult, setFramingResult] = useState<FramingResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // DPWH Item Mappings
  const [dpwhMappings, setDpwhMappings] = useState(DEFAULT_DPWH_MAPPINGS);
  const [catalogItems, setCatalogItems] = useState<Array<{ itemNumber: string; description: string; unit: string }>>([]);

  // Load saved truss design on mount
  useEffect(() => {
    const loadTrussDesign = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/roof-design`);
        if (response.ok) {
          const data = await response.json();
          console.log('Loaded roof design:', data);
          if (data && data.trussParams) {
            setTrussParams(data.trussParams);
            setBuildingLength_mm(data.buildingLength_mm || 10000);
            if (data.framingParams) {
              setFramingParams(data.framingParams);
              console.log('Loaded framingParams:', data.framingParams);
            }
            if (data.dpwhItemMappings) {
              setDpwhMappings({ ...DEFAULT_DPWH_MAPPINGS, ...data.dpwhItemMappings });
            }
          }
        }
      } catch (error) {
        console.error('Error loading truss design:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTrussDesign();
  }, [projectId]);

  // Load DPWH catalog items for dropdowns
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        // Load structural steel items (1047) and roofing items (1013)
        const response1047 = await fetch('/api/catalog?query=1047&limit=100');
        const response1013 = await fetch('/api/catalog?query=1013&limit=50');
        
        if (response1047.ok && response1013.ok) {
          const data1047 = await response1047.json();
          const data1013 = await response1013.json();
          const combined = [...(data1047.items || []), ...(data1013.items || [])];
          setCatalogItems(combined);
          console.log('Loaded catalog items:', combined.length);
          console.log('Sample items:', combined.slice(0, 5));
        } else {
          console.error('Failed to load catalog:', response1047.status, response1013.status);
        }
      } catch (error) {
        console.error('Error loading catalog:', error);
      }
    };

    loadCatalog();
  }, []);

  useEffect(() => {
    try {
      const result = generateTruss(trussParams);
      setTrussResult(result);
    } catch (error) {
      console.error('Error generating truss:', error);
      setTrussResult(null);
    }
  }, [trussParams]);

  // Calculate framing when parameters change
  useEffect(() => {
    if (!trussResult) return;
    
    try {
      const trussQty = calculateTrussQuantity(buildingLength_mm, trussParams.spacing_mm);
      const fullFramingParams: FramingParameters = {
        trussSpan_mm: trussParams.span_mm,
        trussSpacing_mm: trussParams.spacing_mm,
        buildingLength_mm,
        trussQuantity: trussQty,
        roofingMaterial: framingParams.roofingMaterial!,
        purlinSpacing_mm: framingParams.purlinSpacing_mm!,
        purlinSpec: framingParams.purlinSpec!,
        bracing: framingParams.bracing!,
        includeRidgeCap: framingParams.includeRidgeCap!,
        includeEaveGirt: framingParams.includeEaveGirt!,
      };
      
      const result = calculateRoofFraming(fullFramingParams);
      setFramingResult(result);
    } catch (error) {
      console.error('Error calculating framing:', error);
      setFramingResult(null);
    }
  }, [trussResult, buildingLength_mm, trussParams.spacing_mm, trussParams.span_mm, framingParams]);

  // Manual save function
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        trussParams,
        buildingLength_mm,
        framingParams,
        dpwhItemMappings: dpwhMappings
      };
      console.log('Saving roof design:', payload);
      
      const response = await fetch(`/api/projects/${projectId}/roof-design`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        alert('Truss design saved successfully!');
      } else {
        alert('Failed to save truss design');
      }
    } catch (error) {
      console.error('Error saving truss design:', error);
      alert('Error saving truss design');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-2xl">🏗️</div>
            <div>
              <h3 className="text-base font-semibold text-blue-900">Roofing System</h3>
              <p className="text-xs text-blue-700">Design trusses and visualize framing plans</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 text-xs font-medium transition-colors"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span>Save Design</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('design')}
            className={`py-2 px-1 border-b-2 font-medium text-xs transition-colors ${
              activeTab === 'design'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Truss Structural Design
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`py-2 px-1 border-b-2 font-medium text-xs transition-colors ${
              activeTab === 'plan'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Roof Framing Plan
          </button>
        </nav>
      </div>

      {activeTab === 'design' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold mb-6">Configuration</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Truss Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['howe', 'fink', 'kingpost'] as TrussType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTrussParams({ ...trussParams, type })}
                      className={`px-3 py-2 rounded-lg border-2 font-medium text-sm transition-all capitalize ${trussParams.type === type ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Span (mm)</label>
                  <input type="number" step="100" value={trussParams.span_mm} onChange={(e) => setTrussParams({ ...trussParams, span_mm: parseInt(e.target.value) || 8000 })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rise (mm)</label>
                  <input type="number" step="50" value={trussParams.middleRise_mm} onChange={(e) => setTrussParams({ ...trussParams, middleRise_mm: parseInt(e.target.value) || 1600 })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Overhang (mm)</label>
                <input type="number" step="50" value={trussParams.overhang_mm} onChange={(e) => setTrussParams({ ...trussParams, overhang_mm: parseInt(e.target.value) || 450 })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vertical Web Count
                  <span className="text-xs text-gray-500 ml-2">(Howe only, excludes center)</span>
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="10"
                  value={trussParams.verticalWebCount || 3}
                  onChange={(e) => setTrussParams({ ...trussParams, verticalWebCount: parseInt(e.target.value) || 3 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  disabled={trussParams.type !== 'howe'}
                />
                <p className="text-xs text-gray-500 mt-1">Number of vertical web members (not including center web)</p>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-4">Material Specifications</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Top Chord Section</label>
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={trussParams.topChordMaterial.section}
                        onChange={(e) => {
                          const selected = steelSections.find(s => s.section === e.target.value);
                          setTrussParams({
                            ...trussParams,
                            topChordMaterial: selected || { section: 'Custom', weight_kg_per_m: trussParams.topChordMaterial.weight_kg_per_m }
                          });
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        {steelSections.map(s => (
                          <option key={s.section} value={s.section}>{s.section}</option>
                        ))}
                      </select>
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={trussParams.topChordMaterial.weight_kg_per_m}
                          onChange={(e) => setTrussParams({
                            ...trussParams,
                            topChordMaterial: { ...trussParams.topChordMaterial, weight_kg_per_m: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="kg/m"
                        />
                        <p className="text-xs text-gray-500 mt-1">kg/m</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bottom Chord Section</label>
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={trussParams.bottomChordMaterial.section}
                        onChange={(e) => {
                          const selected = steelSections.find(s => s.section === e.target.value);
                          setTrussParams({
                            ...trussParams,
                            bottomChordMaterial: selected || { section: 'Custom', weight_kg_per_m: trussParams.bottomChordMaterial.weight_kg_per_m }
                          });
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        {steelSections.map(s => (
                          <option key={s.section} value={s.section}>{s.section}</option>
                        ))}
                      </select>
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={trussParams.bottomChordMaterial.weight_kg_per_m}
                          onChange={(e) => setTrussParams({
                            ...trussParams,
                            bottomChordMaterial: { ...trussParams.bottomChordMaterial, weight_kg_per_m: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="kg/m"
                        />
                        <p className="text-xs text-gray-500 mt-1">kg/m</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Web Members Section</label>
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={trussParams.webMaterial.section}
                        onChange={(e) => {
                          const selected = steelSections.find(s => s.section === e.target.value);
                          setTrussParams({
                            ...trussParams,
                            webMaterial: selected || { section: 'Custom', weight_kg_per_m: trussParams.webMaterial.weight_kg_per_m }
                          });
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        {steelSections.map(s => (
                          <option key={s.section} value={s.section}>{s.section}</option>
                        ))}
                      </select>
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={trussParams.webMaterial.weight_kg_per_m}
                          onChange={(e) => setTrussParams({
                            ...trussParams,
                            webMaterial: { ...trussParams.webMaterial, weight_kg_per_m: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="kg/m"
                        />
                        <p className="text-xs text-gray-500 mt-1">kg/m</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-3">
            <h3 className="text-lg font-semibold mb-6">Design Output</h3>
            
            {trussResult ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-sm text-blue-600 mb-1">Total Weight</div>
                    <div className="text-2xl font-bold text-blue-900">{trussResult.summary.totalWeight_kg.toFixed(1)} kg</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-sm text-green-600 mb-1">Plate Count</div>
                    <div className="text-2xl font-bold text-green-900">{trussResult.summary.plateCount}</div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <TrussVisualization trussResult={trussResult} buildingLength_mm={buildingLength_mm} view="truss" />
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Span:</span>
                    <span className="font-medium">{trussResult.geometry.span_mm}mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rise:</span>
                    <span className="font-medium">{trussResult.geometry.rise_mm.toFixed(0)}mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Height:</span>
                    <span className="font-medium">{trussResult.geometry.height_mm.toFixed(0)}mm</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Weight Calculation Details</h4>
                  <div className="space-y-3">
                    {trussResult.members.map((member, idx) => {
                      let materialSpec;
                      let weightPerM;
                      
                      if (member.subtype === 'top') {
                        materialSpec = trussParams.topChordMaterial;
                        weightPerM = trussParams.topChordMaterial.weight_kg_per_m;
                      } else if (member.subtype === 'bottom') {
                        materialSpec = trussParams.bottomChordMaterial;
                        weightPerM = trussParams.bottomChordMaterial.weight_kg_per_m;
                      } else {
                        materialSpec = trussParams.webMaterial;
                        weightPerM = trussParams.webMaterial.weight_kg_per_m;
                      }
                      
                      const lengthM = member.length_mm / 1000;
                      const totalLengthM = lengthM * member.quantity;
                      const totalWeight = totalLengthM * weightPerM;
                      
                      return (
                        <div key={idx} className="bg-gray-50 rounded-lg p-3 text-sm">
                          <div className="font-medium text-gray-900 mb-2">{member.name}</div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div>Section: <span className="font-medium text-gray-800">{materialSpec.section}</span></div>
                            <div>Material: <span className="font-medium text-gray-800">{weightPerM} kg/m</span></div>
                            <div>Length: <span className="font-medium text-gray-800">{lengthM.toFixed(2)}m</span></div>
                            <div>Quantity: <span className="font-medium text-gray-800">{member.quantity}</span></div>
                            <div className="col-span-2 pt-1 border-t border-gray-200 mt-1">
                              Total: <span className="font-bold text-gray-900">{totalLengthM.toFixed(2)}m × {weightPerM} kg/m = {totalWeight.toFixed(2)} kg</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    <div className="bg-blue-100 rounded-lg p-3 text-sm border border-blue-200">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-blue-900">Total Steel Weight (1 truss):</span>
                        <span className="text-lg font-bold text-blue-900">{trussResult.summary.totalWeight_kg.toFixed(2)} kg</span>
                      </div>
                      <div className="text-xs text-blue-700 mt-1">
                        (Top: {trussResult.summary.topChordWeight_kg.toFixed(1)}kg + Bottom: {trussResult.summary.bottomChordWeight_kg.toFixed(1)}kg + Web: {trussResult.summary.webWeight_kg.toFixed(1)}kg + Plates: ~{(trussResult.summary.totalWeight_kg - trussResult.summary.topChordWeight_kg - trussResult.summary.bottomChordWeight_kg - trussResult.summary.webWeight_kg).toFixed(1)}kg)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">Configure truss parameters to see design</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'plan' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-2 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Roof Framing Plan</h3>
              <p className="text-sm text-gray-600">
                Complete roof framing system including trusses, purlins, and bracing
              </p>
            </div>

            {/* Building Dimensions */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-4">Building Dimensions</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Building Length (mm)</label>
                  <input
                    type="number"
                    step="100"
                    value={buildingLength_mm}
                    onChange={(e) => setBuildingLength_mm(parseInt(e.target.value) || 10000)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Truss Spacing (mm)</label>
                  <input
                    type="number"
                    step="50"
                    value={trussParams.spacing_mm}
                    onChange={(e) => setTrussParams({ ...trussParams, spacing_mm: parseInt(e.target.value) || 600 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Framing Configuration */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-4">Framing Configuration</h4>
              <div className="space-y-4">
                {/* Roofing Material */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Roofing Material (DPWH)</label>
                  <select
                    value={framingParams.roofingMaterial?.type || roofingMaterials[0].type}
                    onChange={(e) => {
                      const selected = roofingMaterials.find(m => m.type === e.target.value);
                      if (selected) {
                        setFramingParams({
                          ...framingParams,
                          roofingMaterial: selected,
                          purlinSpacing_mm: Math.min(framingParams.purlinSpacing_mm || 600, selected.maxPurlinSpacing_mm)
                        });
                        
                        // Auto-update DPWH mapping based on selected material
                        setDpwhMappings({
                          ...dpwhMappings,
                          roofingSheets: {
                            dpwhItemNumberRaw: selected.dpwhItem,
                            description: selected.description,
                            unit: 'Square Meter'
                          }
                        });
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    {roofingMaterials.map(m => (
                      <option key={m.type} value={m.type}>
                        {m.dpwhItem} - {m.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Max purlin spacing: {framingParams.roofingMaterial?.maxPurlinSpacing_mm || 600}mm
                  </p>
                </div>

                {/* Purlin Spacing */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Purlin Spacing (mm)</label>
                  <input
                    type="number"
                    step="50"
                    min="400"
                    max={framingParams.roofingMaterial?.maxPurlinSpacing_mm || 1200}
                    value={framingParams.purlinSpacing_mm || 600}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 600;
                      setFramingParams({
                        ...framingParams,
                        purlinSpacing_mm: Math.min(val, framingParams.roofingMaterial?.maxPurlinSpacing_mm || 1200)
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                {/* Purlin Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Purlin Section</label>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={framingParams.purlinSpec?.section || 'C100x50x20x2.0'}
                      onChange={(e) => {
                        const selected = purlinSections.find(s => s.section === e.target.value);
                        if (selected) {
                          setFramingParams({ ...framingParams, purlinSpec: selected });
                        }
                      }}
                      className="col-span-2 px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      {purlinSections.map(s => (
                        <option key={s.section} value={s.section}>{s.section}</option>
                      ))}
                    </select>
                    <div>
                      <input
                        type="number"
                        step="0.1"
                        value={framingParams.purlinSpec?.weight_kg_per_m || 0}
                        readOnly
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg bg-gray-50 text-xs"
                      />
                      <p className="text-xs text-gray-500 text-center">kg/m</p>
                    </div>
                  </div>
                </div>

                {/* Bracing Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bracing Type</label>
                  <div className="space-y-2">
                    {[
                      { type: 'X-Brace' as const, label: 'X-Brace (Cross)' },
                      { type: 'Diagonal' as const, label: 'Single Diagonal' },
                      { type: 'K-Brace' as const, label: 'K-Brace' }
                    ].map(({ type, label }) => (
                      <label key={type} className="flex items-center">
                        <input
                          type="radio"
                          checked={framingParams.bracing?.type === type}
                          onChange={() => setFramingParams({
                            ...framingParams,
                            bracing: { 
                              type,
                              interval_mm: framingParams.bracing?.interval_mm || 6000,
                              material: framingParams.bracing?.material || { section: '2L50x50x6', weight_kg_per_m: 4.6 }
                            }
                          })}
                          className="mr-2"
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Bracing Interval */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bracing Interval (mm)</label>
                  <input
                    type="number"
                    step="500"
                    min="3000"
                    max="10000"
                    value={framingParams.bracing?.interval_mm || 6000}
                    onChange={(e) => setFramingParams({
                      ...framingParams,
                      bracing: { 
                        type: framingParams.bracing?.type || 'X-Brace',
                        interval_mm: parseInt(e.target.value) || 6000,
                        material: framingParams.bracing?.material || { section: '2L50x50x6', weight_kg_per_m: 4.6 }
                      }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                {/* Accessories */}
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={framingParams.includeRidgeCap}
                      onChange={(e) => setFramingParams({ ...framingParams, includeRidgeCap: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm">Include Ridge Cap</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={framingParams.includeEaveGirt}
                      onChange={(e) => setFramingParams({ ...framingParams, includeEaveGirt: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm">Include Eave Girt</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-3 space-y-6">
            {trussResult && framingResult ? (
              <>
                {/* Framing Plan Visualization */}
                <FramingPlanVisualization 
                  framingParams={{
                    trussSpan_mm: trussParams.span_mm,
                    buildingLength_mm,
                    trussSpacing_mm: trussParams.spacing_mm,
                    trussQuantity: calculateTrussQuantity(buildingLength_mm, trussParams.spacing_mm),
                    roofingMaterial: framingParams.roofingMaterial!,
                    purlinSpacing_mm: framingParams.purlinSpacing_mm!,
                    purlinSpec: framingParams.purlinSpec!,
                    bracing: framingParams.bracing!,
                    includeRidgeCap: framingParams.includeRidgeCap!,
                    includeEaveGirt: framingParams.includeEaveGirt!,
                  }}
                  framingResult={framingResult}
                />

                {/* Material Quantities */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-4">Material Quantities</h4>
                  
                  {/* Trusses Summary */}
                  <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded">
                    <div className="font-medium text-indigo-900 mb-2">Trusses</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Quantity:</span>
                        <span className="font-semibold">{calculateTrussQuantity(buildingLength_mm, trussParams.spacing_mm)} units</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Total Weight:</span>
                        <span className="font-semibold">{(trussResult.summary.totalWeight_kg * calculateTrussQuantity(buildingLength_mm, trussParams.spacing_mm)).toFixed(1)} kg</span>
                      </div>
                    </div>
                  </div>

                  {/* Purlins */}
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                    <div className="font-medium text-green-900 mb-2">Purlins ({framingParams.purlinSpec?.section || 'C100x50x20x2.0'})</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Lines per side:</span>
                        <span className="font-semibold">{framingResult.purlins.linesPerSide}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Total lines:</span>
                        <span className="font-semibold">{framingResult.purlins.lines.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Length per line:</span>
                        <span className="font-semibold">{(buildingLength_mm / 1000).toFixed(2)} m</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Total length:</span>
                        <span className="font-semibold">{framingResult.purlins.totalLength_m.toFixed(2)} m</span>
                      </div>
                      <div className="flex justify-between col-span-2 border-t border-green-300 pt-2 mt-1">
                        <span className="text-gray-800 font-medium">Total Weight:</span>
                        <span className="font-bold">{framingResult.purlins.totalWeight_kg.toFixed(1)} kg</span>
                      </div>
                    </div>
                  </div>

                  {/* Bracing */}
                  <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded">
                    <div className="font-medium text-orange-900 mb-2">
                      Cross Bracing ({framingParams.bracing?.type || 'X-Brace'})
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Bays:</span>
                        <span className="font-semibold">{framingResult.bracing.bayCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Members:</span>
                        <span className="font-semibold">{framingResult.bracing.members.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Total length:</span>
                        <span className="font-semibold">{framingResult.bracing.totalLength_m.toFixed(2)} m</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Turnbuckles:</span>
                        <span className="font-semibold">{framingResult.bracing.turnbuckleCount} pcs</span>
                      </div>
                      <div className="flex justify-between col-span-2 border-t border-orange-300 pt-2 mt-1">
                        <span className="text-gray-800 font-medium">Total Weight:</span>
                        <span className="font-bold">{framingResult.bracing.totalWeight_kg.toFixed(1)} kg</span>
                      </div>
                    </div>
                  </div>

                  {/* Accessories */}
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="font-medium text-blue-900 mb-2">Accessories & Fasteners</div>
                    <div className="space-y-2 text-sm">
                      {framingParams.includeRidgeCap && (
                        <div className="flex justify-between">
                          <span className="text-gray-700">Ridge Cap:</span>
                          <span className="font-semibold">{framingResult.accessories.ridgeCap_m.toFixed(2)} m</span>
                        </div>
                      )}
                      {framingParams.includeEaveGirt && (
                        <div className="flex justify-between">
                          <span className="text-gray-700">Eave Girt:</span>
                          <span className="font-semibold">{framingResult.accessories.eaveGirt_m.toFixed(2)} m</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-700">Bolts/Nuts (sets):</span>
                        <span className="font-semibold">{framingResult.accessories.boltsAndNuts} sets</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Purlin Clips:</span>
                        <span className="font-semibold">{framingResult.accessories.purlinClips} pcs</span>
                      </div>
                    </div>
                  </div>

                  {/* Roofing */}
                  <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded">
                    <div className="font-medium text-purple-900 mb-2">
                      Roofing ({framingParams.roofingMaterial?.type || 'GI_Sheet'})
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Roof Area:</span>
                        <span className="font-semibold">{(framingResult.roofing.area_m2).toFixed(2)} m²</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Sheets:</span>
                        <span className="font-semibold">{framingResult.roofing.sheets} pcs</span>
                      </div>
                      <div className="flex justify-between col-span-2">
                        <span className="text-gray-700">Screws:</span>
                        <span className="font-semibold">{framingResult.roofing.screws} pcs</span>
                      </div>
                    </div>
                  </div>

                  {/* Total Summary */}
                  <div className="p-4 bg-gray-900 text-white rounded">
                    <div className="font-bold text-lg mb-2">Total Structural Steel Weight</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Trusses: {(trussResult.summary.totalWeight_kg * calculateTrussQuantity(buildingLength_mm, trussParams.spacing_mm)).toFixed(1)} kg</div>
                      <div>Purlins: {framingResult.purlins.totalWeight_kg.toFixed(1)} kg</div>
                      <div>Bracing: {framingResult.bracing.totalWeight_kg.toFixed(1)} kg</div>
                      <div className="col-span-2 border-t border-gray-600 pt-2 mt-2">
                        <div className="text-2xl font-bold">
                          {(
                            (trussResult.summary.totalWeight_kg * calculateTrussQuantity(buildingLength_mm, trussParams.spacing_mm)) +
                            framingResult.purlins.totalWeight_kg +
                            framingResult.bracing.totalWeight_kg
                          ).toFixed(1)} kg
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* DPWH Pay Item Mapping */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-blue-900">DPWH Catalog Mapping</h4>
                      <p className="text-xs text-blue-600 mt-1">
                        {catalogItems.length > 0 ? `${catalogItems.length} catalog items loaded` : 'Loading catalog...'}
                      </p>
                    </div>
                    <button
                      onClick={() => setDpwhMappings(DEFAULT_DPWH_MAPPINGS)}
                      className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                    >
                      Reset to Defaults
                    </button>
                  </div>
                  <div className="space-y-3 text-sm">
                    {/* Truss Steel */}
                    <div className="bg-white p-3 rounded border border-blue-100">
                      <div className="font-medium text-gray-900 mb-2">Steel Trusses</div>
                      <div className="grid grid-cols-4 gap-2 items-center mb-2">
                        <div className="col-span-2">
                          <select
                            value={dpwhMappings.trussSteel.dpwhItemNumberRaw}
                            onChange={(e) => {
                              const selected = catalogItems.find(item => item.itemNumber === e.target.value);
                              if (selected) {
                                setDpwhMappings({
                                  ...dpwhMappings,
                                  trussSteel: {
                                    dpwhItemNumberRaw: selected.itemNumber,
                                    description: selected.description,
                                    unit: selected.unit
                                  }
                                });
                              }
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-white"
                          >
                            {/* Current selection */}
                            <option value={dpwhMappings.trussSteel.dpwhItemNumberRaw}>
                              {dpwhMappings.trussSteel.dpwhItemNumberRaw} - {dpwhMappings.trussSteel.description.substring(0, 40)}
                            </option>
                            {/* Other options */}
                            {catalogItems.filter(item => 
                              item.unit === 'Kilogram' && 
                              item.itemNumber.startsWith('1047') &&
                              item.itemNumber !== dpwhMappings.trussSteel.dpwhItemNumberRaw
                            ).map(item => (
                              <option key={item.itemNumber} value={item.itemNumber}>
                                {item.itemNumber} - {item.description.substring(0, 40)}{item.description.length > 40 ? '...' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="text-right font-semibold">{(trussResult.summary.totalWeight_kg * calculateTrussQuantity(buildingLength_mm, trussParams.spacing_mm)).toFixed(1)} kg</div>
                        <div className="text-xs text-gray-500">{dpwhMappings.trussSteel.unit}</div>
                      </div>
                      <div className="text-xs text-gray-600">{dpwhMappings.trussSteel.description}</div>
                    </div>

                    {/* Purlin Steel */}
                    <div className="bg-white p-3 rounded border border-blue-100">
                      <div className="font-medium text-gray-900 mb-2">Purlins ({framingParams.purlinSpec?.section})</div>
                      <div className="grid grid-cols-4 gap-2 items-center mb-2">
                        <div className="col-span-2">
                          <select
                            value={dpwhMappings.purlinSteel.dpwhItemNumberRaw}
                            onChange={(e) => {
                              const selected = catalogItems.find(item => item.itemNumber === e.target.value);
                              if (selected) {
                                setDpwhMappings({
                                  ...dpwhMappings,
                                  purlinSteel: {
                                    dpwhItemNumberRaw: selected.itemNumber,
                                    description: selected.description,
                                    unit: selected.unit
                                  }
                                });
                              }
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-white"
                          >
                            {/* Current selection */}
                            <option value={dpwhMappings.purlinSteel.dpwhItemNumberRaw}>
                              {dpwhMappings.purlinSteel.dpwhItemNumberRaw} - {dpwhMappings.purlinSteel.description.substring(0, 40)}
                            </option>
                            {/* Other options */}
                            {catalogItems.filter(item => 
                              item.unit === 'Kilogram' && 
                              item.itemNumber.startsWith('1047') &&
                              item.itemNumber !== dpwhMappings.purlinSteel.dpwhItemNumberRaw
                            ).map(item => (
                              <option key={item.itemNumber} value={item.itemNumber}>
                                {item.itemNumber} - {item.description.substring(0, 40)}{item.description.length > 40 ? '...' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="text-right font-semibold">{framingResult.purlins.totalWeight_kg.toFixed(1)} kg</div>
                        <div className="text-xs text-gray-500">{dpwhMappings.purlinSteel.unit}</div>
                      </div>
                      <div className="text-xs text-gray-600">{dpwhMappings.purlinSteel.description}</div>
                    </div>

                    {/* Bracing Steel */}
                    <div className="bg-white p-3 rounded border border-blue-100">
                      <div className="font-medium text-gray-900 mb-2">Turnbuckles ({framingParams.bracing?.type})</div>
                      <div className="grid grid-cols-4 gap-2 items-center mb-2">
                        <div className="col-span-2">
                          <select
                            value={dpwhMappings.bracingSteel.dpwhItemNumberRaw}
                            onChange={(e) => {
                              const selected = catalogItems.find(item => item.itemNumber === e.target.value);
                              if (selected) {
                                setDpwhMappings({
                                  ...dpwhMappings,
                                  bracingSteel: {
                                    dpwhItemNumberRaw: selected.itemNumber,
                                    description: selected.description,
                                    unit: selected.unit
                                  }
                                });
                              }
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-white"
                          >
                            {/* Current selection */}
                            <option value={dpwhMappings.bracingSteel.dpwhItemNumberRaw}>
                              {dpwhMappings.bracingSteel.dpwhItemNumberRaw} - {dpwhMappings.bracingSteel.description.substring(0, 40)}
                            </option>
                            {/* Other options */}
                            {catalogItems.filter(item => 
                              item.itemNumber.startsWith('1047') &&
                              item.itemNumber !== dpwhMappings.bracingSteel.dpwhItemNumberRaw
                            ).map(item => (
                              <option key={item.itemNumber} value={item.itemNumber}>
                                {item.itemNumber} - {item.description.substring(0, 40)}{item.description.length > 40 ? '...' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="text-right font-semibold">{framingResult.bracing.turnbuckleCount} pcs</div>
                        <div className="text-xs text-gray-500">{dpwhMappings.bracingSteel.unit}</div>
                      </div>
                      <div className="text-xs text-gray-600">{dpwhMappings.bracingSteel.description}</div>
                    </div>

                    {/* Sag Rods */}
                    <div className="bg-white p-3 rounded border border-blue-100">
                      <div className="font-medium text-gray-900 mb-2">Sag Rods</div>
                      <div className="grid grid-cols-4 gap-2 items-center mb-2">
                        <div className="col-span-2">
                          <select
                            value={dpwhMappings.sagRods.dpwhItemNumberRaw}
                            onChange={(e) => {
                              const selected = catalogItems.find(item => item.itemNumber === e.target.value);
                              if (selected) {
                                setDpwhMappings({
                                  ...dpwhMappings,
                                  sagRods: {
                                    dpwhItemNumberRaw: selected.itemNumber,
                                    description: selected.description,
                                    unit: selected.unit
                                  }
                                });
                              }
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-white"
                          >
                            {/* Current selection */}
                            <option value={dpwhMappings.sagRods.dpwhItemNumberRaw}>
                              {dpwhMappings.sagRods.dpwhItemNumberRaw} - {dpwhMappings.sagRods.description.substring(0, 40)}
                            </option>
                            {/* Other options */}
                            {catalogItems.filter(item => 
                              item.unit === 'Kilogram' && 
                              item.itemNumber.startsWith('1047') &&
                              item.itemNumber !== dpwhMappings.sagRods.dpwhItemNumberRaw
                            ).map(item => (
                              <option key={item.itemNumber} value={item.itemNumber}>
                                {item.itemNumber} - {item.description.substring(0, 40)}{item.description.length > 40 ? '...' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="text-right font-semibold">Est. {Math.ceil(framingResult.purlins.linesPerSide * 2 * 0.5)} kg</div>
                        <div className="text-xs text-gray-500">{dpwhMappings.sagRods.unit}</div>
                      </div>
                      <div className="text-xs text-gray-600">{dpwhMappings.sagRods.description}</div>
                    </div>

                    {/* Steel Plates */}
                    <div className="bg-white p-3 rounded border border-blue-100">
                      <div className="font-medium text-gray-900 mb-2">Steel Plates (Gussets & Base)</div>
                      <div className="grid grid-cols-4 gap-2 items-center mb-2">
                        <div className="col-span-2">
                          <select
                            value={dpwhMappings.steelPlates.dpwhItemNumberRaw}
                            onChange={(e) => {
                              const selected = catalogItems.find(item => item.itemNumber === e.target.value);
                              if (selected) {
                                setDpwhMappings({
                                  ...dpwhMappings,
                                  steelPlates: {
                                    dpwhItemNumberRaw: selected.itemNumber,
                                    description: selected.description,
                                    unit: selected.unit
                                  }
                                });
                              }
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-white"
                          >
                            {/* Current selection */}
                            <option value={dpwhMappings.steelPlates.dpwhItemNumberRaw}>
                              {dpwhMappings.steelPlates.dpwhItemNumberRaw} - {dpwhMappings.steelPlates.description.substring(0, 40)}
                            </option>
                            {/* Other options */}
                            {catalogItems.filter(item => 
                              item.unit === 'Kilogram' && 
                              item.itemNumber.startsWith('1047') &&
                              item.itemNumber !== dpwhMappings.steelPlates.dpwhItemNumberRaw
                            ).map(item => (
                              <option key={item.itemNumber} value={item.itemNumber}>
                                {item.itemNumber} - {item.description.substring(0, 40)}{item.description.length > 40 ? '...' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="text-right font-semibold">Est. {Math.ceil(calculateTrussQuantity(buildingLength_mm, trussParams.spacing_mm) * 5)} kg</div>
                        <div className="text-xs text-gray-500">{dpwhMappings.steelPlates.unit}</div>
                      </div>
                      <div className="text-xs text-gray-600">{dpwhMappings.steelPlates.description}</div>
                    </div>

                    {/* Bolts and Rods */}
                    <div className="bg-white p-3 rounded border border-blue-100">
                      <div className="font-medium text-gray-900 mb-2">Bolts, Nuts & Washers</div>
                      <div className="grid grid-cols-4 gap-2 items-center mb-2">
                        <div className="col-span-2">
                          <select
                            value={dpwhMappings.boltsAndRods.dpwhItemNumberRaw}
                            onChange={(e) => {
                              const selected = catalogItems.find(item => item.itemNumber === e.target.value);
                              if (selected) {
                                setDpwhMappings({
                                  ...dpwhMappings,
                                  boltsAndRods: {
                                    dpwhItemNumberRaw: selected.itemNumber,
                                    description: selected.description,
                                    unit: selected.unit
                                  }
                                });
                              }
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-white"
                          >
                            {/* Current selection */}
                            <option value={dpwhMappings.boltsAndRods.dpwhItemNumberRaw}>
                              {dpwhMappings.boltsAndRods.dpwhItemNumberRaw} - {dpwhMappings.boltsAndRods.description.substring(0, 40)}
                            </option>
                            {/* Other options */}
                            {catalogItems.filter(item => 
                              item.itemNumber.startsWith('1047') &&
                              item.itemNumber !== dpwhMappings.boltsAndRods.dpwhItemNumberRaw
                            ).map(item => (
                              <option key={item.itemNumber} value={item.itemNumber}>
                                {item.itemNumber} - {item.description.substring(0, 40)}{item.description.length > 40 ? '...' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="text-right font-semibold">{framingResult.accessories.boltsAndNuts} sets</div>
                        <div className="text-xs text-gray-500">{dpwhMappings.boltsAndRods.unit}</div>
                      </div>
                      <div className="text-xs text-gray-600">{dpwhMappings.boltsAndRods.description}</div>
                    </div>

                    {/* Roofing Sheets */}
                    <div className="bg-white p-3 rounded border border-blue-100">
                      <div className="font-medium text-gray-900 mb-2">Roofing Sheets ({framingParams.roofingMaterial?.type})</div>
                      <div className="grid grid-cols-4 gap-2 items-center mb-2">
                        <div className="col-span-2">
                          <select
                            value={dpwhMappings.roofingSheets.dpwhItemNumberRaw}
                            onChange={(e) => {
                              const selected = catalogItems.find(item => item.itemNumber === e.target.value);
                              if (selected) {
                                setDpwhMappings({
                                  ...dpwhMappings,
                                  roofingSheets: {
                                    dpwhItemNumberRaw: selected.itemNumber,
                                    description: selected.description,
                                    unit: selected.unit
                                  }
                                });
                              }
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-white"
                          >
                            {/* Current selection */}
                            <option value={dpwhMappings.roofingSheets.dpwhItemNumberRaw}>
                              {dpwhMappings.roofingSheets.dpwhItemNumberRaw} - {dpwhMappings.roofingSheets.description.substring(0, 40)}
                            </option>
                            {/* Other options */}
                            {catalogItems.filter(item => 
                              item.unit === 'Square Meter' && 
                              item.itemNumber.startsWith('1013') &&
                              item.itemNumber !== dpwhMappings.roofingSheets.dpwhItemNumberRaw
                            ).map(item => (
                              <option key={item.itemNumber} value={item.itemNumber}>
                                {item.itemNumber} - {item.description.substring(0, 40)}{item.description.length > 40 ? '...' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="text-right font-semibold">{framingResult.roofing.area_m2.toFixed(2)} m²</div>
                        <div className="text-xs text-gray-500">{dpwhMappings.roofingSheets.unit}</div>
                      </div>
                      <div className="text-xs text-gray-600">{dpwhMappings.roofingSheets.description}</div>
                    </div>

                    {framingParams.includeRidgeCap && (
                      <div className="bg-white p-3 rounded border border-blue-100">
                        <div className="font-medium text-gray-900 mb-2">Ridge Cap</div>
                        <div className="grid grid-cols-4 gap-2 items-center mb-2">
                          <div className="col-span-2">
                            <select
                              value={dpwhMappings.ridgeCap.dpwhItemNumberRaw}
                              onChange={(e) => {
                                const selected = catalogItems.find(item => item.itemNumber === e.target.value);
                                if (selected) {
                                  setDpwhMappings({
                                    ...dpwhMappings,
                                    ridgeCap: {
                                      dpwhItemNumberRaw: selected.itemNumber,
                                      description: selected.description,
                                      unit: selected.unit
                                    }
                                  });
                                }
                              }}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-white"
                            >
                              {/* Current selection */}
                              <option value={dpwhMappings.ridgeCap.dpwhItemNumberRaw}>
                                {dpwhMappings.ridgeCap.dpwhItemNumberRaw} - {dpwhMappings.ridgeCap.description.substring(0, 40)}
                              </option>
                              {/* Other options */}
                              {catalogItems.filter(item => 
                                item.unit === 'Linear Meter' && 
                                item.itemNumber.startsWith('1013') &&
                                item.itemNumber !== dpwhMappings.ridgeCap.dpwhItemNumberRaw
                              ).map(item => (
                                <option key={item.itemNumber} value={item.itemNumber}>
                                  {item.itemNumber} - {item.description.substring(0, 40)}{item.description.length > 40 ? '...' : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="text-right font-semibold">{framingResult.accessories.ridgeCap_m.toFixed(2)} m</div>
                          <div className="text-xs text-gray-500">{dpwhMappings.ridgeCap.unit}</div>
                        </div>
                        <div className="text-xs text-gray-600">{dpwhMappings.ridgeCap.description}</div>
                      </div>
                    )}
                    
                    <div className="bg-blue-900 text-white p-3 rounded -mx-2 mt-4">
                      <div className="font-bold mb-1">Total Structural Steel</div>
                      <div className="text-2xl font-bold">
                        {(
                          (trussResult.summary.totalWeight_kg * calculateTrussQuantity(buildingLength_mm, trussParams.spacing_mm)) +
                          framingResult.purlins.totalWeight_kg +
                          framingResult.bracing.totalWeight_kg
                        ).toFixed(1)} kg
                      </div>
                      <div className="text-xs text-blue-200 mt-1">Ready for BOQ export</div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Configure truss parameters in the Structural Design tab to see the framing plan
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
