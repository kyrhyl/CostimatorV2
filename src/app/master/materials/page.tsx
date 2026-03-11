'use client';

import { useState, useEffect } from 'react';

interface MaterialPrice {
  _id: string;
  materialCode: string;
  description: string;
  unit: string;
  location: string;
  district?: string;
  unitCost: number;
  priceSource?: 'cmpd' | 'canvass';
  brand?: string;
  specification?: string;
  supplier?: string;
  effectiveDate: string;
  cmpd_version?: string;
  isActive?: boolean;
  importBatch?: string;
  createdAt: string;
  updatedAt: string;
}

interface Material {
  _id: string;
  materialCode: string;
  materialDescription: string;
  unit: string;
  includeHauling: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CMPDPage() {
  const [activeTab, setActiveTab] = useState<'prices' | 'registry'>('prices');
  const [prices, setPrices] = useState<MaterialPrice[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [error, setError] = useState('');
  const [materialsError, setMaterialsError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [materialSearchTerm, setMaterialSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('');
  const [versionFilter, setVersionFilter] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCanvassModal, setShowCanvassModal] = useState(false);
  const [importData, setImportData] = useState({
    file: null as File | null,
    district: '',
    cmpd_version: '',
    location: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    deactivateOldPrices: false,
    validateMaterialCodes: true,
  });
  const [importProgress, setImportProgress] = useState<{
    status: 'idle' | 'uploading' | 'success' | 'error';
    message: string;
    summary?: any;
  }>({
    status: 'idle',
    message: '',
  });
  const [canvassForm, setCanvassForm] = useState({
    materialCode: '',
    description: '',
    unit: '',
    unitCost: 0,
    location: '',
    district: '',
    cmpd_version: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    brand: '',
    specification: '',
    supplier: ''
  });
  const [canvassSubmitting, setCanvassSubmitting] = useState(false);
  const [canvassError, setCanvassError] = useState('');

  useEffect(() => {
    fetchPrices();
  }, [searchTerm, activeFilter, districtFilter, versionFilter]);

  useEffect(() => {
    fetchMaterials();
  }, [materialSearchTerm]);

  const fetchPrices = async () => {
    try {
      setPricesLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (districtFilter) params.append('district', districtFilter);
      if (versionFilter) params.append('cmpd_version', versionFilter);
      if (activeFilter !== 'all') params.append('isActive', activeFilter);
      
      const response = await fetch(`/api/master/materials/prices?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setPrices(result.data);
        setError('');
      } else {
        setError(result.error || 'Failed to fetch prices');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch prices');
    } finally {
      setPricesLoading(false);
    }
  };

  const fetchMaterials = async () => {
    try {
      setMaterialsLoading(true);
      const params = new URLSearchParams();
      if (materialSearchTerm) params.append('search', materialSearchTerm);

      const response = await fetch(`/api/master/materials?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setMaterials(result.data);
        setMaterialsError('');
      } else {
        setMaterialsError(result.error || 'Failed to fetch materials');
      }
    } catch (err: any) {
      setMaterialsError(err.message || 'Failed to fetch materials');
    } finally {
      setMaterialsLoading(false);
    }
  };

  const toggleIncludeHauling = async (material: Material) => {
    try {
      const response = await fetch(`/api/master/materials/${material._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeHauling: !material.includeHauling })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        fetchMaterials();
      } else {
        alert(result.error || 'Failed to update hauling flag');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update hauling flag');
    }
  };


  const handleImportCMPD = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!importData.file) {
      alert('Please select a file to import');
      return;
    }
    
    if (!importData.district || !importData.cmpd_version || !importData.location) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      setImportProgress({ status: 'uploading', message: 'Uploading and processing file...' });
      
      const formData = new FormData();
      formData.append('file', importData.file);
      formData.append('district', importData.district);
      formData.append('cmpd_version', importData.cmpd_version);
      formData.append('location', importData.location);
      formData.append('effectiveDate', importData.effectiveDate);
      formData.append('deactivateOldPrices', String(importData.deactivateOldPrices));
      formData.append('validateMaterialCodes', String(importData.validateMaterialCodes));
      
      const response = await fetch('/api/master/materials/prices/bulk-import', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.success) {
        setImportProgress({
          status: 'success',
          message: result.message,
          summary: result.summary,
        });
      } else {
        setImportProgress({
          status: 'error',
          message: result.error || 'Import failed',
          summary: result,
        });
      }
    } catch (err: any) {
      setImportProgress({
        status: 'error',
        message: err.message || 'Failed to import CMPD data',
      });
    }
  };

  const resetImportModal = () => {
    setImportData({
      file: null,
      district: '',
      cmpd_version: '',
      location: '',
      effectiveDate: new Date().toISOString().split('T')[0],
      deactivateOldPrices: false,
      validateMaterialCodes: true,
    });
    setImportProgress({
      status: 'idle',
      message: '',
    });
  };

  const resetCanvassForm = () => {
    setCanvassForm({
      materialCode: '',
      description: '',
      unit: '',
      unitCost: 0,
      location: '',
      district: '',
      cmpd_version: '',
      effectiveDate: new Date().toISOString().split('T')[0],
      brand: '',
      specification: '',
      supplier: ''
    });
    setCanvassError('');
  };

  const handleCreateCanvassPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    setCanvassSubmitting(true);
    setCanvassError('');

    try {
      const payload = {
        materialCode: canvassForm.materialCode.trim().toUpperCase(),
        description: canvassForm.description.trim(),
        unit: canvassForm.unit.trim().toUpperCase(),
        unitCost: Number(canvassForm.unitCost) || 0,
        location: canvassForm.location.trim(),
        district: canvassForm.district.trim(),
        cmpd_version: canvassForm.cmpd_version.trim(),
        effectiveDate: canvassForm.effectiveDate,
        brand: canvassForm.brand.trim(),
        specification: canvassForm.specification.trim(),
        supplier: canvassForm.supplier.trim(),
        priceSource: 'canvass'
      };

      const response = await fetch('/api/master/materials/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create canvass price');
      }

      resetCanvassForm();
      setShowCanvassModal(false);
      fetchPrices();
    } catch (err: any) {
      setCanvassError(err.message || 'Failed to create canvass price');
    } finally {
      setCanvassSubmitting(false);
    }
  };

  const districts = [...new Set(prices.map(p => p.district).filter(Boolean))];
  const versions = [...new Set(prices.map(p => p.cmpd_version).filter(Boolean))];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">CMPD Management</h1>
        <p className="text-gray-600">Construction Materials Price Data - district-specific and canvass pricing</p>
      </div>

      <div className="mb-6">
        <div className="text-sm text-gray-600">
          CMPD prices only. Base material catalog is hidden.
        </div>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('prices')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'prices'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            CMPD Prices
          </button>
          <button
            onClick={() => setActiveTab('registry')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'registry'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Materials Registry (Hauling)
          </button>
        </nav>
      </div>


      {activeTab === 'prices' && (
        <>
          {/* Filters and Actions */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search material code..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  District
                </label>
                <select
                  value={districtFilter}
                  onChange={(e) => setDistrictFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Districts</option>
                  {districts.map(dist => (
                    <option key={dist} value={dist}>{dist}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CMPD Version
                </label>
                <select
                  value={versionFilter}
                  onChange={(e) => setVersionFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Versions</option>
                  {versions.map(ver => (
                    <option key={ver} value={ver}>{ver}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="true">Active Only</option>
                  <option value="false">Inactive Only</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <div className="flex w-full gap-2">
                  <button
                    onClick={() => {
                      resetImportModal();
                      setShowImportModal(true);
                    }}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                  >
                    Import CMPD
                  </button>
                  <button
                    onClick={() => {
                      resetCanvassForm();
                      setShowCanvassModal(true);
                    }}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Add Canvass
                  </button>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              Total: {prices.length} price record{prices.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {pricesLoading ? (
              <div className="p-8 text-center text-gray-500">Loading district prices...</div>
            ) : error ? (
              <div className="p-8 text-center text-red-600">{error}</div>
            ) : prices.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No district prices found. Click "Import CMPD" to upload district-specific pricing data.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">District</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CMPD Version</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effective Date</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {prices.map((price) => (
                      <tr key={price._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{price.materialCode}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{price.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {price.district || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {price.cmpd_version || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {price.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          ₱{Number(price.unitCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {price.priceSource || 'cmpd'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {price.brand || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(price.effectiveDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            price.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {price.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Import CMPD Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-2">Import CMPD (Construction Materials Price Data)</h2>
              <p className="text-sm text-gray-600 mb-6">
                Upload CSV or Excel file to bulk import district-specific material prices
              </p>
              
              {importProgress.status === 'idle' || importProgress.status === 'uploading' ? (
                <form onSubmit={handleImportCMPD}>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                    <h3 className="font-semibold text-blue-900 mb-2">Expected File Format:</h3>
                    <div className="text-sm text-blue-800 font-mono">
                      <div>Material Code | Description | Unit | Unit Cost | Brand | Specification | Supplier</div>
                      <div className="mt-1 text-xs text-blue-600">
                        Alternative column names accepted: materialCode/code, unitCost/price/cost, specification/specs
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload File (CSV, XLS, XLSX) *
                    </label>
                    <input
                      type="file"
                      accept=".csv,.xls,.xlsx"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setImportData({ ...importData, file });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        DPWH District *
                      </label>
                      <input
                        type="text"
                        required
                        value={importData.district}
                        onChange={(e) => setImportData({ ...importData, district: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                        placeholder="e.g., DPWH-NCR-1st, DPWH-CAR"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CMPD Version *
                      </label>
                      <input
                        type="text"
                        required
                        value={importData.cmpd_version}
                        onChange={(e) => setImportData({ ...importData, cmpd_version: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                        placeholder="e.g., CMPD-2024-Q1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location *
                      </label>
                      <input
                        type="text"
                        required
                        value={importData.location}
                        onChange={(e) => setImportData({ ...importData, location: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                        placeholder="e.g., Metro Manila, Baguio City"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Effective Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={importData.effectiveDate}
                        onChange={(e) => setImportData({ ...importData, effectiveDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div className="mb-6 space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={importData.deactivateOldPrices}
                        onChange={(e) => setImportData({ ...importData, deactivateOldPrices: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Deactivate old prices for this district
                      </span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={importData.validateMaterialCodes}
                        onChange={(e) => setImportData({ ...importData, validateMaterialCodes: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Validate material codes against master data
                      </span>
                    </label>
                  </div>

                  {importProgress.status === 'uploading' && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="text-blue-800">{importProgress.message}</div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowImportModal(false);
                        resetImportModal();
                      }}
                      disabled={importProgress.status === 'uploading'}
                      className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={importProgress.status === 'uploading'}
                      className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {importProgress.status === 'uploading' ? 'Importing...' : 'Import'}
                    </button>
                  </div>
                </form>
              ) : importProgress.status === 'success' ? (
                <div>
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="text-green-800 font-semibold mb-2">{importProgress.message}</div>
                    {importProgress.summary && (
                      <div className="text-sm text-green-700 space-y-1">
                        <div>Total Rows: {importProgress.summary.totalRows}</div>
                        <div>Valid Rows: {importProgress.summary.validRows}</div>
                        <div>Invalid Rows: {importProgress.summary.invalidRows}</div>
                        <div>Successfully Imported: {importProgress.summary.imported}</div>
                        {importProgress.summary.duplicates > 0 && (
                          <div>Duplicates Skipped: {importProgress.summary.duplicates}</div>
                        )}
                        <div>District: {importProgress.summary.district}</div>
                        <div>CMPD Version: {importProgress.summary.cmpd_version}</div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setShowImportModal(false);
                        resetImportModal();
                      }}
                      className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="text-red-800 font-semibold mb-2">Import Failed</div>
                    <div className="text-sm text-red-700">{importProgress.message}</div>
                    {importProgress.summary?.invalidCodes && (
                      <div className="mt-2 text-sm text-red-700">
                        <div className="font-semibold">Invalid Material Codes:</div>
                        <div className="max-h-32 overflow-y-auto">
                          {importProgress.summary.invalidCodes.join(', ')}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setImportProgress({ status: 'idle', message: '' });
                      }}
                      className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => {
                        setShowImportModal(false);
                        resetImportModal();
                      }}
                      className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Canvass Price Modal */}
      {showCanvassModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-2">Add Canvass Price</h2>
              <p className="text-sm text-gray-600 mb-6">
                Canvass prices are used only when CMPD is missing for a material.
              </p>

              {canvassError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
                  {canvassError}
                </div>
              )}

              <form onSubmit={handleCreateCanvassPrice}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Material Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={canvassForm.materialCode}
                      onChange={(e) => setCanvassForm({ ...canvassForm, materialCode: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., MG01.0001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit *
                    </label>
                    <input
                      type="text"
                      required
                      value={canvassForm.unit}
                      onChange={(e) => setCanvassForm({ ...canvassForm, unit: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., CUM, KG"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={canvassForm.description}
                    onChange={(e) => setCanvassForm({ ...canvassForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit Cost (PHP) *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={canvassForm.unitCost}
                      onChange={(e) => setCanvassForm({ ...canvassForm, unitCost: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Effective Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={canvassForm.effectiveDate}
                      onChange={(e) => setCanvassForm({ ...canvassForm, effectiveDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      District *
                    </label>
                    <input
                      type="text"
                      required
                      value={canvassForm.district}
                      onChange={(e) => setCanvassForm({ ...canvassForm, district: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., DPWH-NCR-1st"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location *
                    </label>
                    <input
                      type="text"
                      required
                      value={canvassForm.location}
                      onChange={(e) => setCanvassForm({ ...canvassForm, location: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Metro Manila"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CMPD Version *
                  </label>
                  <input
                    type="text"
                    required
                    value={canvassForm.cmpd_version}
                    onChange={(e) => setCanvassForm({ ...canvassForm, cmpd_version: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., CMPD-2025-Q2"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand
                    </label>
                    <input
                      type="text"
                      value={canvassForm.brand}
                      onChange={(e) => setCanvassForm({ ...canvassForm, brand: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specification
                    </label>
                    <input
                      type="text"
                      value={canvassForm.specification}
                      onChange={(e) => setCanvassForm({ ...canvassForm, specification: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supplier
                    </label>
                    <input
                      type="text"
                      value={canvassForm.supplier}
                      onChange={(e) => setCanvassForm({ ...canvassForm, supplier: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCanvassModal(false);
                      resetCanvassForm();
                    }}
                    disabled={canvassSubmitting}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={canvassSubmitting}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {canvassSubmitting ? 'Saving...' : 'Save Canvass Price'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'registry' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Materials Registry</h2>
              <p className="text-sm text-gray-500">Manage hauling inclusion per material code.</p>
            </div>
            <div className="w-full max-w-xs">
              <input
                type="text"
                value={materialSearchTerm}
                onChange={(e) => setMaterialSearchTerm(e.target.value)}
                placeholder="Search materials..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {materialsLoading ? (
            <div className="p-4 text-center text-gray-500">Loading materials...</div>
          ) : materialsError ? (
            <div className="p-4 text-center text-red-600">{materialsError}</div>
          ) : materials.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No materials found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Hauling</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {materials.map((material) => (
                    <tr key={material._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{material.materialCode}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{material.materialDescription}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {material.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => toggleIncludeHauling(material)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            material.includeHauling
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {material.includeHauling ? 'Included' : 'Excluded'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
