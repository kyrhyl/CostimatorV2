'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { normalizePart } from '@/lib/utils/dpwh-constants';

interface DUPATemplate {
  _id: string;
  payItemNumber: string;
  payItemDescription: string;
  unitOfMeasurement: string;
  outputPerHour: number;
  part: string;
  category: string;
  laborTemplate: any[];
  equipmentTemplate: any[];
  materialTemplate: any[];
  ocmPercentage: number;
  cpPercentage: number;
  vatPercentage: number;
  isActive: boolean;
  isPinnedCommon?: boolean;
  createdAt: string;
  updatedAt: string;
}

const getUniqueNormalizedValues = (
  values: Array<string | null | undefined>,
  normalizeValue: (value?: string | null) => string = (value) => value?.trim() || '',
) => {
  const seen = new Set<string>();

  return values.reduce<string[]>((result, value) => {
    const normalizedValue = normalizeValue(value);

    if (!normalizedValue) {
      return result;
    }

    const dedupeKey = normalizedValue.toLowerCase();
    if (seen.has(dedupeKey)) {
      return result;
    }

    seen.add(dedupeKey);
    result.push(normalizedValue);
    return result;
  }, []).sort((left, right) => left.localeCompare(right));
};

export default function DUPATemplatesPage() {
  const [mounted, setMounted] = useState(false);
  const [templates, setTemplates] = useState<DUPATemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'common' | 'all'>('common');
  const [hasActivatedShowAll, setHasActivatedShowAll] = useState(false);
  const [sortBy, setSortBy] = useState<'payItemNumber' | 'part'>('payItemNumber');
  const [payItemSortOrder, setPayItemSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [partFilter, setPartFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [favoriteFilter, setFavoriteFilter] = useState<string>('all');
  
  // Parts and categories extracted from data
  const [parts, setParts] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Generate defaults modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generatePart, setGeneratePart] = useState('');
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchTemplates = useCallback(async () => {
    if (viewMode === 'all' && !hasActivatedShowAll && !searchTerm.trim() && !partFilter && !categoryFilter && statusFilter === 'all' && favoriteFilter === 'all') {
      setTemplates([]);
      setTotalCount(0);
      setHasMore(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      const requestedLimit = '5000';

      params.append('view', viewMode);
      params.append('page', String(page));
      params.append('limit', requestedLimit);
      params.append('sortBy', sortBy);
      params.append('order', payItemSortOrder);
      if (searchTerm) params.append('search', searchTerm);
      if (partFilter) params.append('part', partFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      if (statusFilter !== 'all') params.append('isActive', statusFilter);
      if (favoriteFilter !== 'all') params.append('isPinnedCommon', favoriteFilter);

      const response = await fetch(`/api/dupa-templates?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        const nextRows: DUPATemplate[] = data.data || [];
        setTemplates((prev) => (page === 1 ? nextRows : [...prev, ...nextRows]));
        setTotalCount(data.pagination?.total || nextRows.length);
        setHasMore(Boolean(data.pagination?.hasMore));

        // Extract unique parts
        if (page === 1) {
          const uniqueParts = getUniqueNormalizedValues(nextRows.map((t: DUPATemplate) => t.part), (v) => normalizePart(v ?? undefined));
          setParts(uniqueParts);

          // Extract unique categories
          const cats = getUniqueNormalizedValues(nextRows.map((t: DUPATemplate) => t.category));
          setCategories(cats);
        }

      } else {
        setError(data.error || 'Failed to fetch templates');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, partFilter, categoryFilter, statusFilter, favoriteFilter, viewMode, page, hasActivatedShowAll, payItemSortOrder, sortBy]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, partFilter, categoryFilter, statusFilter, favoriteFilter, viewMode, payItemSortOrder, sortBy]);

  const toggleSort = (column: 'payItemNumber' | 'part') => {
    if (sortBy === column) {
      setPayItemSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortBy(column);
    setPayItemSortOrder('asc');
  };

  const refreshFromFirstPage = () => {
    if (page !== 1) {
      setPage(1);
      return;
    }
    fetchTemplates();
  };

  const handleDelete = async (template: DUPATemplate) => {
    if (!confirm(`Are you sure you want to delete template "${template.payItemNumber}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/dupa-templates/${template._id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        refreshFromFirstPage();
      } else {
        alert(data.error || 'Failed to delete template');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete template');
    }
  };

  const toggleActive = async (template: DUPATemplate) => {
    try {
      const response = await fetch(`/api/dupa-templates/${template._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !template.isActive }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        refreshFromFirstPage();
      } else {
        alert(data.error || 'Failed to update template status');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update template status');
    }
  };

  const handleGenerateDefaults = async () => {
    try {
      setGenerating(true);
      setGenerateResult(null);

      const response = await fetch('/api/dupa-templates/generate-defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          part: generatePart || undefined,
          overwriteExisting,
          includeInactive: false,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGenerateResult(data.data);
        refreshFromFirstPage(); // Refresh the list
      } else {
        alert(data.error || 'Failed to generate templates');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to generate templates');
    } finally {
      setGenerating(false);
    }
  };

  const toggleFavorite = async (template: DUPATemplate) => {
    const nextFavoriteState = !template.isPinnedCommon;
    setTemplates((prev) =>
      prev.map((row) => (row._id === template._id ? { ...row, isPinnedCommon: nextFavoriteState } : row))
    );

    try {
      const response = await fetch(`/api/dupa-templates/${template._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinnedCommon: nextFavoriteState }),
      });

      const data = await response.json();

      if (data.success) {
        refreshFromFirstPage();
      } else {
        setTemplates((prev) =>
          prev.map((row) => (row._id === template._id ? { ...row, isPinnedCommon: template.isPinnedCommon } : row))
        );
        alert(data.error || 'Failed to update favorite');
      }
    } catch (err: any) {
      setTemplates((prev) =>
        prev.map((row) => (row._id === template._id ? { ...row, isPinnedCommon: template.isPinnedCommon } : row))
      );
      alert(err.message || 'Failed to update favorite');
    }
  };

  const actionButtonClass = 'inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50';

  if (!mounted) {
    return <div className="min-h-screen bg-gray-50" suppressHydrationWarning={true} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8" suppressHydrationWarning>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">DUPA Templates</h1>
            <p className="text-gray-600 mt-1">
              Manage reusable unit price analysis templates
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dupa-templates/new"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + Create Template
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-gray-200 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setHasActivatedShowAll(false);
                        setViewMode('common');
                      }}
                className={`px-3 py-1.5 text-sm rounded-md ${viewMode === 'common' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                Common Templates
              </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHasActivatedShowAll(true);
                        setViewMode('all');
                      }}
                className={`px-3 py-1.5 text-sm rounded-md ${viewMode === 'all' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                Show All
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Search always checks all active templates.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Pay item, description, part, or category..."
                value={searchTerm}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchTerm(value);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                suppressHydrationWarning
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Part
              </label>
              <select
                value={partFilter}
                onChange={(e) => {
                  setPartFilter(e.target.value);
                  setCategoryFilter(''); // Reset category when part changes
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                suppressHydrationWarning
              >
                <option value="">All Parts</option>
                {parts.map((part) => (
                  <option key={part} value={part}>
                    {part}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                suppressHydrationWarning
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                suppressHydrationWarning
              >
                <option value="all">All Templates</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Favorite
              </label>
              <select
                value={favoriteFilter}
                onChange={(e) => setFavoriteFilter(e.target.value)}
                disabled={viewMode === 'common'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                suppressHydrationWarning
              >
                <option value="all">All</option>
                <option value="true">Favorites Only</option>
                <option value="false">Non-Favorites</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-gray-500">Loading templates...</div>
          </div>
        ) : viewMode === 'all' && !hasActivatedShowAll && !searchTerm.trim() && !partFilter && !categoryFilter && statusFilter === 'all' && favoriteFilter === 'all' ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-gray-700 font-medium">Show All is not loaded by default</div>
            <p className="text-sm text-gray-500 mt-1">Use search or filters, or keep viewing Common Templates for the curated default list.</p>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="mb-4 text-sm text-gray-600">
              Showing {templates.length} of {totalCount} template{totalCount !== 1 ? 's' : ''} ({viewMode === 'common' ? 'common' : 'all'})
            </div>

            {/* Templates Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-36 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        <button
                          type="button"
                          onClick={() => toggleSort('payItemNumber')}
                          className="inline-flex items-center gap-1 text-left hover:text-gray-700"
                          title={`Sort pay items ${sortBy === 'payItemNumber' && payItemSortOrder === 'asc' ? 'descending' : 'ascending'}`}
                        >
                          <span>Pay Item</span>
                          <span className="text-[10px]">{sortBy === 'payItemNumber' ? (payItemSortOrder === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </button>
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Unit
                      </th>
                      <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        <button
                          type="button"
                          onClick={() => toggleSort('part')}
                          className="inline-flex items-center gap-1 text-left hover:text-gray-700"
                          title={`Sort parts ${sortBy === 'part' && payItemSortOrder === 'asc' ? 'descending' : 'ascending'}`}
                        >
                          <span>Part</span>
                          <span className="text-[10px]">{sortBy === 'part' ? (payItemSortOrder === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </button>
                      </th>
                      <th className="w-48 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {templates.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-12 text-center text-gray-500">
                          No templates found. Create your first template to get started.
                        </td>
                      </tr>
                    ) : (
                      templates.map((template) => (
                        <tr key={template._id} className={template.isPinnedCommon ? 'bg-amber-50 hover:bg-amber-100/70' : 'hover:bg-gray-50'}>
                          <td className="px-3 py-3">
                            <div className="font-medium text-gray-900 text-sm">
                              {template.payItemNumber}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <div className="text-sm leading-5 text-gray-900 whitespace-normal break-words">
                              {template.payItemDescription}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-500">
                            {template.unitOfMeasurement}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-500 truncate">
                            {template.part || '-'}
                          </td>
                          <td className="px-3 py-3 text-sm font-medium align-top">
                            <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
                              <Link
                                href={`/dupa-templates/${template._id}`}
                                title="View"
                                aria-label="View template"
                                className={`${actionButtonClass} hover:text-blue-700`}
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </Link>
                              <Link
                                href={`/dupa-templates/${template._id}/edit`}
                                title="Edit"
                                aria-label="Edit template"
                                className={`${actionButtonClass} hover:text-indigo-700`}
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </Link>
                              <button
                                onClick={() => toggleFavorite(template)}
                                title={template.isPinnedCommon ? 'Unfavorite' : 'Favorite'}
                                aria-label={template.isPinnedCommon ? 'Unfavorite template' : 'Favorite template'}
                                className={`${actionButtonClass} ${template.isPinnedCommon ? 'text-amber-700 hover:text-amber-900' : 'hover:text-amber-700'}`}
                              >
                                <svg className="h-4 w-4" fill={template.isPinnedCommon ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.45 4.462a1 1 0 00.95.69h4.69c.969 0 1.371 1.24.588 1.81l-3.794 2.757a1 1 0 00-.364 1.118l1.45 4.462c.3.921-.755 1.688-1.539 1.118l-3.794-2.757a1 1 0 00-1.176 0l-3.794 2.757c-.783.57-1.838-.197-1.539-1.118l1.45-4.462a1 1 0 00-.364-1.118L2.98 9.889c-.783-.57-.38-1.81.588-1.81h4.69a1 1 0 00.95-.69l1.45-4.462z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => toggleActive(template)}
                                title={template.isActive ? 'Set inactive' : 'Set active'}
                                aria-label={template.isActive ? 'Set template inactive' : 'Set template active'}
                                className={`${actionButtonClass} ${template.isActive ? 'text-green-700 hover:text-green-800' : 'text-gray-500 hover:text-gray-700'}`}
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v9m0 0a4 4 0 104 4" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7.5a7 7 0 1010.73 5.88" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(template)}
                                title="Delete"
                                aria-label="Delete template"
                                className={`${actionButtonClass} hover:text-red-700`}
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-7 0h8" />
                                </svg>
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

            {hasMore && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setPage((prev) => prev + 1)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Generate Defaults Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Generate Default DUPA Templates
            </h3>
            
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Default Configuration:</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Labor:</strong></p>
                <ul className="list-disc list-inside ml-4">
                  <li>Foreman: 1 person × 1 hour</li>
                  <li>Skilled Labor: 1 person × 1 hour</li>
                  <li>Unskilled Labor: 2 persons × 1 hour</li>
                </ul>
                <p className="mt-2"><strong>Equipment:</strong> Blank (user will specify)</p>
                <p><strong>Materials:</strong> Blank (user will specify)</p>
                <p className="mt-2"><strong>Add-ons:</strong> OCM 15%, CP 10%, VAT 12%, Minor Tools 10%, Consumables disabled</p>
              </div>
            </div>

            {!generateResult ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Part (Optional)
                  </label>
                  <input
                    type="text"
                    value={generatePart}
                    onChange={(e) => setGeneratePart(e.target.value)}
                    placeholder="e.g., PART D (leave blank for all parts)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave blank to generate templates for all active pay items
                  </p>
                </div>

                <div className="mb-6">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={overwriteExisting}
                      onChange={(e) => setOverwriteExisting(e.target.checked)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">
                      Overwrite existing templates
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 ml-6">
                    If unchecked, existing templates will be skipped
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowGenerateModal(false);
                      setGeneratePart('');
                      setOverwriteExisting(false);
                      setGenerateResult(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    disabled={generating}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateDefaults}
                    disabled={generating}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {generating ? 'Generating...' : 'Generate Templates'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-6 space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-3">Generation Complete!</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Total Pay Items:</p>
                        <p className="text-2xl font-bold text-gray-900">{generateResult.total}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Templates Created:</p>
                        <p className="text-2xl font-bold text-green-600">{generateResult.created}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Templates Updated:</p>
                        <p className="text-2xl font-bold text-blue-600">{generateResult.updated}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Skipped (Existing):</p>
                        <p className="text-2xl font-bold text-gray-600">{generateResult.skipped}</p>
                      </div>
                    </div>
                  </div>

                  {generateResult.errors && generateResult.errors.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-900 mb-2">
                        Errors ({generateResult.errors.length}):
                      </h4>
                      <div className="text-sm text-yellow-800 max-h-40 overflow-y-auto">
                        {generateResult.errors.map((err: string, idx: number) => (
                          <p key={idx} className="mb-1">• {err}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowGenerateModal(false);
                      setGeneratePart('');
                      setOverwriteExisting(false);
                      setGenerateResult(null);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
