'use client';

import React, { useState, useEffect } from 'react';
import type { ScheduleItem } from '@/types';

interface EarthworkItemsProps {
  projectId: string;
  category: string;
  title: string;
  description: string;
  filterKeywords: string[];
}

interface CatalogItem {
  itemNumber: string;
  description: string;
  unit: string;
  category: string;
  trade: string;
}

export default function EarthworkItems({ projectId, category, title, description, filterKeywords }: EarthworkItemsProps) {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItem | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    dpwhItemNumber: '',
    description: '',
    unit: '',
    quantity: '',
    location: '',
    remarks: '',
  });

  const loadItems = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/schedule-items?category=earthworks-${category}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.scheduleItems || []);
      }
    } catch (error) {
      console.error('Error loading earthworks items:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogItems = async () => {
    setLoadingCatalog(true);
    try {
      const res = await fetch('/api/catalog?limit=5000');
      if (res.ok) {
        const response = await res.json();
        const allResults: CatalogItem[] = response.data || response || [];
        
        // Filter to Earthwork trade only (Part C - 800 series)
        let earthworkResults = allResults.filter(item => 
          item.trade === 'Earthwork' || item.itemNumber.startsWith('8')
        );

        // Further filter by keywords for this category
        if (filterKeywords.length > 0) {
          earthworkResults = earthworkResults.filter(item =>
            filterKeywords.some(keyword =>
              item.description?.toLowerCase().includes(keyword.toLowerCase()) ||
              item.category?.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        }

        // Sort by item number
        earthworkResults.sort((a, b) => a.itemNumber.localeCompare(b.itemNumber));

        setCatalogItems(earthworkResults);
      }
    } catch (error) {
      console.error('Error loading catalog:', error);
    } finally {
      setLoadingCatalog(false);
    }
  };

  useEffect(() => {
    loadItems();
    loadCatalogItems();
  }, [projectId, category]);

  const handleCatalogItemSelect = (itemNumber: string) => {
    const item = catalogItems.find(i => i.itemNumber === itemNumber);
    if (item) {
      setSelectedCatalogItem(item);
      setFormData({
        ...formData,
        dpwhItemNumber: item.itemNumber,
        description: item.description,
        unit: item.unit,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.dpwhItemNumber || !formData.quantity) {
      alert('Please select a DPWH item and enter quantity');
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/schedule-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: `earthworks-${category}`,
          dpwhItemNumberRaw: formData.dpwhItemNumber,
          descriptionOverride: formData.description,
          unit: formData.unit,
          qty: parseFloat(formData.quantity),
          basisNote: formData.remarks || 'As per earthworks estimate',
          tags: formData.location ? [`location:${formData.location}`] : [],
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
    if (!confirm('Delete this item?')) return;

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
      description: '',
      unit: '',
      quantity: '',
      location: '',
      remarks: '',
    });
    setSelectedCatalogItem(null);
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
        >
          {showAddForm ? 'Cancel' : '+ Add Item'}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-amber-200">
          <h4 className="text-lg font-semibold mb-4">Add {title} Item</h4>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Catalog Item Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select DPWH Item *
              </label>
              {loadingCatalog ? (
                <div className="text-sm text-gray-500 py-2">Loading items...</div>
              ) : (
                <select
                  value={selectedCatalogItem?.itemNumber || ''}
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
              )}
              {catalogItems.length === 0 && !loadingCatalog && (
                <div className="mt-2 text-sm text-gray-500">
                  No items found for this category
                </div>
              )}
            </div>

            {/* Selected Item Display */}
            {selectedCatalogItem && (
              <div className="bg-amber-50 border border-amber-200 rounded p-4">
                <div className="text-sm font-semibold text-amber-900">Selected Item:</div>
                <div className="text-sm text-amber-800 mt-1">
                  {selectedCatalogItem.itemNumber} - {selectedCatalogItem.description}
                </div>
                <div className="text-xs text-amber-600 mt-1">
                  Unit: {selectedCatalogItem.unit}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  required
                />
                {selectedCatalogItem && (
                  <div className="text-xs text-gray-500 mt-1">Unit: {selectedCatalogItem.unit}</div>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location/Station
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Sta. 0+000 to 0+100"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks/Notes
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Additional notes, specifications, or basis of estimate..."
                rows={2}
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
                disabled={!selectedCatalogItem || !formData.quantity}
                className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
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
            <div className="text-4xl mb-2">📋</div>
            <p>No items added yet</p>
            <p className="text-sm mt-1">Click "Add Item" to get started</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  DPWH Item
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Quantity
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Unit
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {item.dpwhItemNumberRaw}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {item.descriptionOverride || item.dpwhItemNumberRaw}
                    {item.basisNote && (
                      <div className="text-xs text-gray-500 mt-1">{item.basisNote}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                    {item.qty?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {item.unit}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {item.tags?.find(t => t.startsWith('location:'))?.replace('location:', '') || '-'}
                  </td>
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
          </table>
        )}
      </div>

      {/* Summary */}
      {items.length > 0 && (
        <div className="bg-amber-50 rounded-lg p-4">
          <div className="text-sm font-semibold text-amber-700">Summary</div>
          <div className="text-2xl font-bold text-amber-900 mt-1">{items.length} Items</div>
        </div>
      )}
    </div>
  );
}
