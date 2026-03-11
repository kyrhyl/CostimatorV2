'use client';

import { useState, useEffect } from 'react';
import type { FinishType, Space, SpaceFinishAssignment, DPWHCatalogItem, GridLine } from '@/types';

interface FinishesManagerProps {
  projectId: string;
  gridX: GridLine[];
  gridY: GridLine[];
}

export default function FinishesManager({ projectId, gridX, gridY }: FinishesManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'types' | 'assignments' | 'wallAssignments'>('types');
  const [finishTypes, setFinishTypes] = useState<FinishType[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [assignments, setAssignments] = useState<SpaceFinishAssignment[]>([]);
  const [wallSurfaces, setWallSurfaces] = useState<any[]>([]);
  const [wallAssignments, setWallAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTypeForm, setShowCreateTypeForm] = useState(false);
  const [catalogItems, setCatalogItems] = useState<DPWHCatalogItem[]>([]);

  // Form state for finish type
  const [typeFormData, setTypeFormData] = useState({
    category: 'floor' as 'floor' | 'wall' | 'ceiling' | 'plaster' | 'paint',
    finishName: '',
    dpwhItemNumberRaw: '',
    unit: '',
    wallHeightMode: 'fullHeight' as 'fullHeight' | 'fixed',
    wallHeightValue: '1.2',
    deductionEnabled: true,
    deductionMinArea: '0.5',
    deductionTypes: ['door', 'window'],
    wastePercent: '0.05',
    rounding: '2',
  });

  // Form state for assignment
  const [assignmentFormData, setAssignmentFormData] = useState({
    spaceId: '',
    finishTypeId: '',
    scope: 'base',
  });

  // Form state for wall surface assignment
  const [wallAssignmentFormData, setWallAssignmentFormData] = useState({
    wallSurfaceId: '',
    finishTypeId: '',
    scope: 'base',
  });

  useEffect(() => {
    loadData();
    loadCatalog();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [finishTypesRes, spacesRes, assignmentsRes, wallSurfacesRes, wallAssignmentsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/finish-types`),
        fetch(`/api/projects/${projectId}/spaces`),
        fetch(`/api/projects/${projectId}/finish-assignments`),
        fetch(`/api/projects/${projectId}/wall-surfaces`),
        fetch(`/api/projects/${projectId}/wall-surface-assignments`),
      ]);

      const finishTypesData = await finishTypesRes.json();
      const spacesData = await spacesRes.json();
      const assignmentsData = await assignmentsRes.json();
      const wallSurfacesData = await wallSurfacesRes.json();
      const wallAssignmentsData = wallAssignmentsRes.ok ? await wallAssignmentsRes.json() : { assignments: [] };

      console.log('Wall assignments loaded:', wallAssignmentsData);

      setFinishTypes(finishTypesData.finishTypes || []);
      setSpaces(spacesData.spaces || []);
      setAssignments(assignmentsData.assignments || []);
      setWallSurfaces(wallSurfacesData.wallSurfaces || []);
      setWallAssignments(wallAssignmentsData.assignments || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCatalog = async () => {
    try {
      // Load finishing-related items by searching keywords instead of filtering by trade
      const res = await fetch('/api/catalog?query=&limit=5000');
      const data = await res.json();
      
      console.log('Catalog API response:', data);
      
      // Filter to finishing-related items AND masonry/CHB items based on description keywords
      const finishingKeywords = ['paint', 'tile', 'tiles', 'plaster', 'ceiling', 'floor', 'wall', 
                                  'finish', 'ceramic', 'vinyl', 'carpet', 'epoxy', 'gypsum',
                                  'concrete topping', 'cement finish', 'terrazzo', 'marble',
                                  'CHB', 'masonry', 'block', 'hollow block', 'concrete hollow'];
      
      const allItems = data.data || data.items || [];
      const finishingItems = allItems.filter((item: any) => {
        const desc = item.description.toLowerCase();
        // Include items matching finishing keywords OR item 1046.x (masonry)
        return finishingKeywords.some(keyword => desc.includes(keyword)) || 
               item.itemNumber?.startsWith('1046');
      });
      
      console.log('Filtered finishing items:', finishingItems.length);
      setCatalogItems(finishingItems);
    } catch (error) {
      console.error('Error loading catalog:', error);
    }
  };

  const handleCatalogItemSelect = (itemNumber: string) => {
    const item = catalogItems.find(i => i.itemNumber === itemNumber);
    if (item) {
      setTypeFormData({
        ...typeFormData,
        dpwhItemNumberRaw: item.itemNumber,
        unit: item.unit,
        finishName: typeFormData.finishName || item.description.substring(0, 50),
      });
    }
  };

  const handleCreateFinishType = async (e: React.FormEvent) => {
    e.preventDefault();

    const body: any = {
      category: typeFormData.category,
      finishName: typeFormData.finishName,
      dpwhItemNumberRaw: typeFormData.dpwhItemNumberRaw,
      unit: typeFormData.unit,
      assumptions: {
        wastePercent: parseFloat(typeFormData.wastePercent),
        rounding: parseInt(typeFormData.rounding),
      },
    };

    if (typeFormData.category === 'wall' || typeFormData.category === 'plaster' || typeFormData.category === 'paint') {
      body.wallHeightRule = {
        mode: typeFormData.wallHeightMode,
        value_m: typeFormData.wallHeightMode === 'fixed' ? parseFloat(typeFormData.wallHeightValue) : undefined,
      };
      body.deductionRule = {
        enabled: typeFormData.deductionEnabled,
        minOpeningAreaToDeduct_m2: parseFloat(typeFormData.deductionMinArea),
        includeTypes: typeFormData.deductionTypes,
      };
    }

    try {
      await fetch(`/api/projects/${projectId}/finish-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      setShowCreateTypeForm(false);
      resetTypeForm();
      loadData();
    } catch (error) {
      console.error('Error creating finish type:', error);
      alert('Failed to create finish type');
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await fetch(`/api/projects/${projectId}/finish-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignmentFormData),
      });

      resetAssignmentForm();
      loadData();
    } catch (error) {
      console.error('Error creating assignment:', error);
      alert('Failed to create assignment');
    }
  };

  const handleDeleteFinishType = async (finishTypeId: string) => {
    if (!confirm('Delete this finish type?')) return;

    try {
      await fetch(`/api/projects/${projectId}/finish-types?finishTypeId=${finishTypeId}`, {
        method: 'DELETE',
      });
      loadData();
    } catch (error) {
      console.error('Error deleting finish type:', error);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      await fetch(`/api/projects/${projectId}/finish-assignments?assignmentId=${assignmentId}`, {
        method: 'DELETE',
      });
      loadData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
    }
  };

  const resetTypeForm = () => {
    setTypeFormData({
      category: 'floor',
      finishName: '',
      dpwhItemNumberRaw: '',
      unit: '',
      wallHeightMode: 'fullHeight',
      wallHeightValue: '1.2',
      deductionEnabled: true,
      deductionMinArea: '0.5',
      deductionTypes: ['door', 'window'],
      wastePercent: '0.05',
      rounding: '2',
    });
  };

  const resetAssignmentForm = () => {
    setAssignmentFormData({
      spaceId: '',
      finishTypeId: '',
      scope: 'base',
    });
  };

  const handleCreateWallAssignment = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Creating wall assignment:', wallAssignmentFormData);

    try {
      const response = await fetch(`/api/projects/${projectId}/wall-surface-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wallAssignmentFormData),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Error response:', error);
        throw new Error(error.error || 'Failed to create assignment');
      }

      const result = await response.json();
      console.log('Wall assignment created:', result);

      resetWallAssignmentForm();
      loadData();
    } catch (error) {
      console.error('Error creating wall assignment:', error);
      alert('Failed to create wall assignment');
    }
  };

  const handleDeleteWallAssignment = async (assignmentId: string) => {
    try {
      await fetch(`/api/projects/${projectId}/wall-surface-assignments?assignmentId=${assignmentId}`, {
        method: 'DELETE',
      });
      loadData();
    } catch (error) {
      console.error('Error deleting wall assignment:', error);
    }
  };

  const resetWallAssignmentForm = () => {
    setWallAssignmentFormData({
      wallSurfaceId: '',
      finishTypeId: '',
      scope: 'base',
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-5xl mb-4">🎨</div>
        <p className="text-gray-500">Loading finishes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-600 mb-1">Finish Types</div>
          <div className="text-2xl font-bold text-blue-900">{finishTypes.length}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-600 mb-1">Assignments</div>
          <div className="text-2xl font-bold text-green-900">{assignments.length}</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-purple-600 mb-1">Spaces Available</div>
          <div className="text-2xl font-bold text-purple-900">{spaces.length}</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-4">
          <div className="text-sm text-amber-600 mb-1">Categories</div>
          <div className="text-2xl font-bold text-amber-900">
            {new Set(finishTypes.map(ft => ft.category)).size}
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveSubTab('types')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeSubTab === 'types'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              📋 Finish Types ({finishTypes.length})
            </button>
            <button
              onClick={() => setActiveSubTab('assignments')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeSubTab === 'assignments'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              🎯 Space Assignments ({assignments.length})
            </button>
            <button
              onClick={() => setActiveSubTab('wallAssignments')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeSubTab === 'wallAssignments'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              🧱 Wall Surface Finishes ({wallSurfaces.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Finish Types Tab */}
          {activeSubTab === 'types' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Finish Type Templates</h3>
                <button
                  onClick={() => setShowCreateTypeForm(!showCreateTypeForm)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
                >
                  {showCreateTypeForm ? '✕ Cancel' : '+ New Finish Type'}
                </button>
              </div>

              {/* Create Form */}
              {showCreateTypeForm && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <form onSubmit={handleCreateFinishType} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                        <select
                          value={typeFormData.category}
                          onChange={(e) =>
                            setTypeFormData({
                              ...typeFormData,
                              category: e.target.value as any,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          <option value="floor">Floor</option>
                          <option value="wall">Wall</option>
                          <option value="ceiling">Ceiling</option>
                          <option value="plaster">Plaster</option>
                          <option value="paint">Paint</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Finish Name *</label>
                        <input
                          type="text"
                          value={typeFormData.finishName}
                          onChange={(e) =>
                            setTypeFormData({ ...typeFormData, finishName: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="e.g., Ceramic Tile, Paint"
                          required
                        />
                      </div>
                    </div>

                    {/* DPWH Catalog Dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select DPWH Pay Item *
                      </label>
                      <select
                        value={typeFormData.dpwhItemNumberRaw}
                        onChange={(e) => handleCatalogItemSelect(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      >
                        <option value="">-- Select from catalog --</option>
                        {catalogItems
                          .filter((item) => {
                            const desc = item.description.toLowerCase();
                            const itemNum = item.itemNumber || '';
                            
                            // Filter based on selected category
                            switch (typeFormData.category) {
                              case 'floor':
                                return desc.includes('floor') || desc.includes('tile') || 
                                       desc.includes('terrazzo') || desc.includes('vinyl') || 
                                       desc.includes('carpet') || desc.includes('epoxy') ||
                                       itemNum.startsWith('1018') || itemNum.startsWith('1019') ||
                                       itemNum.startsWith('1020') || itemNum.startsWith('1053');
                              case 'wall':
                                return desc.includes('wall') || desc.includes('tile') || 
                                       desc.includes('CHB') || desc.includes('masonry') ||
                                       itemNum.startsWith('1021') || itemNum.startsWith('1022') ||
                                       itemNum.startsWith('1046');
                              case 'ceiling':
                                return desc.includes('ceiling') || desc.includes('acoustical') ||
                                       itemNum.startsWith('1030') || itemNum.startsWith('1045');
                              case 'plaster':
                                return desc.includes('plaster') || desc.includes('cement finish') ||
                                       itemNum.startsWith('1023') || itemNum.startsWith('1024') ||
                                       itemNum.startsWith('1025');
                              case 'paint':
                                return desc.includes('paint') || desc.includes('varnish') ||
                                       itemNum.startsWith('1032');
                              default:
                                return true; // Show all if no category filter
                            }
                          })
                          .map((item) => (
                            <option key={item.itemNumber} value={item.itemNumber}>
                              {item.itemNumber} - {item.description} ({item.unit})
                            </option>
                          ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        {(() => {
                          const filteredCount = catalogItems.filter((item) => {
                            const desc = item.description.toLowerCase();
                            const itemNum = item.itemNumber || '';
                            
                            switch (typeFormData.category) {
                              case 'floor':
                                return desc.includes('floor') || desc.includes('tile') || 
                                       desc.includes('terrazzo') || desc.includes('vinyl') || 
                                       desc.includes('carpet') || desc.includes('epoxy') ||
                                       itemNum.startsWith('1018') || itemNum.startsWith('1019') ||
                                       itemNum.startsWith('1020') || itemNum.startsWith('1053');
                              case 'wall':
                                return desc.includes('wall') || desc.includes('tile') || 
                                       desc.includes('CHB') || desc.includes('masonry') ||
                                       itemNum.startsWith('1021') || itemNum.startsWith('1022') ||
                                       itemNum.startsWith('1046');
                              case 'ceiling':
                                return desc.includes('ceiling') || desc.includes('acoustical') ||
                                       itemNum.startsWith('1030') || itemNum.startsWith('1045');
                              case 'plaster':
                                return desc.includes('plaster') || desc.includes('cement finish') ||
                                       itemNum.startsWith('1023') || itemNum.startsWith('1024') ||
                                       itemNum.startsWith('1025');
                              case 'paint':
                                return desc.includes('paint') || desc.includes('varnish') ||
                                       itemNum.startsWith('1032');
                              default:
                                return true;
                            }
                          }).length;
                          return `Showing ${filteredCount} ${typeFormData.category} items`;
                        })()}
                      </p>
                      {typeFormData.dpwhItemNumberRaw && (
                        <p className="mt-1 text-xs text-green-600 font-medium">
                          ✓ Selected: {typeFormData.dpwhItemNumberRaw} | Unit: {typeFormData.unit}
                        </p>
                      )}
                    </div>

                    {/* Wall-specific settings */}
                    {(typeFormData.category === 'wall' ||
                      typeFormData.category === 'plaster' ||
                      typeFormData.category === 'paint') && (
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="font-medium text-gray-900 mb-3">Wall-Specific Settings</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Height Mode</label>
                            <select
                              value={typeFormData.wallHeightMode}
                              onChange={(e) =>
                                setTypeFormData({
                                  ...typeFormData,
                                  wallHeightMode: e.target.value as any,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            >
                              <option value="fullHeight">Full Storey Height</option>
                              <option value="fixed">Fixed Height (Wainscot)</option>
                            </select>
                          </div>

                          {typeFormData.wallHeightMode === 'fixed' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Height Value (m)
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                value={typeFormData.wallHeightValue}
                                onChange={(e) =>
                                  setTypeFormData({ ...typeFormData, wallHeightValue: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                            </div>
                          )}
                        </div>

                        <div className="mt-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={typeFormData.deductionEnabled}
                              onChange={(e) =>
                                setTypeFormData({
                                  ...typeFormData,
                                  deductionEnabled: e.target.checked,
                                })
                              }
                              className="mr-2 w-4 h-4 text-green-600"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Deduct openings (doors, windows)
                            </span>
                          </label>

                          {typeFormData.deductionEnabled && (
                            <div className="ml-6 mt-3">
                              <label className="block text-sm text-gray-700 mb-1">
                                Minimum area to deduct (m²)
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                value={typeFormData.deductionMinArea}
                                onChange={(e) =>
                                  setTypeFormData({
                                    ...typeFormData,
                                    deductionMinArea: e.target.value,
                                  })
                                }
                                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Waste %</label>
                        <input
                          type="number"
                          step="0.01"
                          value={typeFormData.wastePercent}
                          onChange={(e) =>
                            setTypeFormData({ ...typeFormData, wastePercent: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Rounding (decimals)</label>
                        <input
                          type="number"
                          value={typeFormData.rounding}
                          onChange={(e) =>
                            setTypeFormData({ ...typeFormData, rounding: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm transition-colors"
                      >
                        Create Finish Type
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateTypeForm(false)}
                        className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Finish Types Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DPWH Item</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {finishTypes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center">
                          <div className="text-gray-400 text-4xl mb-3">📋</div>
                          <p className="text-gray-500">No finish types defined yet</p>
                          <p className="text-sm text-gray-400 mt-1">Create one using the button above</p>
                        </td>
                      </tr>
                    ) : (
                      finishTypes.map((ft) => (
                        <tr key={ft.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-900">{ft.finishName}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                              {ft.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{ft.dpwhItemNumberRaw}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{ft.unit}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleDeleteFinishType(ft.id)}
                              className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Assignments Tab */}
          {activeSubTab === 'assignments' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Assign Finishes to Spaces</h3>

              {/* Create Assignment Form */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <form onSubmit={handleCreateAssignment} className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Space *</label>
                    <select
                      value={assignmentFormData.spaceId}
                      onChange={(e) =>
                        setAssignmentFormData({ ...assignmentFormData, spaceId: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Space</option>
                      {spaces.map((space) => (
                        <option key={space.id} value={space.id}>
                          {space.name} ({space.levelId})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Finish Type *</label>
                    <select
                      value={assignmentFormData.finishTypeId}
                      onChange={(e) =>
                        setAssignmentFormData({ ...assignmentFormData, finishTypeId: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Finish</option>
                      {finishTypes.map((ft) => (
                        <option key={ft.id} value={ft.id}>
                          {ft.finishName} ({ft.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Scope *</label>
                    <input
                      type="text"
                      value={assignmentFormData.scope}
                      onChange={(e) =>
                        setAssignmentFormData({ ...assignmentFormData, scope: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="base, wainscot..."
                      required
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm transition-colors"
                    >
                      Assign
                    </button>
                  </div>
                </form>
              </div>

              {/* Assignments Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Space</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Area (m²)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Dimension</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Finish Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scope</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assignments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center">
                          <div className="text-gray-400 text-4xl mb-3">🎯</div>
                          <p className="text-gray-500">No assignments yet</p>
                          <p className="text-sm text-gray-400 mt-1">Assign finishes to spaces using the form above</p>
                        </td>
                      </tr>
                    ) : (
                      assignments.map((assignment) => {
                        const space = spaces.find((s) => s.id === assignment.spaceId);
                        const finishType = finishTypes.find(
                          (ft) => ft.id === assignment.finishTypeId
                        );
                        
                        // Calculate dimensions from grid bounds
                        let dimensionText = 'N/A';
                        if (space?.boundary?.type === 'gridRect') {
                          const boundaryData = space.boundary.data as { gridX: [string, string]; gridY: [string, string] };
                          const [xStart, xEnd] = boundaryData.gridX;
                          const [yStart, yEnd] = boundaryData.gridY;
                          const xStartLine = gridX.find(g => g.label === xStart);
                          const xEndLine = gridX.find(g => g.label === xEnd);
                          const yStartLine = gridY.find(g => g.label === yStart);
                          const yEndLine = gridY.find(g => g.label === yEnd);
                          
                          if (xStartLine && xEndLine && yStartLine && yEndLine) {
                            const width = Math.abs(xEndLine.offset - xStartLine.offset);
                            const length = Math.abs(yEndLine.offset - yStartLine.offset);
                            dimensionText = `${width.toFixed(2)} × ${length.toFixed(2)}`;
                          }
                        }

                        return (
                          <tr key={assignment.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-medium text-gray-900">
                                {space?.name || assignment.spaceId}
                              </span>
                              <div className="text-xs text-gray-500">{space?.levelId}</div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-semibold text-blue-600">
                                {space?.computed?.area_m2?.toFixed(2) || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-600">
                              {dimensionText}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {finishType?.finishName || assignment.finishTypeId}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                                {finishType?.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{assignment.scope}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleDeleteAssignment(assignment.id)}
                                className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Wall Surface Finishes Tab */}
          {activeSubTab === 'wallAssignments' && (
            <div className="space-y-6">
              {/* Assignment Form */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Create Wall Surface Assignment</h3>
                <form onSubmit={handleCreateWallAssignment} className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Wall Surface *</label>
                    <select
                      value={wallAssignmentFormData.wallSurfaceId}
                      onChange={(e) =>
                        setWallAssignmentFormData({ ...wallAssignmentFormData, wallSurfaceId: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select wall surface</option>
                      {wallSurfaces.map((ws) => (
                        <option key={ws.id} value={ws.id}>
                          {ws.name} ({ws.surfaceType})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Finish Type *</label>
                    <select
                      value={wallAssignmentFormData.finishTypeId}
                      onChange={(e) =>
                        setWallAssignmentFormData({ ...wallAssignmentFormData, finishTypeId: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select finish type</option>
                      {finishTypes.map((ft) => (
                        <option key={ft.id} value={ft.id}>
                          {ft.finishName} ({ft.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Scope *</label>
                    <input
                      type="text"
                      value={wallAssignmentFormData.scope}
                      onChange={(e) =>
                        setWallAssignmentFormData({ ...wallAssignmentFormData, scope: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="base, exterior..."
                      required
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm transition-colors"
                    >
                      Assign
                    </button>
                  </div>
                </form>
              </div>

              {/* Assignments Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wall Surface</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Area (m²)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Dimension</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Finish Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scope</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {wallAssignments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center">
                          <div className="text-gray-400 text-4xl mb-3">🧱</div>
                          <p className="text-gray-500">No wall surface assignments yet</p>
                          <p className="text-xs text-gray-400 mt-1">Assign finishes like CHB, plaster, or paint to wall surfaces</p>
                        </td>
                      </tr>
                    ) : (
                      wallAssignments.map((assignment) => {
                        const wallSurface = wallSurfaces.find((ws) => ws.id === assignment.wallSurfaceId);
                        const finishType = finishTypes.find((ft) => ft.id === assignment.finishTypeId);
                        
                        if (!wallSurface || !finishType) return null;

                        const area = wallSurface.computed?.totalArea_m2 || 0;
                        const length = wallSurface.computed?.length_m || 0;
                        const height = wallSurface.computed?.height_m || 0;

                        return (
                          <tr key={assignment.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{wallSurface.name}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                Grid: {wallSurface.gridLine.axis} = {wallSurface.gridLine.label}
                              </div>
                              <div className="text-xs text-gray-500">
                                Levels: {wallSurface.levelStart} → {wallSurface.levelEnd}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                              {area.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right text-xs text-gray-500">
                              {length.toFixed(2)}m × {height.toFixed(2)}m
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{finishType.finishName}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                                finishType.category === 'floor' ? 'bg-purple-100 text-purple-700' :
                                finishType.category === 'wall' ? 'bg-blue-100 text-blue-700' :
                                finishType.category === 'ceiling' ? 'bg-green-100 text-green-700' :
                                finishType.category === 'plaster' ? 'bg-orange-100 text-orange-700' :
                                finishType.category === 'paint' ? 'bg-pink-100 text-pink-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {finishType?.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{assignment.scope}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleDeleteWallAssignment(assignment.id)}
                                className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
