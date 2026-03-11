'use client';

import { useState, useEffect } from 'react';

interface Equipment {
  _id: string;
  no: number;
  completeDescription: string;
  description: string;
  equipmentModel?: string;
  capacity?: string;
  flywheelHorsepower?: number;
  rentalRate: number;
  hourlyRate: number;
  createdAt: string;
  updatedAt: string;
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [minRate, setMinRate] = useState('');
  const [maxRate, setMaxRate] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [csvData, setCsvData] = useState('');
  const [csvOptions, setCsvOptions] = useState({
    clearExisting: false,
    skipDuplicates: true,
  });
  const [formData, setFormData] = useState({
    no: 0,
    completeDescription: '',
    description: '',
    equipmentModel: '',
    capacity: '',
    flywheelHorsepower: 0,
    rentalRate: 0,
    hourlyRate: 0,
  });

  useEffect(() => {
    fetchEquipment();
  }, [searchTerm, minRate, maxRate]);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (minRate) params.append('minRate', minRate);
      if (maxRate) params.append('maxRate', maxRate);
      
      const response = await fetch(`/api/master/equipment?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setEquipment(result.data);
        setError('');
      } else {
        setError(result.error || 'Failed to fetch equipment');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingEquipment 
        ? `/api/master/equipment/${editingEquipment._id}`
        : '/api/master/equipment';
      
      const method = editingEquipment ? 'PATCH' : 'POST';
      
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
        setEditingEquipment(null);
        resetForm();
        fetchEquipment();
      } else {
        alert(result.error || 'Failed to save equipment');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save equipment');
    }
  };

  const handleCsvImport = async () => {
    if (!csvData.trim()) {
      alert('Please paste CSV data');
      return;
    }

    try {
      const response = await fetch('/api/master/equipment/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvData: csvData.trim(),
          ...csvOptions,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        alert(result.message);
        setShowCsvImport(false);
        setCsvData('');
        fetchEquipment();
      } else {
        alert(result.error || 'Failed to import CSV');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to import CSV');
    }
  };

  const handleEdit = (eq: Equipment) => {
    setEditingEquipment(eq);
    setFormData({
      no: eq.no,
      completeDescription: eq.completeDescription,
      description: eq.description,
      equipmentModel: eq.equipmentModel || '',
      capacity: eq.capacity || '',
      flywheelHorsepower: eq.flywheelHorsepower || 0,
      rentalRate: eq.rentalRate,
      hourlyRate: eq.hourlyRate,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this equipment?')) return;
    
    try {
      const response = await fetch(`/api/master/equipment/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        fetchEquipment();
      } else {
        alert(result.error || 'Failed to delete equipment');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete equipment');
    }
  };

  const resetForm = () => {
    setFormData({
      no: 0,
      completeDescription: '',
      description: '',
      equipmentModel: '',
      capacity: '',
      flywheelHorsepower: 0,
      rentalRate: 0,
      hourlyRate: 0,
    });
  };

  const sampleCsv = `No,Complete Description,Description,Equipment Model,Capacity,Flywheel Horsepower,Rental Rate,Hourly Rate
1,Motor Grader complete with Scarifier,Motor Grader,CAT 120G,93 kW (125 hp),125,5000,625
2,Hydraulic Excavator with Bucket,Hydraulic Excavator,CAT 320D,90 kW (121 hp),121,4500,562.50`;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Equipment Rates Management</h1>
        <p className="text-gray-600">Manage equipment rates and specifications</p>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Equipment
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search description..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Min Hourly Rate
            </label>
            <input
              type="number"
              step="0.01"
              value={minRate}
              onChange={(e) => setMinRate(e.target.value)}
              placeholder="₱0.00"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Hourly Rate
            </label>
            <input
              type="number"
              step="0.01"
              value={maxRate}
              onChange={(e) => setMaxRate(e.target.value)}
              placeholder="₱9999.99"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-end gap-2">
            <button
              onClick={() => setShowCsvImport(true)}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
            >
              Import CSV
            </button>
            <button
              onClick={() => {
                setEditingEquipment(null);
                resetForm();
                setShowForm(true);
              }}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              + Add New
            </button>
          </div>
        </div>
        
        <div className="text-sm text-gray-500">
          Total: {equipment.length} equipment item{equipment.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* CSV Import Modal */}
      {showCsvImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Import Equipment from CSV</h2>
              
              <div className="mb-4">
                <h3 className="font-semibold mb-2">CSV Format:</h3>
                <div className="bg-gray-100 p-3 rounded text-xs font-mono overflow-x-auto">
                  {sampleCsv}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  First row must be headers. Supported headers: No/#/Number, Complete Description, Description, 
                  Equipment Model/Model, Capacity, Flywheel Horsepower/HP, Rental Rate, Hourly Rate/Rate
                </p>
              </div>

              <div className="mb-4 space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={csvOptions.clearExisting}
                    onChange={(e) => setCsvOptions({ ...csvOptions, clearExisting: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Clear existing equipment before import</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={csvOptions.skipDuplicates}
                    onChange={(e) => setCsvOptions({ ...csvOptions, skipDuplicates: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Skip duplicate equipment numbers</span>
                </label>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paste CSV Data:
                </label>
                <textarea
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="Paste your CSV data here..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCsvImport(false);
                    setCsvData('');
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCsvImport}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {editingEquipment ? 'Edit Equipment' : 'Add New Equipment'}
              </h2>
              
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Equipment No. *
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.no}
                      onChange={(e) => setFormData({ ...formData, no: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Equipment Model
                    </label>
                    <input
                      type="text"
                      value={formData.equipmentModel}
                      onChange={(e) => setFormData({ ...formData, equipmentModel: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Complete Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.completeDescription}
                    onChange={(e) => setFormData({ ...formData, completeDescription: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Short) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Capacity
                    </label>
                    <input
                      type="text"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 93 kW"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Flywheel HP
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.flywheelHorsepower}
                      onChange={(e) => setFormData({ ...formData, flywheelHorsepower: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rental Rate (₱) *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={formData.rentalRate}
                      onChange={(e) => setFormData({ ...formData, rentalRate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hourly Rate (₱) *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingEquipment(null);
                      resetForm();
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingEquipment ? 'Update' : 'Create'}
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
          <div className="p-8 text-center text-gray-500">Loading equipment...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : equipment.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No equipment found. Click "Add New" or "Import CSV" to add equipment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="w-16 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">No.</th>
                  <th className="w-64 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                  <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacity</th>
                  <th className="w-32 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rental Rate</th>
                  <th className="w-32 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hourly Rate</th>
                  <th className="w-40 px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {equipment.map((eq) => (
                  <tr key={eq._id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-sm font-medium text-gray-900">
                      {eq.no}
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-sm font-medium text-gray-900 truncate">{eq.description}</div>
                      <div className="text-xs text-gray-500 truncate">{eq.completeDescription}</div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500 truncate">
                      {eq.equipmentModel || '-'}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500 truncate">
                      {eq.capacity || '-'}
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-gray-900 whitespace-nowrap">
                      ₱{eq.rentalRate.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-gray-900 whitespace-nowrap">
                      ₱{eq.hourlyRate.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-center text-sm font-medium">
                      <button
                        onClick={() => handleEdit(eq)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(eq._id)}
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
