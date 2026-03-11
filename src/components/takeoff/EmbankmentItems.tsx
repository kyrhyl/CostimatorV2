'use client';

import React, { useState, useEffect } from 'react';
import type { ScheduleItem } from '@/types';

interface EmbankmentItemsProps {
  projectId: string;
}

interface EmbankmentItem {
  id: string;
  description: string;
  length_m: number;
  width_m: number;
  height_m: number;
  count: number;
  volume_m3: number;
  location: string;
  dpwhItemNumber: string;
  dpwhUnit: string;
}

interface CatalogItem {
  itemNumber: string;
  description: string;
  unit: string;
  category: string;
  trade: string;
}

export default function EmbankmentItems({ projectId }: EmbankmentItemsProps) {
  const [items, setItems] = useState<EmbankmentItem[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    dpwhItemNumber: '',
    dpwhUnit: '',
    description: '',
    length: '',
    width: '',
    height: '',
    count: '1',
    location: '',
  });

  useEffect(() => {
    loadCatalogItems();
  }, [projectId]);

  useEffect(() => {
    if (catalogItems.length > 0) {
      loadItems();
    }
  }, [projectId, catalogItems]);

  const loadItems = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/schedule-items?category=earthworks-embankment`);
      if (res.ok) {
        const data = await res.json();
        const scheduleItems = data.scheduleItems || [];
        
        // Parse items from stored schedule items
        const embankmentItems = scheduleItems.map((item: ScheduleItem) => {
          const lengthTag = item.tags?.find((t: string) => t.startsWith('length:'));
          const widthTag = item.tags?.find((t: string) => t.startsWith('width:'));
          const heightTag = item.tags?.find((t: string) => t.startsWith('height:'));
          const countTag = item.tags?.find((t: string) => t.startsWith('count:'));
          const locationTag = item.tags?.find((t: string) => t.startsWith('location:'));
          
          return {
            id: item.id,
            description: item.descriptionOverride || item.dpwhItemNumberRaw,
            length_m: parseFloat(lengthTag?.replace('length:', '') || '0'),
            width_m: parseFloat(widthTag?.replace('width:', '') || '0'),
            height_m: parseFloat(heightTag?.replace('height:', '') || '0'),
            count: parseInt(countTag?.replace('count:', '') || '1'),
            volume_m3: item.qty,
            location: locationTag?.replace('location:', '') || '',
            dpwhItemNumber: item.dpwhItemNumberRaw,
            dpwhUnit: item.unit,
          };
        });
        
        setItems(embankmentItems);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const loadCatalogItems = async () => {
    try {
      const res = await fetch('/api/catalog?limit=5000');
      if (res.ok) {
        const response = await res.json();
        const allResults: CatalogItem[] = response.data || response || [];
        
        // Filter to embankment items (Part C - 800 series)
        const embankmentItems = allResults.filter(item =>
          (item.trade === 'Earthwork' || item.itemNumber.startsWith('8')) &&
          (item.description?.toLowerCase().includes('embankment') ||
           item.description?.toLowerCase().includes('fill') ||
           item.description?.toLowerCase().includes('borrow'))
        );
        
        embankmentItems.sort((a, b) => a.itemNumber.localeCompare(b.itemNumber));
        setCatalogItems(embankmentItems);
      }
    } catch (error) {
      console.error('Error loading catalog:', error);
    }
  };

  const handleCatalogItemSelect = (itemNumber: string) => {
    const item = catalogItems.find(i => i.itemNumber === itemNumber);
    if (item) {
      setFormData({
        ...formData,
        dpwhItemNumber: item.itemNumber,
        dpwhUnit: item.unit,
        description: item.description,
      });
    }
  };

  const calculateVolume = () => {
    const length = parseFloat(formData.length) || 0;
    const width = parseFloat(formData.width) || 0;
    const height = parseFloat(formData.height) || 0;
    const count = parseInt(formData.count) || 1;
    return length * width * height * count;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.dpwhItemNumber || !formData.length || !formData.width || !formData.height) {
      alert('Please fill in DPWH item, length, width, and height');
      return;
    }

    const volume = calculateVolume();

    try {
      const res = await fetch(`/api/projects/${projectId}/schedule-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'earthworks-embankment',
          dpwhItemNumberRaw: formData.dpwhItemNumber,
          descriptionOverride: formData.description,
          unit: formData.dpwhUnit,
          qty: volume,
          basisNote: `${formData.count} × (L=${formData.length}m × W=${formData.width}m × H=${formData.height}m)${formData.location ? ` at ${formData.location}` : ''}`,
          tags: [
            `length:${formData.length}`,
            `width:${formData.width}`,
            `height:${formData.height}`,
            `count:${formData.count}`,
            formData.location ? `location:${formData.location}` : '',
          ].filter(Boolean),
        }),
      });

      if (res.ok) {
        await loadItems();
        resetForm();
        setShowAddForm(false);
      } else {
        let errorMessage = 'Unknown error';
        try {
          const error = await res.json();
          console.error('API Error:', error);
          errorMessage = error.error || JSON.stringify(error);
        } catch (parseError) {
          const textError = await res.text();
          console.error('Response text:', textError);
          errorMessage = textError || `HTTP ${res.status}`;
        }
        alert(`Failed to add item: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Failed to add item: ' + (error instanceof Error ? error.message : 'Network error'));
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Delete this embankment item?')) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/schedule-items/${itemId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await loadItems();
      } else {
        alert('Failed to delete item');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  const resetForm = () => {
    setFormData({
      dpwhItemNumber: '',
      dpwhUnit: '',
      description: '',
      length: '',
      width: '',
      height: '',
      count: '1',
      location: '',
    });
  };

  const getTotalVolume = () => {
    return items.reduce((sum, item) => sum + item.volume_m3, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-amber-900 mb-2">🚧 Embankment</h2>
        <p className="text-sm text-amber-700">
          Embankment construction, compaction, and borrow materials with dimensional input
        </p>
      </div>

      {/* Add Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
        >
          {showAddForm ? 'Cancel' : '+ Add Embankment'}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-amber-200">
          <h4 className="text-lg font-semibold mb-4">Add Embankment</h4>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* DPWH Item Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select DPWH Item *
              </label>
              <select
                value={formData.dpwhItemNumber}
                onChange={(e) => handleCatalogItemSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded bg-white"
                required
              >
                <option value="">-- Select an item --</option>
                {catalogItems.map((item) => (
                  <option key={item.itemNumber} value={item.itemNumber}>
                    {item.itemNumber} - {item.description} ({item.unit})
                  </option>
                ))}
              </select>
            </div>

            {/* Dimensions */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Length (m) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.length}
                  onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Width (m) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.width}
                  onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height (m) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Count *
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={formData.count}
                  onChange={(e) => setFormData({ ...formData, count: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  required
                />
              </div>
            </div>

            {/* Calculated Volume */}
            {formData.length && formData.width && formData.height && (
              <div className="bg-amber-50 border border-amber-200 rounded p-4">
                <div className="text-sm font-semibold text-amber-900">Calculated Volume:</div>
                <div className="text-2xl font-bold text-amber-700 mt-1">
                  {calculateVolume().toFixed(2)} m³
                </div>
                <div className="text-xs text-amber-600 mt-1">
                  {formData.count} × ({formData.length} × {formData.width} × {formData.height}) = {calculateVolume().toFixed(2)} m³
                </div>
              </div>
            )}

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location / Description
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Station 0+000 to 0+100, Right side"
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
              >
                Add Item
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Items Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-2">🚧</div>
            <p>No embankment items added yet</p>
            <p className="text-sm mt-1">Click "Add Embankment" to get started</p>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DPWH Item</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Length (m)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Width (m)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Height (m)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Volume (m³)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.dpwhItemNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.length_m.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.width_m.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.height_m.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{item.count}</td>
                    <td className="px-4 py-3 text-sm font-bold text-amber-700">{item.volume_m3.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.location || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-amber-50">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                    TOTAL VOLUME:
                  </td>
                  <td className="px-4 py-3 text-lg font-bold text-amber-700">
                    {getTotalVolume().toFixed(2)} m³
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </>
        )}
      </div>

      {/* Formula Reference */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">📐 Volume Calculation Formula</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>Embankment volume:</strong></p>
          <p className="font-mono bg-white px-3 py-2 rounded">V = Count × (L × W × H)</p>
          <p className="text-xs mt-2">
            Where: V = Total Volume (m³), Count = Number of identical sections, L = Length (m), W = Width (m), H = Height (m)
          </p>
        </div>
      </div>
    </div>
  );
}
