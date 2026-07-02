'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

interface ClassificationRow {
  _id: string;
  part: string;
  category: string;
  subCategory?: string;
  displayLabel: string;
  sortOrder?: number;
  isActive?: boolean;
}

const emptyForm = {
  part: '',
  category: '',
  subCategory: '',
};

export default function PayItemClassificationPage() {
  const [rows, setRows] = useState<ClassificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);

  const fetchRows = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/master/pay-item-classifications');
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load classifications');
      }
      setRows(Array.isArray(result.data) ? result.data : []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load classifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const existingParts = useMemo(
    () => [...new Set(rows.map((row) => String(row.part || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      String(row.part || '').toLowerCase().includes(term)
      || String(row.category || '').toLowerCase().includes(term)
      || String(row.subCategory || '').toLowerCase().includes(term)
      || String(row.displayLabel || '').toLowerCase().includes(term),
    );
  }, [rows, search]);

  const groupedRows = useMemo(() => {
    const map = new Map<string, ClassificationRow[]>();
    filteredRows.forEach((row) => {
      const key = String(row.part || '').trim() || 'UNASSIGNED PART';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredRows]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.part.trim()) {
      setError('Part is required.');
      return;
    }
    if (!form.category.trim() && !form.subCategory.trim()) {
      setError('Enter at least a category or a sub-category.');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/master/pay-item-classifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          part: form.part.trim(),
          category: form.category.trim(),
          subCategory: form.subCategory.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save classification');
      }
      setSuccess('Classification saved. Dropdowns now use this value.');
      setForm(emptyForm);
      await fetchRows();
    } catch (err: any) {
      setError(err.message || 'Failed to save classification');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/master" className="text-sm font-medium text-blue-600 hover:text-blue-800">
              ← Back to Master Data
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">Pay Item Classifications</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-600">
              This is the shared source of truth for `Part`, `Category`, and `Sub-Category`. Pay Items and DUPA Templates now read from this list.
            </p>
          </div>
          <Link
            href="/master/pay-items"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Manage Pay Items
          </Link>
        </div>

        <div className="mb-6 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Add Classification</h2>
            <p className="mt-1 text-sm text-slate-500">
              To add a new `PART`, enter it here together with its first category or sub-category.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Part</label>
                <input
                  list="classification-parts"
                  value={form.part}
                  onChange={(e) => setForm((current) => ({ ...current, part: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="e.g. PART J: FLOOD CONTROL"
                />
                <datalist id="classification-parts">
                  {existingParts.map((part) => (
                    <option key={part} value={part} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                <input
                  value={form.category}
                  onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="e.g. Surface Courses"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Sub-Category</label>
                <input
                  value={form.subCategory}
                  onChange={(e) => setForm((current) => ({ ...current, subCategory: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="e.g. Asphalt Concrete Pavement"
                />
              </div>

              {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
              {success ? <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div> : null}

              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Classification'}
              </button>
            </form>

            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              `PART E` should always have a valid category or sub-category before it is used in Pay Items or BOQ Entry.
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Current Source of Truth</h2>
                <p className="text-sm text-slate-500">{loading ? 'Loading...' : `${filteredRows.length} classification value${filteredRows.length === 1 ? '' : 's'} shown`}</p>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search part, category, or sub-category"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm md:max-w-xs"
              />
            </div>

            <div className="space-y-5">
              {groupedRows.map(([part, partRows]) => (
                <div key={part} className="rounded-lg border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800">
                    {part}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-white">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-slate-500">Category</th>
                          <th className="px-4 py-2 text-left font-medium text-slate-500">Sub-Category</th>
                          <th className="px-4 py-2 text-left font-medium text-slate-500">Label Used by UI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {partRows.map((row) => (
                          <tr key={row._id}>
                            <td className="px-4 py-2 text-slate-800">{row.category || '-'}</td>
                            <td className="px-4 py-2 text-slate-600">{row.subCategory || '-'}</td>
                            <td className="px-4 py-2 font-medium text-slate-900">{row.displayLabel}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {!loading && groupedRows.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
                  No classifications found.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
