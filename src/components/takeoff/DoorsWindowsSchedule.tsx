'use client';

/**
 * Doors & Windows Schedule Component
 * Enhanced schedule management with dimensions and auto-calculation
 */

import { useState, useEffect } from 'react';

interface ScheduleItem {
  id: string;
  category: string;
  dpwhItemNumberRaw: string;
  descriptionOverride?: string;
  unit: string;
  qty: number;
  basisNote: string;
  tags: string[];
  mark?: string;
  width_m?: number;
  height_m?: number;
  quantity?: number;
  location?: string;
}

interface CatalogItem {
  itemNumber: string;
  description: string;
  unit: string;
  category: string;
  trade: string;
}

interface DoorsWindowsScheduleProps {
  projectId: string;
  category: 'doors' | 'windows';
}

const COMMON_DOOR_TYPES = [
  { itemNumber: '1006 (1)', description: 'Hollow Steel Door', unit: 'Square Meter' },
  { itemNumber: '1006 (2)', description: 'Flush Door', unit: 'Square Meter' },
  { itemNumber: '1007 (1) a', description: 'Aluminum Framed Glass Door Sliding Type', unit: 'Square Meter' },
  { itemNumber: '1007 (1) b', description: 'Aluminum Framed Glass Door Swing Type', unit: 'Square Meter' },
  { itemNumber: '1010 (2) a', description: 'Doors Flush', unit: 'Square Meter' },
  { itemNumber: '1010 (2) b', description: 'Doors Wood Panel', unit: 'Square Meter' },
];

const COMMON_WINDOW_TYPES = [
  { itemNumber: '1005 (1)', description: 'Residential Casement', unit: 'Square Meter' },
  { itemNumber: '1008 (1) a', description: 'Aluminum Glass Windows Sliding Type', unit: 'Square Meter' },
  { itemNumber: '1008 (1) b', description: 'Aluminum Glass Windows Casement Type', unit: 'Square Meter' },
  { itemNumber: '1008 (1) c', description: 'Aluminum Glass Windows Awning Type', unit: 'Square Meter' },
  { itemNumber: '1008 (1) d', description: 'Aluminum Glass Windows Fixed Type', unit: 'Square Meter' },
  { itemNumber: '1009 (1) a', description: 'Jalousie Windows Glass', unit: 'Square Meter' },
];

