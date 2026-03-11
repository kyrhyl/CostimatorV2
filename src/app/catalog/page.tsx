'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DPWHCatalogItem, Trade } from '@/types';

interface CatalogResponse {
  success: boolean;
  data: DPWHCatalogItem[];
  total: number;
  catalogVersion: string;
}

export default function CatalogPage() {
  const [items, setItems] = useState<DPWHCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalogVersion, setCatalogVersion] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<Trade | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const parts = [
    { value: 'all', label: 'All Parts' },
    { value: 'PART A', label: 'Part A - General Requirements' },
    { value: 'PART C', label: 'Part C - Earthwork' },
    { value: 'PART D', label: 'Part D - Concrete Works' },
    { value: 'PART E', label: 'Part E - Finishing Works' },
    { value: 'PART F', label: 'Part F - Metal & Electrical Works' },
    { value: 'PART G', label: 'Part G - Marine & Other Works' },
  ];

  const fetchCatalogStats = useCallback(async () => {
    try {
      const response = await fetch('/api/catalog', { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        setCategories(result.data.categories.sort());
      }
    } catch (err) {
      console.error('Failed to fetch catalog stats:', err);
    }
  }, []);

  const fetchCatalog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchQuery) params.set('query', searchQuery);
      if (selectedTrade !== 'all') params.set('trade', selectedTrade);
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      params.set('limit', '5000'); // Request all available items

      const response = await fetch(`/api/catalog?${params.toString()}`);
      const result: CatalogResponse = await response.json();

      if (result.success) {
        setItems(result.data);
        setCatalogVersion(result.catalogVersion);
      } else {
        setError('Failed to load catalog');
      }
    } catch (err) {
      setError('Network error: Failed to fetch catalog');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedTrade, selectedCategory]);

  useEffect(() => {
    fetchCatalogStats();
  }, [fetchCatalogStats]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">DPWH Pay Items</h1>
          <p className="text-gray-600 mt-2">
            {catalogVersion} - Volume III Standard Specifications
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Box */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Item number or description..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Part Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                DPWH Part
              </label>
              <select
                value={selectedTrade}
                onChange={(e) => setSelectedTrade(e.target.value as Trade | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {parts.map((part) => (
                  <option key={part.value} value={part.value}>
                    {part.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600">
            {loading ? 'Loading...' : `${items.length} item${items.length !== 1 ? 's' : ''} found`}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Catalog Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading catalog...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No items found matching your criteria
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Part
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.itemNumber} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {item.itemNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{item.description}</div>
                        {item.notes && (
                          <div className="text-xs text-gray-500 mt-1">{item.notes}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.unit}
                      </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <span className={`px-2 py-1 rounded text-xs font-medium ${getPartColor(item.part || '')}`}>
                           {item.partName}
                         </span>
                       </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {item.category}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> Pay items are organized by Parts (A, C, D, E, F, G) as per DPWH Volume III Standard Specifications.
            This reference is read-only and used for BOQ and cost estimation mapping.
          </p>
        </div>
      </div>
    </div>
  );
}

function getPartColor(part: string): string {
  if (part.includes('PART A')) return 'bg-gray-100 text-gray-800';
  if (part.includes('PART C')) return 'bg-amber-100 text-amber-800';
  if (part.includes('PART D')) return 'bg-green-100 text-green-800';
  if (part.includes('PART E')) return 'bg-purple-100 text-purple-800';
  if (part.includes('PART F')) return 'bg-blue-100 text-blue-800';
  if (part.includes('PART G')) return 'bg-indigo-100 text-indigo-800';
  return 'bg-gray-100 text-gray-800';
}
