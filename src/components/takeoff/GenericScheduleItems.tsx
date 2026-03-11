'use client';

import React, { useState, useEffect } from 'react';
import type { ScheduleItem } from '@/types';

interface GenericScheduleItemsProps {
  projectId: string;
}

interface CatalogItem {
  itemNumber: string;
  description: string;
  unit: string;
  category: string;
  trade: string;
}

// DPWH Part E trades - based on actual catalog data
const PART_E_TRADES = [
  'Plumbing',
  'Carpentry',
  'Hardware',
  'Doors & Windows',
  'Glass & Glazing',
  'Roofing',
  'Waterproofing',
  'Finishes',
  'Painting',
  'Masonry',
  'Railing',
  'Cladding',
  'Other',
];

export default function GenericScheduleItems({ projectId }: GenericScheduleItemsProps) {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItem | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<string>('all');
  
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
      const res = await fetch(`/api/projects/${projectId}/schedule-items?category=other`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.scheduleItems || []);
      }
    } catch (error) {
      console.error('Error loading schedule items:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogItems = async () => {
    setLoadingCatalog(true);
    try {
      // Fetch all items (no query parameter to get all)
      const res = await fetch('/api/catalog?limit=5000');
      if (res.ok) {
        const response = await res.json();
        const allResults: CatalogItem[] = response.data || response || [];
        
        // Filter to Part E trades only
        let partEResults = allResults.filter(item => 
          PART_E_TRADES.some(trade => 
            item.trade?.toLowerCase().includes(trade.toLowerCase()) ||
            item.category?.toLowerCase().includes(trade.toLowerCase())
          )
        );

        // Further filter by selected trade if not "all"
        if (selectedTrade !== 'all') {
          partEResults = partEResults.filter(item =>
            item.trade?.toLowerCase().includes(selectedTrade.toLowerCase()) ||
            item.category?.toLowerCase().includes(selectedTrade.toLowerCase())
          );
        }

        // Sort by item number
        partEResults.sort((a, b) => a.itemNumber.localeCompare(b.itemNumber));

        setCatalogItems(partEResults);
      }
    } catch (error) {
      console.error('Error loading catalog:', error);
    } finally {
      setLoadingCatalog(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [projectId]);

  // Load catalog items when trade filter changes
  useEffect(() => {
    loadCatalogItems();
  }, [selectedTrade]);

  const handleTradeChange = (trade: string) => {
    setSelectedTrade(trade);
    setSelectedCatalogItem(null);
  };

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
          category: 'other',
          dpwhItemNumberRaw: formData.dpwhItemNumber,
          descriptionOverride: formData.description,
          unit: formData.unit,
          qty: parseFloat(formData.quantity),
          basisNote: formData.remarks || 'As per schedule',
          tags: formData.location ? [`location:${formData.location}`] : [],
        }),
      });

      if (res.ok) {
        await loadItems();
        resetForm();
        setShowAddForm(false);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to add item');
      }
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Failed to add item');
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Delete this schedule item?')) return;

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
          <h2 className="text-2xl font-bold text-gray-900">Other Finishing Items</h2>
          <p className="text-sm text-gray-600 mt-1">
            Add any DPWH Part E finishing items (painting, tiling, flooring, ceiling, etc.)
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {showAddForm ? 'Cancel' : '+ Add Item'}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-4">Add Finishing Item</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Trade Filter Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Trade/Category
              </label>
              <select
                value={selectedTrade}
                onChange={(e) => handleTradeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded bg-white"
              >
                <option value="all">All Finishing Works</option>
                {PART_E_TRADES.map((trade) => (
                  <option key={trade} value={trade.toLowerCase()}>
                    {trade}
                  </option>
                ))}
              </select>
            </div>

            {/* Catalog Item Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select DPWH Item *
                {selectedTrade !== 'all' && (
                  <span className="ml-2 text-xs text-blue-600">
                    (Showing: {PART_E_TRADES.find(t => t.toLowerCase() === selectedTrade)})
                  </span>
                )}
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
                  No items found for selected trade
                </div>
              )}
            </div>

            {/* Selected Item Display */}
            {selectedCatalogItem && (
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <div className="text-sm font-semibold text-blue-900">Selected Item:</div>
                <div className="text-sm text-blue-800 mt-1">
                  {selectedCatalogItem.itemNumber} - {selectedCatalogItem.description}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Unit: {selectedCatalogItem.unit} | Trade: {selectedCatalogItem.trade}
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
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., 1st Floor, Lobby"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Additional notes or specifications..."
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
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
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
            <div className="text-4xl mb-2">📦</div>
            <p>No finishing items added yet</p>
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
                    {item.location || '-'}
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
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-semibold text-gray-700">Summary</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{items.length} Items</div>
        </div>
      )}
    </div>
  );
}
