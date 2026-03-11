'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface MaterialPrice {
  _id: string;
  materialCode: string;
  materialName: string;
  unit: string;
  unitPrice: number;
  location: string;
  effectiveDate: string;
  source?: string;
  remarks?: string;
  isActive: boolean;
}

export default function MaterialPricesPage() {
  const [prices, setPrices] = useState<MaterialPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchPrices();
  }, [searchTerm, locationFilter, dateFrom, dateTo]);

  const fetchPrices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (locationFilter) params.append('location', locationFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const response = await fetch(`/api/material-prices?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setPrices(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch material prices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material price?')) return;
    
    try {
      const response = await fetch(`/api/material-prices/${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        fetchPrices();
      } else {
        alert('Failed to delete: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete material price');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/material-prices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        fetchPrices();
      } else {
        alert('Failed to update: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to update:', error);
      alert('Failed to update material price');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Material Prices</h1>
          <p className="text-gray-600 mt-1">
            Manage location-specific material prices with effective dates
          </p>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Material
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by code or name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                placeholder="Filter by location..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {loading ? 'Loading...' : `${prices.length} price records`}
            </div>
            <Link
              href="/material-prices/new"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              + Add Price
            </Link>
          </div>
        </div>

        {/* Prices Table */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Material Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Material Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Effective Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      Loading material prices...
                    </td>
                  </tr>
                ) : prices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      <div>
                        <p className="text-lg mb-2">No material prices found</p>
                        <p className="text-sm">
                          {searchTerm || locationFilter || dateFrom || dateTo
                            ? 'Try adjusting your filters'
                            : 'Add your first material price to get started'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  prices.map((price) => (
                    <tr key={price._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {price.materialCode}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {price.materialName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {price.location}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {price.unit}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900 font-medium">
                        ₱{price.unitPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(price.effectiveDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleActive(price._id, price.isActive)}
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            price.isActive
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {price.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex space-x-3">
                          <Link
                            href={`/material-prices/${price._id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => handleDelete(price._id)}
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

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <p className="text-sm text-blue-700">
            <strong>About Material Prices:</strong> Material prices are location-specific and 
            date-effective. When instantiating DUPA templates, the system will select the most 
            recent active price for the given location and date.
          </p>
        </div>
      </div>
    </div>
  );
}