export default function DoorsWindowsSchedule({ projectId, category }: DoorsWindowsScheduleProps) {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogResults, setCatalogResults] = useState<CatalogItem[]>([]);
  const [showCatalogSearch, setShowCatalogSearch] = useState(false);

  const [form, setForm] = useState({
    mark: '',
    dpwhItemNumberRaw: '',
    descriptionOverride: '',
    unit: 'Square Meter',
    width_m: 0,
    height_m: 0,
    quantity: 1,
    location: '',
    basisNote: '',
  });

  const commonTypes = category === 'doors' ? COMMON_DOOR_TYPES : COMMON_WINDOW_TYPES;
  const prefix = category === 'doors' ? 'D' : 'W';

  useEffect(() => {
    fetchItems();
  }, [projectId, category]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/schedule-items?category=${category}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.scheduleItems || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const searchCatalog = async (query: string) => {
    if (!query || query.length < 2) {
      setCatalogResults([]);
      return;
    }
    const res = await fetch(`/api/catalog?query=${encodeURIComponent(query)}&limit=20`);
    if (res.ok) {
      const data = await res.json();
      // Filter for doors & windows trade
      const filtered = (data.results || []).filter((item: CatalogItem) => 
        item.trade === 'Doors & Windows'
      );
      setCatalogResults(filtered);
    }
  };

  const selectFromCatalog = (item: CatalogItem) => {
    setForm(prev => ({
      ...prev,
      dpwhItemNumberRaw: item.itemNumber,
      descriptionOverride: item.description,
      unit: item.unit,
    }));
    setShowCatalogSearch(false);
    setCatalogResults([]);
    setSearchQuery('');
  };

  const selectCommonType = (item: typeof COMMON_DOOR_TYPES[0]) => {
    setForm(prev => ({
      ...prev,
      dpwhItemNumberRaw: item.itemNumber,
      descriptionOverride: item.description,
      unit: item.unit,
    }));
  };

  const calculateArea = (width: number, height: number, qty: number): number => {
    return width * height * qty;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.dpwhItemNumberRaw || !form.mark) {
      alert('Please fill in required fields (Mark and Type)');
      return;
    }

    // Auto-calculate qty based on dimensions if provided
    const calculatedQty = form.width_m > 0 && form.height_m > 0
      ? calculateArea(form.width_m, form.height_m, form.quantity)
      : 0;

    if (calculatedQty === 0) {
      alert('Please enter valid width and height');
      return;
    }

    const payload = {
      category,
      dpwhItemNumberRaw: form.dpwhItemNumberRaw,
      descriptionOverride: form.descriptionOverride,
      unit: form.unit,
      qty: calculatedQty,
      mark: form.mark,
      width_m: form.width_m,
      height_m: form.height_m,
      quantity: form.quantity,
      location: form.location,
      basisNote: form.basisNote || `${form.mark}: ${form.width_m}m × ${form.height_m}m × ${form.quantity} pcs`,
      tags: [`mark:${form.mark}`],
    };

    try {
      const url = editingId
        ? `/api/projects/${projectId}/schedule-items/${editingId}`
        : `/api/projects/${projectId}/schedule-items`;
      
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchItems();
        resetForm();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error || 'Failed to save'}`);
      }
    } catch (err) {
      alert('Failed to save item');
    }
  };

  const resetForm = () => {
    setForm({
      mark: '',
      dpwhItemNumberRaw: '',
      descriptionOverride: '',
      unit: 'Square Meter',
      width_m: 0,
      height_m: 0,
      quantity: 1,
      location: '',
      basisNote: '',
    });
    setEditingId(null);
  };

  const handleEdit = (item: ScheduleItem) => {
    setForm({
      mark: item.mark || '',
      dpwhItemNumberRaw: item.dpwhItemNumberRaw,
      descriptionOverride: item.descriptionOverride || '',
      unit: item.unit,
      width_m: item.width_m || 0,
      height_m: item.height_m || 0,
      quantity: item.quantity || 1,
      location: item.location || '',
      basisNote: item.basisNote,
    });
    setEditingId(item.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    
    const res = await fetch(`/api/projects/${projectId}/schedule-items/${id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      fetchItems();
    }
  };

  const totalArea = items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {category === 'doors' ? 'Doors' : 'Windows'} Schedule
        </h2>
        <p className="text-gray-600">
          Manage {category} with automatic area calculation from dimensions
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">
          {editingId ? 'Edit' : 'Add'} {category === 'doors' ? 'Door' : 'Window'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mark and Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mark <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder={`${prefix}1, ${prefix}2, etc.`}
                value={form.mark}
                onChange={e => setForm({ ...form, mark: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                placeholder="e.g., Main Entrance, Bedroom 1"
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Common Types Quick Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Select Common Types
            </label>
            <div className="flex flex-wrap gap-2">
              {commonTypes.map((type) => (
                <button
                  key={type.itemNumber}
                  type="button"
                  onClick={() => selectCommonType(type)}
                  className={`px-3 py-1 text-sm rounded-lg border ${
                    form.dpwhItemNumberRaw === type.itemNumber
                      ? 'bg-blue-500 text-white border-blue-600'
                      : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {type.itemNumber}: {type.description}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowCatalogSearch(!showCatalogSearch)}
                className="px-3 py-1 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              >
                Search Catalog...
              </button>
            </div>
          </div>

          {/* Catalog Search */}
          {showCatalogSearch && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <input
                type="text"
                placeholder="Search DPWH catalog..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  searchCatalog(e.target.value);
                }}
                className="w-full px-3 py-2 border rounded-lg mb-2"
              />
              {catalogResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {catalogResults.map((item) => (
                    <button
                      key={item.itemNumber}
                      type="button"
                      onClick={() => selectFromCatalog(item)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded text-sm"
                    >
                      <span className="font-mono text-blue-600">{item.itemNumber}</span>
                      {' - '}
                      <span>{item.description}</span>
                      {' '}
                      <span className="text-gray-500">({item.unit})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected Type Display */}
          {form.dpwhItemNumberRaw && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm">
                <span className="font-semibold">Selected:</span>{' '}
                <span className="font-mono text-blue-600">{form.dpwhItemNumberRaw}</span>
                {' - '}
                {form.descriptionOverride}
              </p>
            </div>
          )}

          {/* Dimensions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Width (m) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.width_m || ''}
                onChange={e => setForm({ ...form, width_m: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Height (m) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.height_m || ''}
                onChange={e => setForm({ ...form, height_m: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={form.quantity || ''}
                onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Calculated Area Display */}
          {form.width_m > 0 && form.height_m > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm">
                <span className="font-semibold">Calculated Area:</span>{' '}
                {form.width_m.toFixed(2)}m × {form.height_m.toFixed(2)}m × {form.quantity} = 
                <span className="text-lg font-bold text-green-700 ml-2">
                  {calculateArea(form.width_m, form.height_m, form.quantity).toFixed(3)} m²
                </span>
              </p>
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks
            </label>
            <input
              type="text"
              placeholder="Optional notes"
              value={form.basisNote}
              onChange={e => setForm({ ...form, basisNote: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
            >
              {editingId ? 'Update' : 'Add'} {category === 'doors' ? 'Door' : 'Window'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Schedule Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">
            {category === 'doors' ? 'Doors' : 'Windows'} Schedule
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Total Area: <span className="font-bold text-blue-600">{totalArea.toFixed(3)} m²</span>
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No {category} added yet. Add your first {category === 'doors' ? 'door' : 'window'} above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Mark</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Location</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Width</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Height</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Area (m²)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Item No.</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{item.mark}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.descriptionOverride || item.dpwhItemNumberRaw}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.location || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">
                      {item.width_m?.toFixed(2) || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">
                      {item.height_m?.toFixed(2) || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-700">
                      {item.quantity || 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-blue-600">
                      {item.qty.toFixed(3)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">
                      {item.dpwhItemNumberRaw}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 hover:text-blue-800 font-medium mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
