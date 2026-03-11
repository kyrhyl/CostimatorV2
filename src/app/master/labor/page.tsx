'use client';

import { useState, useEffect } from 'react';

interface LaborRate {
  _id: string;
  location: string;
  district: string;
  foreman: number;
  leadman: number;
  equipmentOperatorHeavy: number;
  equipmentOperatorHighSkilled: number;
  equipmentOperatorLightSkilled: number;
  driver: number;
  laborSkilled: number;
  laborSemiSkilled: number;
  laborUnskilled: number;
  effectiveDate?: string;
  createdAt: string;
  updatedAt: string;
}

export default function LaborRatesPage() {
  const [laborRates, setLaborRates] = useState<LaborRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRate, setEditingRate] = useState<LaborRate | null>(null);
  const [formData, setFormData] = useState({
    location: '',
    district: 'Bukidnon 1st',
    foreman: 0,
    leadman: 0,
    equipmentOperatorHeavy: 0,
    equipmentOperatorHighSkilled: 0,
    equipmentOperatorLightSkilled: 0,
    driver: 0,
    laborSkilled: 0,
    laborSemiSkilled: 0,
    laborUnskilled: 0,
  });

  useEffect(() => {
    fetchLaborRates();
  }, [searchTerm, locationFilter]);

  const fetchLaborRates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (locationFilter) params.append('location', locationFilter);
      
      const response = await fetch(`/api/master/labor?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setLaborRates(result.data);
        setError('');
      } else {
        setError(result.error || 'Failed to fetch labor rates');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch labor rates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingRate 
        ? `/api/master/labor/${editingRate._id}`
        : '/api/master/labor';
      
      const method = editingRate ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setShowForm(false);
        setEditingRate(null);
        resetForm();
        fetchLaborRates();
      } else {
        alert(result.error || 'Failed to save labor rate');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save labor rate');
    }
  };

  const handleEdit = (rate: LaborRate) => {
    setEditingRate(rate);
    setFormData({
      location: rate.location,
      district: rate.district,
      foreman: rate.foreman,
      leadman: rate.leadman,
      equipmentOperatorHeavy: rate.equipmentOperatorHeavy,
      equipmentOperatorHighSkilled: rate.equipmentOperatorHighSkilled,
      equipmentOperatorLightSkilled: rate.equipmentOperatorLightSkilled,
      driver: rate.driver,
      laborSkilled: rate.laborSkilled,
      laborSemiSkilled: rate.laborSemiSkilled,
      laborUnskilled: rate.laborUnskilled,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this labor rate?')) return;
    
    try {
      const response = await fetch(`/api/master/labor/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        fetchLaborRates();
      } else {
        alert(result.error || 'Failed to delete labor rate');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete labor rate');
    }
  };

  const resetForm = () => {
    setFormData({
      location: '',
      district: 'Bukidnon 1st',
      foreman: 0,
      leadman: 0,
      equipmentOperatorHeavy: 0,
      equipmentOperatorHighSkilled: 0,
      equipmentOperatorLightSkilled: 0,
      driver: 0,
      laborSkilled: 0,
      laborSemiSkilled: 0,
      laborUnskilled: 0,
    });
  };

  const locations = [...new Set(laborRates.map(r => r.location))].sort();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Labor Rates Management</h1>
        <p className="text-gray-600">Manage hourly labor rates by location and district</p>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by location or district..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Location
            </label>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Locations</option>
              {locations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setEditingRate(null);
                resetForm();
                setShowForm(true);
              }}
              className="w-full bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              + Add New Labor Rate
            </button>
          </div>
        </div>
        
        <div className="text-sm text-gray-500">
          Total: {laborRates.length} labor rate{laborRates.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {editingRate ? 'Edit Labor Rate' : 'Add New Labor Rate'}
              </h2>
              
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Manila, Cebu, Davao"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      District *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <h3 className="text-lg font-semibold mb-4 text-gray-700">Hourly Rates (₱)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Foreman
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.foreman}
                      onChange={(e) => setFormData({ ...formData, foreman: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Leadman
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.leadman}
                      onChange={(e) => setFormData({ ...formData, leadman: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Equipment Operator (Heavy)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.equipmentOperatorHeavy}
                      onChange={(e) => setFormData({ ...formData, equipmentOperatorHeavy: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Equipment Operator (High Skilled)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.equipmentOperatorHighSkilled}
                      onChange={(e) => setFormData({ ...formData, equipmentOperatorHighSkilled: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Equipment Operator (Light Skilled)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.equipmentOperatorLightSkilled}
                      onChange={(e) => setFormData({ ...formData, equipmentOperatorLightSkilled: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Driver
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.driver}
                      onChange={(e) => setFormData({ ...formData, driver: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Labor (Skilled)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.laborSkilled}
                      onChange={(e) => setFormData({ ...formData, laborSkilled: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Labor (Semi-Skilled)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.laborSemiSkilled}
                      onChange={(e) => setFormData({ ...formData, laborSemiSkilled: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Labor (Unskilled)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.laborUnskilled}
                      onChange={(e) => setFormData({ ...formData, laborUnskilled: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingRate(null);
                      resetForm();
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    {editingRate ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading labor rates...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : laborRates.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No labor rates found. Click "Add New Labor Rate" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    District
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Foreman
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leadman
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Skilled Labor
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Semi-Skilled
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unskilled
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {laborRates.map((rate) => (
                  <tr key={rate._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{rate.location}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rate.district}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      ₱{rate.foreman.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      ₱{rate.leadman.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      ₱{rate.laborSkilled.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      ₱{rate.laborSemiSkilled.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      ₱{rate.laborUnskilled.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button
                        onClick={() => handleEdit(rate)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(rate._id)}
                        className="text-red-600 hover:text-red-900"
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
