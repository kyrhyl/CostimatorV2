'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  CoverageData,
  MISSING_TOKEN,
  Material,
  MaterialPrice,
  MissingCoverageMaterial,
  createInitialBaseMaterialForm,
  createInitialCanvassForm,
  createInitialEditForm,
  createInitialImportData,
  getTodayIso,
} from './cmpd-utils';

export default function CMPDPage() {
  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
  };

  type ImportSummary = {
    totalRows?: number;
    validRows?: number;
    invalidRows?: number;
    imported?: number;
    updated?: number;
    skipped?: number;
    duplicates?: number;
    district?: string;
    cmpd_version?: string;
    importBatch?: string;
    deactivatedOldPrices?: boolean;
    invalidCodes?: string[];
  };

  const refreshPricesAndCoverage = () => {
    fetchPrices();
    fetchCoverage();
  };

  const patchBaseMaterial = async (materialId: string, payload: Record<string, unknown>, fallbackError: string) => {
    const response = await fetch(`/api/master/materials/${materialId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || fallbackError);
    }
  };

  const [activeTab, setActiveTab] = useState<'prices' | 'base-material'>('prices');
  const [prices, setPrices] = useState<MaterialPrice[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [error, setError] = useState('');
  const [materialsError, setMaterialsError] = useState('');
  const [showBaseMaterialModal, setShowBaseMaterialModal] = useState(false);
  const [showBaseImportModal, setShowBaseImportModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [baseMaterialSubmitting, setBaseMaterialSubmitting] = useState(false);
  const [baseMaterialError, setBaseMaterialError] = useState('');
  const [baseImportSubmitting, setBaseImportSubmitting] = useState(false);
  const [baseImportError, setBaseImportError] = useState('');
  const [baseImportDetails, setBaseImportDetails] = useState<string[]>([]);
  const [baseImportExpectedColumns, setBaseImportExpectedColumns] = useState<string[]>([]);
  const [baseImportSummary, setBaseImportSummary] = useState<ImportSummary | null>(null);
  const [baseImportForm, setBaseImportForm] = useState({
    file: null as File | null,
  });
  const [baseMaterialForm, setBaseMaterialForm] = useState(createInitialBaseMaterialForm());
  const [searchTerm, setSearchTerm] = useState('');
  const [materialSearchTerm, setMaterialSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('');
  const [versionFilter, setVersionFilter] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCanvassModal, setShowCanvassModal] = useState(false);
  const [priceSourceFilter, setPriceSourceFilter] = useState<'all' | 'cmpd' | 'canvass' | 'missing'>('all');
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [coverageError, setCoverageError] = useState('');
  const [coverageData, setCoverageData] = useState<CoverageData | null>(null);
  const [showAllMissingMaterials, setShowAllMissingMaterials] = useState(false);
  const coverageSectionRef = useRef<HTMLDivElement | null>(null);
  const [selectedMaterialCategory, setSelectedMaterialCategory] = useState('');
  const [versionOptions, setVersionOptions] = useState<string[]>([]);
  const [showEditPriceModal, setShowEditPriceModal] = useState(false);
  const [editingPrice, setEditingPrice] = useState<MaterialPrice | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState(createInitialEditForm());
  const [importData, setImportData] = useState(createInitialImportData());
  const [importProgress, setImportProgress] = useState<{
    status: 'idle' | 'uploading' | 'success' | 'error';
    message: string;
    summary?: ImportSummary;
  }>({
    status: 'idle',
    message: '',
  });
  const [canvassForm, setCanvassForm] = useState(createInitialCanvassForm());
  const [canvassSubmitting, setCanvassSubmitting] = useState(false);
  const [canvassError, setCanvassError] = useState('');

  useEffect(() => {
    fetchPrices();
  }, [searchTerm, activeFilter, districtFilter, versionFilter, priceSourceFilter]);

  useEffect(() => {
    fetchCmpdVersions();
  }, []);

  useEffect(() => {
    fetchCoverage();
  }, [districtFilter, versionFilter]);

  const fetchCmpdVersions = async () => {
    try {
      const response = await fetch('/api/master/materials/prices/versions');
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setVersionOptions(result.data);
      }
    } catch (err) {
      console.error('Failed to load CMPD versions', err);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [materialSearchTerm]);

  const fetchPrices = async () => {
    try {
      setPricesLoading(true);
      const params = new URLSearchParams();
      const trimmedSearch = searchTerm.trim();
      if (trimmedSearch) params.append('search', trimmedSearch);
      if (activeFilter !== 'all') params.append('isActive', activeFilter);
      if (districtFilter && districtFilter !== MISSING_TOKEN) params.append('district', districtFilter);
      if (versionFilter && versionFilter !== MISSING_TOKEN) params.append('cmpd_version', versionFilter);
      if (priceSourceFilter !== 'all' && priceSourceFilter !== 'missing') params.append('priceSource', priceSourceFilter);
      
      const response = await fetch(`/api/master/materials/prices?${params.toString()}`);
      
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
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to fetch prices'));
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
    } catch (err: unknown) {
      setMaterialsError(getErrorMessage(err, 'Failed to fetch materials'));
    } finally {
      setMaterialsLoading(false);
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
        refreshPricesAndCoverage();
      } else {
        setImportProgress({
          status: 'error',
          message: result.error || 'Import failed',
          summary: result,
        });
      }
    } catch (err: unknown) {
      setImportProgress({
        status: 'error',
        message: getErrorMessage(err, 'Failed to import CMPD data'),
      });
    }
  };

  const resetImportModal = () => {
    setImportData({
      file: null,
      district: '',
      cmpd_version: '',
      location: '',
      effectiveDate: getTodayIso(),
      deactivateOldPrices: false,
      validateMaterialCodes: true,
    });
    setImportProgress({
      status: 'idle',
      message: '',
    });
  };

  const resetCanvassForm = () => {
    setCanvassForm(createInitialCanvassForm());
    setCanvassError('');
  };

  const openCanvassFromMissing = (material: MissingCoverageMaterial) => {
    setCanvassForm({
      materialCode: material.materialCode,
      description: material.description,
      unit: material.unit,
      unitCost: 0,
      location: '',
      district: districtFilter && districtFilter !== MISSING_TOKEN ? districtFilter : '',
      cmpd_version: versionFilter && versionFilter !== MISSING_TOKEN ? versionFilter : '',
      effectiveDate: getTodayIso(),
      brand: '',
      specification: '',
      supplier: '',
    });
    setCanvassError('');
    setShowCanvassModal(true);
  };

  const jumpToMissingPrices = () => {
    setPriceSourceFilter('missing');
    setShowAllMissingMaterials(true);
    if (!districtFilter || !versionFilter || districtFilter === MISSING_TOKEN || versionFilter === MISSING_TOKEN) {
      setCoverageError('Select a specific District and CMPD Version to view missing prices.');
    }
    coverageSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const fetchCoverage = async () => {
    if (!districtFilter || !versionFilter || districtFilter === MISSING_TOKEN || versionFilter === MISSING_TOKEN) {
      setCoverageData(null);
      setCoverageError('');
      return;
    }

    try {
      setCoverageLoading(true);
      setCoverageError('');
      const params = new URLSearchParams();
      params.append('district', districtFilter);
      params.append('cmpd_version', versionFilter);

      const response = await fetch(`/api/master/materials/prices/coverage?${params.toString()}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load coverage');
      }

      setCoverageData(result.data || null);
      setShowAllMissingMaterials(false);
    } catch (err: unknown) {
      setCoverageData(null);
      setCoverageError(getErrorMessage(err, 'Failed to load coverage'));
    } finally {
      setCoverageLoading(false);
    }
  };

  const resetBaseMaterialForm = () => {
    setBaseMaterialForm(createInitialBaseMaterialForm());
    setBaseMaterialError('');
    setEditingMaterial(null);
  };

  const openCreateBaseMaterial = () => {
    resetBaseMaterialForm();
    setShowBaseMaterialModal(true);
  };

  const openEditBaseMaterial = (material: Material) => {
    setEditingMaterial(material);
    setBaseMaterialError('');
    setBaseMaterialForm({
      materialCode: material.materialCode || '',
      works: material.works || '',
      materialDescription: material.materialDescription || '',
      unit: material.unit || '',
      category: material.category || '',
      includeHauling: Boolean(material.includeHauling),
      isActive: Boolean(material.isActive),
    });
    setShowBaseMaterialModal(true);
  };

  const handleSaveBaseMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setBaseMaterialSubmitting(true);
    setBaseMaterialError('');
    try {
      const payload = {
        materialCode: baseMaterialForm.materialCode.trim().toUpperCase(),
        works: baseMaterialForm.works.trim().toUpperCase(),
        materialDescription: baseMaterialForm.materialDescription.trim(),
        unit: baseMaterialForm.unit.trim().toUpperCase(),
        category: baseMaterialForm.category.trim(),
        includeHauling: baseMaterialForm.includeHauling,
        isActive: baseMaterialForm.isActive,
      };

      const targetUrl = editingMaterial
        ? `/api/master/materials/${editingMaterial._id}`
        : '/api/master/materials';
      const method = editingMaterial ? 'PATCH' : 'POST';

      const response = await fetch(targetUrl, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || `Failed to ${editingMaterial ? 'update' : 'create'} material`);
      }

      setShowBaseMaterialModal(false);
      resetBaseMaterialForm();
      fetchMaterials();
    } catch (err: unknown) {
      setBaseMaterialError(getErrorMessage(err, 'Failed to save base material'));
    } finally {
      setBaseMaterialSubmitting(false);
    }
  };

  const handleDeleteBaseMaterial = async (material: Material) => {
    const confirmed = window.confirm(`Delete base material ${material.materialCode}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/master/materials/${material._id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete base material');
      }
      fetchMaterials();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to delete base material'));
    }
  };

  const toggleBaseMaterialHauling = async (material: Material) => {
    try {
      await patchBaseMaterial(material._id, { includeHauling: !material.includeHauling }, 'Failed to update hauling');
      fetchMaterials();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to update hauling'));
    }
  };

  const toggleBaseMaterialStatus = async (material: Material) => {
    try {
      await patchBaseMaterial(material._id, { isActive: !material.isActive }, 'Failed to update status');
      fetchMaterials();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to update status'));
    }
  };

  const resetBaseImportForm = () => {
    setBaseImportForm({ file: null });
    setBaseImportError('');
    setBaseImportDetails([]);
    setBaseImportExpectedColumns([]);
    setBaseImportSummary(null);
  };

  const handleImportBaseMaterials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseImportForm.file) {
      setBaseImportError('Please select a file to import.');
      return;
    }
    setBaseImportSubmitting(true);
    setBaseImportError('');
    setBaseImportDetails([]);
    setBaseImportExpectedColumns([]);
    setBaseImportSummary(null);
    try {
      const formData = new FormData();
      formData.append('file', baseImportForm.file);

      const response = await fetch('/api/master/materials/bulk-import', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setBaseImportDetails(Array.isArray(result.details) ? result.details : []);
        setBaseImportExpectedColumns(Array.isArray(result.expectedColumns) ? result.expectedColumns : []);
        throw new Error(result.error || 'Failed to import base materials');
      }

      setBaseImportSummary(result.summary || null);
      await fetchMaterials();
    } catch (err: unknown) {
      setBaseImportError(getErrorMessage(err, 'Failed to import base materials'));
    } finally {
      setBaseImportSubmitting(false);
    }
  };

  const openEditPriceModal = (price: MaterialPrice) => {
    setEditingPrice(price);
    setEditError('');
    setEditForm({
      materialCode: price.materialCode || '',
      description: price.description || '',
      unit: price.unit || '',
      location: price.location || '',
      district: price.district || '',
      cmpd_version: price.cmpd_version || '',
      unitCost: Number(price.unitCost || 0),
      priceSource: (price.priceSource || 'cmpd') as 'cmpd' | 'canvass',
      brand: price.brand || '',
      specification: price.specification || '',
      supplier: price.supplier || '',
      effectiveDate: price.effectiveDate ? new Date(price.effectiveDate).toISOString().split('T')[0] : getTodayIso(),
      isActive: Boolean(price.isActive),
    });
    setShowEditPriceModal(true);
  };

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrice) return;
    setEditSubmitting(true);
    setEditError('');
    try {
      const response = await fetch(`/api/master/materials/prices/${editingPrice._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialCode: editForm.materialCode.trim().toUpperCase(),
          description: editForm.description.trim(),
          unit: editForm.unit.trim().toUpperCase(),
          location: editForm.location.trim(),
          district: editForm.district.trim(),
          cmpd_version: editForm.cmpd_version.trim(),
          unitCost: Number(editForm.unitCost) || 0,
          priceSource: editForm.priceSource,
          brand: editForm.brand.trim(),
          specification: editForm.specification.trim(),
          supplier: editForm.supplier.trim(),
          effectiveDate: editForm.effectiveDate,
          isActive: editForm.isActive,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update material price');
      }
      setShowEditPriceModal(false);
      setEditingPrice(null);
      refreshPricesAndCoverage();
    } catch (err: unknown) {
      setEditError(getErrorMessage(err, 'Failed to update material price'));
    } finally {
      setEditSubmitting(false);
    }
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
      refreshPricesAndCoverage();
    } catch (err: unknown) {
      setCanvassError(getErrorMessage(err, 'Failed to create canvass price'));
    } finally {
      setCanvassSubmitting(false);
    }
  };

  const displayedPrices = useMemo(() => {
    return prices.filter((price) => {
      if (districtFilter && districtFilter !== MISSING_TOKEN && (price.district || '').trim() !== districtFilter) return false;
      if (districtFilter === MISSING_TOKEN && price.district?.trim()) return false;
      if (versionFilter && versionFilter !== MISSING_TOKEN && (price.cmpd_version || '').trim() !== versionFilter) return false;
      if (versionFilter === MISSING_TOKEN && price.cmpd_version?.trim()) return false;
      if (priceSourceFilter === 'missing') return false;
      if (priceSourceFilter !== 'all' && (price.priceSource || 'cmpd') !== priceSourceFilter) return false;
      return true;
    });
  }, [prices, districtFilter, versionFilter, priceSourceFilter]);

  const materialCategories = useMemo(() => {
    return [...new Set(materials.map((m) => (m.category || 'UNCATEGORIZED').trim().toUpperCase()))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [materials]);

  const materialWorksOptions = useMemo(() => {
    return [...new Set(materials.map((m) => (m.works || '').trim().toUpperCase()))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    if (!selectedMaterialCategory) return materials;
    return materials.filter(
      (m) => (m.category || 'UNCATEGORIZED').trim().toUpperCase() === selectedMaterialCategory
    );
  }, [materials, selectedMaterialCategory]);

  const districts = useMemo(
    () => [...new Set(prices.map((p) => p.district).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b))),
    [prices]
  );

  return (
    <div className="container mx-auto px-4 py-8" suppressHydrationWarning>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">CMPD Management</h1>
        <p className="mt-1 text-sm text-gray-600">Manage semi-annual CMPD imports, monitor pricing coverage, and fill gaps through canvass entries.</p>
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
            onClick={() => setActiveTab('base-material')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'base-material'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Base Materials
          </button>
        </nav>
      </div>


      {activeTab === 'prices' && (
        <>
          {/* Filters and Actions */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search material code..."
                  className="w-full px-2.5 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  District
                </label>
                <select
                  value={districtFilter}
                  onChange={(e) => setDistrictFilter(e.target.value)}
                  className="w-full px-2.5 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Districts</option>
                  <option value={MISSING_TOKEN}>Missing District</option>
                  {districts.map(dist => (
                    <option key={dist} value={dist}>{dist}</option>
                  ))}
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  CMPD Version
                </label>
                <select
                  value={versionFilter}
                  onChange={(e) => setVersionFilter(e.target.value)}
                  className="w-full px-2.5 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Versions</option>
                  <option value={MISSING_TOKEN}>Missing Version</option>
                  {versionOptions.map(ver => (
                    <option key={ver} value={ver}>{ver}</option>
                  ))}
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="w-full px-2.5 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="true">Active Only</option>
                  <option value="false">Inactive Only</option>
                </select>
              </div>
              
              <div className="md:col-span-3 flex items-end">
                <div className="grid w-full grid-cols-2 gap-2 md:flex md:flex-wrap md:justify-end">
                  <button
                    onClick={() => {
                      resetImportModal();
                      setShowImportModal(true);
                    }}
                    className="w-full bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors text-xs font-semibold"
                  >
                    Import CMPD
                  </button>
                  <button
                    onClick={() => {
                      resetCanvassForm();
                      setShowCanvassModal(true);
                    }}
                    className="w-full bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-xs font-semibold"
                  >
                    Add Canvass
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="text-xs text-gray-500">
                Total: {displayedPrices.length} price record{displayedPrices.length !== 1 ? 's' : ''}
              </div>
              <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPriceSourceFilter('all')}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
                  priceSourceFilter === 'all'
                    ? 'bg-slate-700 text-white border-slate-700'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                All Sources
              </button>
              <button
                type="button"
                onClick={() => setPriceSourceFilter('cmpd')}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
                  priceSourceFilter === 'cmpd'
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-white text-blue-700 border-blue-300'
                }`}
              >
                CMPD Only
              </button>
              <button
                type="button"
                onClick={() => setPriceSourceFilter('canvass')}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
                  priceSourceFilter === 'canvass'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-amber-700 border-amber-300'
                }`}
              >
                Canvass Only
              </button>
              <button
                type="button"
                onClick={jumpToMissingPrices}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
                  priceSourceFilter === 'missing'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white text-rose-700 border-rose-300'
                }`}
              >
                Missing Prices
              </button>
              </div>
            </div>
          </div>

          <div ref={coverageSectionRef} className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900">Coverage Insights</div>
                <div className="text-xs text-gray-500">Select exact district and CMPD version to compute pricing coverage and missing materials.</div>
              </div>
              <button
                type="button"
                onClick={fetchCoverage}
                className="self-start rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 md:self-auto"
              >
                Refresh Coverage
              </button>
            </div>

            {coverageLoading ? (
              <div className="text-sm text-gray-500">Loading coverage...</div>
            ) : coverageError ? (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{coverageError}</div>
            ) : !coverageData ? (
              <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Choose a specific district and CMPD version to view gap analysis.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                  <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2"><div className="text-[11px] text-slate-600">Total Materials</div><div className="text-sm font-semibold">{coverageData.totalMaterials}</div></div>
                  <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2"><div className="text-[11px] text-blue-700">With CMPD</div><div className="text-sm font-semibold text-blue-900">{coverageData.cmpdCount}</div></div>
                  <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2"><div className="text-[11px] text-amber-700">Canvass Only</div><div className="text-sm font-semibold text-amber-900">{coverageData.canvassOnlyCount}</div></div>
                  <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2"><div className="text-[11px] text-rose-700">Missing</div><div className="text-sm font-semibold text-rose-900">{coverageData.missingCount}</div></div>
                  <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2"><div className="text-[11px] text-emerald-700">Coverage</div><div className="text-sm font-semibold text-emerald-900">{coverageData.coveragePercent}%</div></div>
                </div>

                {coverageData.missingMaterials.length > 0 && (
                  <div className="overflow-x-auto border border-rose-200 rounded-md">
                    <table className="w-full">
                      <thead className="bg-rose-50 border-b border-rose-200">
                        <tr>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-rose-700">Missing Material</th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-rose-700">Description</th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-rose-700">Unit</th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-rose-700">Category</th>
                          <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase text-rose-700">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100 bg-white">
                        {(showAllMissingMaterials ? coverageData.missingMaterials : coverageData.missingMaterials.slice(0, 30)).map((material) => (
                          <tr key={material.materialCode}>
                            <td className="px-3 py-2 text-xs font-semibold text-gray-900">{material.materialCode}</td>
                            <td className="px-3 py-2 text-xs text-gray-700">{material.description}</td>
                            <td className="px-3 py-2 text-xs text-gray-700">{material.unit}</td>
                            <td className="px-3 py-2 text-xs text-gray-700">{material.category || '-'}</td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => openCanvassFromMissing(material)}
                                className="rounded border border-amber-300 px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-50"
                              >
                                Create Canvass
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex items-center justify-between gap-2 px-3 py-2 text-[11px] text-rose-700 bg-rose-50 border-t border-rose-200">
                      <span>
                        Showing {showAllMissingMaterials ? coverageData.missingMaterials.length : Math.min(30, coverageData.missingMaterials.length)} of {coverageData.missingMaterials.length} missing materials.
                      </span>
                      {coverageData.missingMaterials.length > 30 && (
                        <button
                          type="button"
                          onClick={() => setShowAllMissingMaterials((prev) => !prev)}
                          className="rounded border border-rose-300 bg-white px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          {showAllMissingMaterials ? 'Show less' : 'Show all'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {pricesLoading ? (
              <div className="p-8 text-center text-gray-500">Loading district prices...</div>
            ) : error ? (
              <div className="p-8 text-center text-red-600">{error}</div>
            ) : displayedPrices.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {priceSourceFilter === 'missing'
                  ? 'Missing prices are shown in the Coverage Insights section below. Use "Create Canvass" there.'
                  : 'No district prices found. Click "Import CMPD" to upload district-specific pricing data.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold tracking-wide text-gray-500 uppercase">Material Code</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold tracking-wide text-gray-500 uppercase">Description</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold tracking-wide text-gray-500 uppercase">Unit</th>
                      <th className="px-3 py-2.5 text-right text-[11px] font-semibold tracking-wide text-gray-500 uppercase">Unit Cost</th>
                      <th className="px-3 py-2.5 text-center text-[11px] font-semibold tracking-wide text-gray-500 uppercase">Status</th>
                      <th className="px-3 py-2.5 text-center text-[11px] font-semibold tracking-wide text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {displayedPrices.map((price) => (
                      <tr key={price._id} className="hover:bg-gray-50">
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">{price.materialCode}</div>
                        </td>
                        <td className="px-3 py-2.5 max-w-[300px]">
                          <div className="text-sm text-gray-900 truncate" title={price.description}>{price.description}</div>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-500">
                          {price.unit}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                          ₱{Number(price.unitCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            price.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {price.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-center">
                          <button
                            type="button"
                            onClick={() => openEditPriceModal(price)}
                            className="rounded border border-blue-300 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            Edit
                          </button>
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

      {showEditPriceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5">
              <h2 className="text-xl font-bold mb-3">Edit CMPD Price</h2>
              {editError && <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{editError}</div>}
              <form onSubmit={handleUpdatePrice}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Material Code</label><input value={editForm.materialCode} onChange={(e) => setEditForm({ ...editForm, materialCode: e.target.value })} className="w-full px-3 py-2 border rounded" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full px-3 py-2 border rounded" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Unit</label><input value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} className="w-full px-3 py-2 border rounded" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost</label><input type="number" min="0" step="0.01" value={editForm.unitCost} onChange={(e) => setEditForm({ ...editForm, unitCost: Number(e.target.value) })} className="w-full px-3 py-2 border rounded" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Location</label><input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="w-full px-3 py-2 border rounded" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">District</label><input value={editForm.district} onChange={(e) => setEditForm({ ...editForm, district: e.target.value })} className="w-full px-3 py-2 border rounded" placeholder="e.g. Bukidnon 1st" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">CMPD Version</label><input value={editForm.cmpd_version} onChange={(e) => setEditForm({ ...editForm, cmpd_version: e.target.value })} className="w-full px-3 py-2 border rounded" placeholder="e.g. CMPD-2026-Q1" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label><input type="date" value={editForm.effectiveDate} onChange={(e) => setEditForm({ ...editForm, effectiveDate: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Source</label><select value={editForm.priceSource} onChange={(e) => setEditForm({ ...editForm, priceSource: e.target.value as 'cmpd' | 'canvass' })} className="w-full px-3 py-2 border rounded"><option value="cmpd">cmpd</option><option value="canvass">canvass</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label><select value={editForm.isActive ? 'active' : 'inactive'} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'active' })} className="w-full px-3 py-2 border rounded"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Brand</label><input value={editForm.brand} onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Specification</label><input value={editForm.specification} onChange={(e) => setEditForm({ ...editForm, specification: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label><input value={editForm.supplier} onChange={(e) => setEditForm({ ...editForm, supplier: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowEditPriceModal(false)} className="px-3 py-2 text-sm border rounded text-gray-700">Cancel</button>
                  <button type="submit" disabled={editSubmitting} className="px-3 py-2 text-sm bg-blue-600 text-white rounded disabled:opacity-50">{editSubmitting ? 'Saving...' : 'Save Changes'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Import CMPD Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5">
              <h2 className="text-xl font-bold mb-1">Import CMPD</h2>
              <p className="text-sm text-gray-600 mb-4">
                Upload CSV file to bulk import district-specific material prices
              </p>
              
              {importProgress.status === 'idle' || importProgress.status === 'uploading' ? (
                <form onSubmit={handleImportCMPD}>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                    <h3 className="font-semibold text-blue-900 mb-1 text-sm">Expected columns</h3>
                    <div className="text-xs text-blue-800 font-mono">
                      <div>Material Code | Unit Price</div>
                      <div className="mt-1">or Material Code | Description | Unit | Unit Cost | Brand | Specification | Supplier</div>
                      <div className="mt-1 text-[11px] text-blue-600">
                        Minimal format auto-fills Description and Unit from Base Materials. Alternative names: materialCode/code, unitPrice/unit_cost/price/cost, specification/specs
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Upload File (CSV) *
                    </label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setImportData({ ...importData, file });
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        DPWH District *
                      </label>
                      <input
                        type="text"
                        required
                        value={importData.district}
                        onChange={(e) => setImportData({ ...importData, district: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                        placeholder="e.g., DPWH-NCR-1st, DPWH-CAR"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CMPD Version *
                      </label>
                      <input
                        type="text"
                        required
                        value={importData.cmpd_version}
                        onChange={(e) => setImportData({ ...importData, cmpd_version: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                        placeholder="e.g., CMPD-2024-Q1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location *
                      </label>
                      <input
                        type="text"
                        required
                        value={importData.location}
                        onChange={(e) => setImportData({ ...importData, location: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                        placeholder="e.g., Metro Manila, Baguio City"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Effective Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={importData.effectiveDate}
                        onChange={(e) => setImportData({ ...importData, effectiveDate: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div className="mb-4 space-y-2">
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

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowImportModal(false);
                        resetImportModal();
                      }}
                      disabled={importProgress.status === 'uploading'}
                       className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={importProgress.status === 'uploading'}
                       className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
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
                        {(importProgress.summary.duplicates ?? 0) > 0 && (
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
            <div className="p-5">
              <h2 className="text-xl font-bold mb-1">Add Canvass Price</h2>
              <p className="text-sm text-gray-600 mb-4">
                Canvass prices are used only when CMPD is missing for a material.
              </p>

              {canvassError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
                  {canvassError}
                </div>
              )}

              <form onSubmit={handleCreateCanvassPrice}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Material Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={canvassForm.materialCode}
                      onChange={(e) => setCanvassForm({ ...canvassForm, materialCode: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., MG01.0001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit *
                    </label>
                    <input
                      type="text"
                      required
                      value={canvassForm.unit}
                      onChange={(e) => setCanvassForm({ ...canvassForm, unit: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., CUM, KG"
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={canvassForm.description}
                    onChange={(e) => setCanvassForm({ ...canvassForm, description: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Cost (PHP) *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={canvassForm.unitCost}
                      onChange={(e) => setCanvassForm({ ...canvassForm, unitCost: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Effective Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={canvassForm.effectiveDate}
                      onChange={(e) => setCanvassForm({ ...canvassForm, effectiveDate: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      District *
                    </label>
                    <input
                      type="text"
                      required
                      value={canvassForm.district}
                      onChange={(e) => setCanvassForm({ ...canvassForm, district: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., DPWH-NCR-1st"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location *
                    </label>
                    <input
                      type="text"
                      required
                      value={canvassForm.location}
                      onChange={(e) => setCanvassForm({ ...canvassForm, location: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Metro Manila"
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CMPD Version *
                  </label>
                  <select
                    required
                    value={canvassForm.cmpd_version}
                    onChange={(e) => setCanvassForm({ ...canvassForm, cmpd_version: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select CMPD version...</option>
                    {versionOptions.map((version) => (
                      <option key={version} value={version}>{version}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brand
                    </label>
                    <input
                      type="text"
                      value={canvassForm.brand}
                      onChange={(e) => setCanvassForm({ ...canvassForm, brand: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Specification
                    </label>
                    <input
                      type="text"
                      value={canvassForm.specification}
                      onChange={(e) => setCanvassForm({ ...canvassForm, specification: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier
                    </label>
                    <input
                      type="text"
                      value={canvassForm.supplier}
                      onChange={(e) => setCanvassForm({ ...canvassForm, supplier: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCanvassModal(false);
                      resetCanvassForm();
                    }}
                    disabled={canvassSubmitting}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={canvassSubmitting}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {canvassSubmitting ? 'Saving...' : 'Save Canvass Price'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'base-material' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Base Material Catalog</h2>
              <p className="text-sm text-gray-500">Canonical material definitions used for DUPA selection and fallback pricing.</p>
            </div>
            <div className="flex w-full max-w-4xl items-center gap-2">
              <input
                type="text"
                value={materialSearchTerm}
                onChange={(e) => setMaterialSearchTerm(e.target.value)}
                placeholder="Search base materials..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={selectedMaterialCategory}
                onChange={(e) => setSelectedMaterialCategory(e.target.value)}
                className="w-80 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {materialCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  resetBaseImportForm();
                  setShowBaseImportModal(true);
                }}
                className="whitespace-nowrap rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Import
              </button>
              <button
                type="button"
                onClick={openCreateBaseMaterial}
                className="whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                + Add Base Material
              </button>
            </div>
          </div>

          {materialsLoading ? (
            <div className="p-4 text-center text-gray-500">Loading base materials...</div>
          ) : materialsError ? (
            <div className="p-4 text-center text-red-600">{materialsError}</div>
          ) : filteredMaterials.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No base materials found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-y bg-white">
                  <tr>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase">Code</th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase">Unit</th>
                    <th className="px-4 py-2 text-center text-[11px] font-semibold text-gray-500 uppercase">Hauling</th>
                    <th className="px-4 py-2 text-center text-[11px] font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-center text-[11px] font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredMaterials.map((material) => (
                    <tr key={material._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900">{material.materialCode}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-900">{material.materialDescription}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-500">{material.unit}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={() => toggleBaseMaterialHauling(material)}
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-colors ${
                            material.includeHauling
                              ? 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'
                              : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          {material.includeHauling ? 'Included' : 'Excluded'}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={() => toggleBaseMaterialStatus(material)}
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-colors ${
                            material.isActive
                              ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          {material.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditBaseMaterial(material)}
                            className="rounded border border-blue-300 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBaseMaterial(material)}
                            className="rounded border border-red-300 px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showBaseImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl p-6">
            <h3 className="text-xl font-semibold text-gray-900">Import Base Materials</h3>
            <p className="mt-1 text-sm text-gray-500">Supported files: CSV</p>

            {baseImportError && (
              <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {baseImportError}
              </div>
            )}

            {baseImportDetails.length > 0 && (
              <div className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <div className="font-semibold">Validation details</div>
                <ul className="mt-1 list-disc pl-4 space-y-0.5">
                  {baseImportDetails.slice(0, 12).map((detail, idx) => (
                    <li key={`${detail}-${idx}`}>{detail}</li>
                  ))}
                </ul>
                {baseImportDetails.length > 12 && (
                  <div className="mt-1 text-[11px]">+{baseImportDetails.length - 12} more issue(s)</div>
                )}
              </div>
            )}

            {baseImportExpectedColumns.length > 0 && (
              <div className="mt-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                <div className="font-semibold">Expected columns</div>
                <div className="mt-1">{baseImportExpectedColumns.join(', ')}</div>
              </div>
            )}

            {baseImportSummary && (
              <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <div>Imported: {baseImportSummary.imported}</div>
                <div>Updated: {baseImportSummary.updated}</div>
                <div>Skipped: {baseImportSummary.skipped}</div>
                <div>Invalid rows: {baseImportSummary.invalidRows}</div>
              </div>
            )}

            <div className="mt-3 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              Strict mode: import fails if any row is invalid. Required CSV columns: Material Code, Works, Category, Material Description, Unit.
            </div>

            <form onSubmit={handleImportBaseMaterials} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setBaseImportForm({ ...baseImportForm, file: e.target.files?.[0] || null })}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                  required
                />
              </div>

              <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                Existing material codes are automatically overwritten during import.
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowBaseImportModal(false);
                    resetBaseImportForm();
                  }}
                  className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={baseImportSubmitting}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {baseImportSubmitting ? 'Importing...' : 'Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBaseMaterialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
            <form onSubmit={handleSaveBaseMaterial} className="p-6">
              <h3 className="text-xl font-semibold text-gray-900">{editingMaterial ? 'Edit Base Material' : 'Add Base Material'}</h3>
              {baseMaterialError && (
                <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {baseMaterialError}
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Material Code *</label>
                  <input
                    required
                    value={baseMaterialForm.materialCode}
                    onChange={(e) => setBaseMaterialForm({ ...baseMaterialForm, materialCode: e.target.value })}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Unit *</label>
                  <input
                    required
                    value={baseMaterialForm.unit}
                    onChange={(e) => setBaseMaterialForm({ ...baseMaterialForm, unit: e.target.value })}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Works *</label>
                  <input
                    required
                    value={baseMaterialForm.works}
                    onChange={(e) => setBaseMaterialForm({ ...baseMaterialForm, works: e.target.value })}
                    list="base-material-works-options"
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    placeholder={materialWorksOptions.length ? 'Select or type works' : 'Type works'}
                  />
                  <datalist id="base-material-works-options">
                    {materialWorksOptions.map((work) => (
                      <option key={work} value={work} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Category *</label>
                  <input
                    required
                    value={baseMaterialForm.category}
                    onChange={(e) => setBaseMaterialForm({ ...baseMaterialForm, category: e.target.value })}
                    list="base-material-category-options"
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    placeholder={materialCategories.length ? 'Select or type category' : 'Type category'}
                  />
                  <datalist id="base-material-category-options">
                    {materialCategories.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Description *</label>
                  <input
                    required
                    value={baseMaterialForm.materialDescription}
                    onChange={(e) => setBaseMaterialForm({ ...baseMaterialForm, materialDescription: e.target.value })}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={baseMaterialForm.includeHauling}
                    onChange={(e) => setBaseMaterialForm({ ...baseMaterialForm, includeHauling: e.target.checked })}
                  />
                  Include hauling
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={baseMaterialForm.isActive}
                    onChange={(e) => setBaseMaterialForm({ ...baseMaterialForm, isActive: e.target.checked })}
                  />
                  Active
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowBaseMaterialModal(false);
                    resetBaseMaterialForm();
                  }}
                  className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={baseMaterialSubmitting}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {baseMaterialSubmitting ? 'Saving...' : editingMaterial ? 'Save Changes' : 'Create Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
