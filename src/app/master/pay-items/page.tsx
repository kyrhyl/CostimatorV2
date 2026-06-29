'use client';

import { useEffect, useMemo, useState } from 'react';

interface PayItem {
  _id: string;
  division: string;
  part: string;
  item: string;
  payItemNumber: string;
  description: string;
  unit: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const emptyForm = {
  division: '',
  part: '',
  item: '',
  payItemNumber: '',
  description: '',
  unit: '',
  isActive: true,
};

export default function PayItemsPage() {
  const [payItems, setPayItems] = useState<PayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [partFilter, setPartFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('true');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<PayItem | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchPayItems();
  }, [searchTerm, partFilter, activeFilter]);

  const fetchPayItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (partFilter) params.append('part', partFilter);
      if (activeFilter) params.append('active', activeFilter);

      const response = await fetch(`/api/master/pay-items?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      if (result.success) {
        setPayItems(Array.isArray(result.data) ? result.data : []);
        setError('');
      } else {
        setError(result.error || 'Failed to fetch pay items');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pay items');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const url = editingItem ? `/api/master/pay-items/${editingItem._id}` : '/api/master/pay-items';
      const method = editingItem ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      if (result.success) {
        resetForm();
        setShowForm(false);
        await fetchPayItems();
      } else {
        alert(result.error || 'Failed to save pay item');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save pay item');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (payItem: PayItem) => {
    setEditingItem(payItem);
    setFormData({
      division: payItem.division || '',
      part: payItem.part || '',
      item: payItem.item || '',
      payItemNumber: payItem.payItemNumber || '',
      description: payItem.description || '',
      unit: payItem.unit || '',
      isActive: payItem.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this pay item?')) return;

    try {
      const response = await fetch(`/api/master/pay-items/${id}`, { method: 'DELETE' });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      if (result.success) {
        await fetchPayItems();
      } else {
        alert(result.error || 'Failed to delete pay item');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete pay item');
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData(emptyForm);
  };

  const partOptions = useMemo(
    () => [...new Set(payItems.map((item) => String(item.part || '').trim()).filter(Boolean))].sort(),
    [payItems]
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Pay Items Management</h1>
          <p className="text-gray-600">Create, update, and remove DPWH pay items used in BOQ and cost estimation.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          Add Pay Item
        </button>
      </div>

      <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search code or description..."
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
          <select
            value={partFilter}
            onChange={(e) => setPartFilter(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="">All parts</option>
            {partOptions.map((part) => (
              <option key={part} value={part}>
                {part}
              </option>
            ))}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
            <option value="">All statuses</option>
          </select>
          <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {loading ? 'Loading pay items...' : `${payItems.length} pay item${payItems.length === 1 ? '' : 's'} shown`}
          </div>
        </div>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Part</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Unit</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading pay items...</td>
                </tr>
              ) : payItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No pay items found.</td>
                </tr>
              ) : (
                payItems.map((payItem) => (
                  <tr key={payItem._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 align-top font-semibold text-slate-900">{payItem.payItemNumber}</td>
                    <td className="px-4 py-3 align-top text-sm text-slate-700">
                      <div className="font-medium text-slate-900">{payItem.description}</div>
                      <div className="mt-1 text-xs text-slate-500">{payItem.division || 'No division'}</div>
                    </td>
                    <td className="px-4 py-3 align-top text-sm text-slate-700">{payItem.part || '-'}</td>
                    <td className="px-4 py-3 align-top text-sm text-slate-700">{payItem.unit}</td>
                    <td className="px-4 py-3 align-top">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${payItem.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                        {payItem.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(payItem)}
                          className="rounded-md bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(payItem._id)}
                          className="rounded-md bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{editingItem ? 'Edit Pay Item' : 'Add Pay Item'}</h2>
                <p className="mt-1 text-sm text-slate-500">Maintain the DPWH pay item catalog used across BOQ and costing workflows.</p>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                x
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Pay Item Number</label>
                  <input
                    type="text"
                    required
                    value={formData.payItemNumber}
                    onChange={(e) => setFormData({ ...formData, payItemNumber: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="e.g. 105 (1)a"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Unit</label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="e.g. cu.m."
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="Enter pay item description"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Division</label>
                  <input
                    type="text"
                    value={formData.division}
                    onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="e.g. DIVISION II"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Part</label>
                  <input
                    type="text"
                    required
                    value={formData.part}
                    onChange={(e) => setFormData({ ...formData, part: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="e.g. PART C"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Item</label>
                  <input
                    type="text"
                    value={formData.item}
                    onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="e.g. ITEM 105"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                Active pay item
              </label>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingItem ? 'Update Pay Item' : 'Create Pay Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
