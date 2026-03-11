'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

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

export default function DUPATemplatesPage() {
  const [templates, setTemplates] = useState<DUPATemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'common' | 'all'>('common');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [hasRequestedLoad, setHasRequestedLoad] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [partFilter, setPartFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [favoriteFilter, setFavoriteFilter] = useState<string>('all');
  
  // Parts and categories extracted from data
  const [parts, setParts] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Instantiate modal
  const [showInstantiateModal, setShowInstantiateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DUPATemplate | null>(null);
  const [instantiateLocation, setInstantiateLocation] = useState('');
  const [useEvaluated, setUseEvaluated] = useState(false);
  const [instantiating, setInstantiating] = useState(false);

  // Generate defaults modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generatePart, setGeneratePart] = useState('');
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<any>(null);

  const fetchTemplates = useCallback(async () => {
    if (!hasRequestedLoad && !searchTerm.trim()) {
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
      const requestedLimit = viewMode === 'all' ? '5000' : '50';

      params.append('view', viewMode);
      params.append('page', String(page));
      params.append('limit', requestedLimit);
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
          const uniqueParts = [...new Set(nextRows.map((t: DUPATemplate) => t.part).filter(Boolean))];
          setParts(uniqueParts as string[]);

          // Extract unique categories
          const cats = [...new Set(nextRows.map((t: DUPATemplate) => t.category).filter(Boolean))];
          setCategories(cats as string[]);
        }

      } else {
        setError(data.error || 'Failed to fetch templates');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, partFilter, categoryFilter, statusFilter, favoriteFilter, viewMode, page, hasRequestedLoad]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, partFilter, categoryFilter, statusFilter, favoriteFilter, viewMode]);

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

  const openInstantiateModal = (template: DUPATemplate) => {
    setSelectedTemplate(template);
    setInstantiateLocation('');
    setUseEvaluated(false);
    setShowInstantiateModal(true);
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

  const handleInstantiate = async () => {
    if (!selectedTemplate || !instantiateLocation.trim()) {
      alert('Please enter a location');
      return;
    }

    try {
      setInstantiating(true);
      const response = await fetch(`/api/dupa-templates/${selectedTemplate._id}/instantiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: instantiateLocation,
          useEvaluated,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Template instantiated successfully!\nRate Item ID: ${data.data._id}`);
        setShowInstantiateModal(false);
      } else {
        alert(data.error || 'Failed to instantiate template');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to instantiate template');
    } finally {
      setInstantiating(false);
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
                  setHasRequestedLoad(true);
                  setViewMode('common');
                }}
                className={`px-3 py-1.5 text-sm rounded-md ${viewMode === 'common' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                Common Templates
              </button>
              <button
                type="button"
                onClick={() => {
                  setHasRequestedLoad(true);
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
                placeholder="Pay item number or description..."
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
                {parts.sort().map((part) => (
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
                {categories.sort().map((cat) => (
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
        ) : !hasRequestedLoad && !searchTerm.trim() ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-gray-700 font-medium">No templates loaded by default</div>
            <p className="text-sm text-gray-500 mt-1">Use search, or click Common Templates / Show All to load records.</p>
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
                      <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Pay Item
                      </th>
                      <th className="w-64 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Unit
                      </th>
                      <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Part
                      </th>
                      <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Category
                      </th>
                      <th className="w-28 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Entries
                      </th>
                      <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Favorite
                      </th>
                      <th className="w-64 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {templates.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-3 py-12 text-center text-gray-500">
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
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-sm text-gray-900 truncate">
                              {template.payItemDescription}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-500">
                            {template.unitOfMeasurement}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-500 truncate">
                            {template.part || '-'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-500 truncate">
                            {template.category || '-'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-500 whitespace-nowrap">
                            L: {template.laborTemplate.length} | 
                            E: {template.equipmentTemplate.length} | 
                            M: {template.materialTemplate.length}
                          </td>
                          <td className="px-3 py-3">
                            <button
                              onClick={() => toggleActive(template)}
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                template.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {template.isActive ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="px-3 py-3">
                            {template.isPinnedCommon ? (
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                                ★ Favorite
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-sm font-medium">
                            <div className="flex flex-wrap gap-2">
                              <Link
                                href={`/dupa-templates/${template._id}`}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                View
                              </Link>
                              <Link
                                href={`/dupa-templates/${template._id}/edit`}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                Edit
                              </Link>
                              <button
                                onClick={() => openInstantiateModal(template)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Instantiate
                              </button>
                              <button
                                onClick={() => toggleFavorite(template)}
                                className={template.isPinnedCommon ? 'text-amber-700 hover:text-amber-900' : 'text-amber-600 hover:text-amber-800'}
                              >
                                {template.isPinnedCommon ? '★ Unfavorite' : '☆ Favorite'}
                              </button>
                              <button
                                onClick={() => handleDelete(template)}
                                className="text-red-600 hover:text-red-900"
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

      {/* Instantiate Modal */}
      {showInstantiateModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Instantiate Template
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Template: <strong>{selectedTemplate.payItemNumber}</strong>
              </p>
              <p className="text-sm text-gray-600">
                {selectedTemplate.payItemDescription}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={instantiateLocation}
                onChange={(e) => setInstantiateLocation(e.target.value)}
                placeholder="e.g., Malaybalay City, Bukidnon"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Must match a location in Labor Rates database
              </p>
            </div>

            <div className="mb-6">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={useEvaluated}
                  onChange={(e) => setUseEvaluated(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Use Evaluated (instead of Submitted)
                </span>
              </label>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowInstantiateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={instantiating}
              >
                Cancel
              </button>
              <button
                onClick={handleInstantiate}
                disabled={instantiating || !instantiateLocation.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {instantiating ? 'Creating...' : 'Instantiate'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                <p className="mt-2"><strong>Add-ons:</strong> OCM 15%, CP 10%, VAT 12%, Minor Tools 10%</p>
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
