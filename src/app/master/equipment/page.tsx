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
  fuelConsumptionAvgLph?: number;
  lubeConsumptionAvgLph?: number;
  basePrice?: number;
  fuelCost?: number;
  lubeCost?: number;
  calculatedRate?: number;
  hourlyRate?: number;
  hasRate?: boolean;
  usingMasterRate?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ScenarioOption {
  name: string;
  fuelPricePerLiter: number;
  lubePricePerLiter: number;
  updatedAt?: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  createdName?: string;
  summary?: {
    parsedRows?: number;
    fixedRatesUpserted?: number;
    variableRatesUpserted?: number;
  };
}

export default function EquipmentPage() {
  const DEFAULT_FUEL_PRICE = 90;
  const DEFAULT_LUBE_PRICE = 280;

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [editionOptions, setEditionOptions] = useState<string[]>([]);
  const [scenarioOptions, setScenarioOptions] = useState<ScenarioOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [rateEdition, setRateEdition] = useState('');
  const [tableMode, setTableMode] = useState<'fixed' | 'variable' | 'database'>('database');
  const [scenarioName, setScenarioName] = useState('BASE');
  const [newScenarioName, setNewScenarioName] = useState('BASE');
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState(String(DEFAULT_FUEL_PRICE));
  const [lubePricePerLiter, setLubePricePerLiter] = useState(String(DEFAULT_LUBE_PRICE));
  const [showAcelCsvImport, setShowAcelCsvImport] = useState(false);
  const [acelCsvFile, setAcelCsvFile] = useState<File | null>(null);
  const [acelCsvEdition, setAcelCsvEdition] = useState('');
  const [acelCsvSubmitting, setAcelCsvSubmitting] = useState(false);

  const suggestedEditionName = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const start = new Date(Date.UTC(year, 0, 1));
    const current = new Date(Date.UTC(year, now.getMonth(), now.getDate()));
    const dayMs = 24 * 60 * 60 * 1000;
    const week = Math.ceil((((current.getTime() - start.getTime()) / dayMs) + start.getUTCDay() + 1) / 7);
    return `ACEL-27TH-${year}W${String(week).padStart(2, '0')}`;
  })();
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
    equipmentModel: '',
    capacity: '',
    flywheelHorsepower: 0,
    fuelConsumptionAvgLph: 0,
    lubeConsumptionAvgLph: 0,
    hourlyRate: 0,
  });

  const formatCurrency = (value: number) =>
    `₱${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const renderRateValue = (value?: number | null, emphasis = false, usingMasterRate = false) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400">Not set</span>;
    }

    return (
      <span className={emphasis ? 'font-semibold text-amber-700' : ''}>
        {formatCurrency(Number(value || 0))}
        {usingMasterRate ? <span className="ml-2 text-xs font-normal text-slate-500">Master</span> : null}
      </span>
    );
  };

  const formatLph = (value: number) =>
    Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

  useEffect(() => {
    fetchEquipment();
  }, [searchTerm, rateEdition, tableMode, scenarioName]);

  useEffect(() => {
    fetchEditions();
  }, []);

  useEffect(() => {
    if (tableMode !== 'variable') return;
    if (!rateEdition.trim()) return;
    fetchScenarios();
  }, [tableMode, rateEdition]);

  const rateMode: 'fixed' | 'variable_fuel_lube' = tableMode === 'variable' ? 'variable_fuel_lube' : 'fixed';
  const isMasterView = tableMode === 'database';
  const isRateView = tableMode !== 'database';

  const fetchEditions = async () => {
    try {
      const response = await fetch('/api/master/equipment/rates/editions');
      const result: ApiResponse<string[]> = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load editions');
      }
      const editions = Array.isArray(result.data) ? result.data : [];
      setEditionOptions(editions);
      if (editions.length > 0 && !rateEdition.trim()) {
        setRateEdition(editions[0]);
      } else if (editions.length === 0) {
        setTableMode('database');
      }
    } catch {
      setEditionOptions([]);
      setTableMode('database');
    }
  };

  const fetchScenarios = async () => {
    try {
      const params = new URLSearchParams();
      params.append('equipmentVersion', rateEdition.trim().toUpperCase());
      params.append('edition', rateEdition.trim().toUpperCase());
      const response = await fetch(`/api/master/equipment/rates/scenarios?${params.toString()}`);
      const result: ApiResponse<ScenarioOption[]> = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Failed to load scenarios');
      const list = Array.isArray(result.data) ? result.data : [];
      setScenarioOptions(list);
      if (list.length > 0 && !list.some((s) => s.name === scenarioName)) {
        setScenarioName(list[0].name);
        setFuelPricePerLiter(String(list[0].fuelPricePerLiter ?? DEFAULT_FUEL_PRICE));
        setLubePricePerLiter(String(list[0].lubePricePerLiter ?? DEFAULT_LUBE_PRICE));
      }
    } catch {
      setScenarioOptions([]);
    }
  };

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      if (tableMode !== 'database' && !rateEdition.trim()) {
        setEquipment([]);
        setError('');
        return;
      }
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (tableMode !== 'database' && rateEdition.trim()) {
        params.append('edition', rateEdition.trim().toUpperCase());
        params.append('mode', rateMode);
        if (rateMode === 'variable_fuel_lube') {
          params.append('equipmentVersion', rateEdition.trim().toUpperCase());
          params.append('scenario', scenarioName.trim().toUpperCase() || 'BASE');
        }
      }
      
      const response = await fetch(`/api/master/equipment?${params}`);

      const result: ApiResponse<Equipment[]> = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }
      
      if (result.success) {
        setEquipment(result.data ?? []);
        setError('');
      } else {
        setError(result.error || 'Failed to fetch equipment');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to fetch equipment'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveScenario = async () => {
    if (!rateEdition.trim()) {
      alert('ACEL Edition is required for variable scenarios.');
      return;
    }

    try {
      const response = await fetch('/api/master/equipment/rates/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentVersion: rateEdition.trim().toUpperCase(),
          edition: rateEdition.trim().toUpperCase(),
          name: newScenarioName.trim().toUpperCase() || 'BASE',
          fuelPricePerLiter: Number(fuelPricePerLiter || 0),
          lubePricePerLiter: Number(lubePricePerLiter || 0),
        }),
      });
      const result: ApiResponse<ScenarioOption> = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save scenario');
      }
      const createdName = String(result.createdName || result.data?.name || scenarioName);
      setScenarioName(createdName);
      setNewScenarioName('BASE');
      alert('Scenario saved successfully.');
      fetchScenarios();
      fetchEquipment();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to save scenario'));
    }
  };

  const handleDeleteScenario = async () => {
    if (!rateEdition.trim() || !scenarioName.trim()) {
      alert('ACEL Edition and Scenario are required.');
      return;
    }

    if (!confirm(`Delete scenario ${scenarioName}? This cannot be undone.`)) return;

    try {
      const params = new URLSearchParams({
        equipmentVersion: rateEdition.trim().toUpperCase(),
        edition: rateEdition.trim().toUpperCase(),
        name: scenarioName.trim().toUpperCase(),
      });

      const response = await fetch(`/api/master/equipment/rates/scenarios?${params.toString()}`, {
        method: 'DELETE',
      });
      const result: ApiResponse = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete scenario');
      }

      const remaining = scenarioOptions.filter((s) => s.name !== scenarioName);
      setScenarioOptions(remaining);
      if (remaining.length > 0) {
        setScenarioName(remaining[0].name);
        setFuelPricePerLiter(String(remaining[0].fuelPricePerLiter ?? DEFAULT_FUEL_PRICE));
        setLubePricePerLiter(String(remaining[0].lubePricePerLiter ?? DEFAULT_LUBE_PRICE));
      } else {
        setScenarioName('BASE');
        setFuelPricePerLiter(String(DEFAULT_FUEL_PRICE));
        setLubePricePerLiter(String(DEFAULT_LUBE_PRICE));
      }

      alert('Scenario deleted successfully.');
      fetchEquipment();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to delete scenario'));
    }
  };

  const handleUpdateScenario = async () => {
    if (!rateEdition.trim() || !scenarioName.trim()) {
      alert('ACEL Edition and Scenario are required.');
      return;
    }

    try {
      const response = await fetch('/api/master/equipment/rates/scenarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentVersion: rateEdition.trim().toUpperCase(),
          edition: rateEdition.trim().toUpperCase(),
          name: scenarioName.trim().toUpperCase(),
          fuelPricePerLiter: Number(fuelPricePerLiter || 0),
          lubePricePerLiter: Number(lubePricePerLiter || 0),
        }),
      });

      const result: ApiResponse<ScenarioOption> = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update scenario');
      }

      alert('Scenario updated successfully.');
      fetchScenarios();
      fetchEquipment();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to update scenario'));
    }
  };

  const handleImportAcelCsv = async () => {
    if (!acelCsvFile || !acelCsvEdition.trim()) {
      alert('Please provide CSV file and edition.');
      return;
    }

    try {
      setAcelCsvSubmitting(true);
      const formData = new FormData();
      formData.append('file', acelCsvFile);
      formData.append('edition', acelCsvEdition.trim().toUpperCase());

      const response = await fetch('/api/master/equipment/rates/import-csv', {
        method: 'POST',
        body: formData,
      });
      const result: ApiResponse = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to import ACEL CSV');
      }
      alert(`${result.message}\nRows: ${result.summary?.parsedRows || 0}, Fixed: ${result.summary?.fixedRatesUpserted || 0}, Variable: ${result.summary?.variableRatesUpserted || 0}`);
      setShowAcelCsvImport(false);
      const importedEdition = acelCsvEdition.trim().toUpperCase();
      setRateEdition(importedEdition);
      setAcelCsvFile(null);
      setAcelCsvEdition('');
      fetchEditions();
      fetchEquipment();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to import ACEL CSV'));
    } finally {
      setAcelCsvSubmitting(false);
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
        body: JSON.stringify({
          ...formData,
          description: formData.completeDescription,
          rateEdition: tableMode !== 'database' ? rateEdition.trim().toUpperCase() : '',
          syncRateEntries: tableMode !== 'database' && Boolean(rateEdition.trim()),
        }),
      });
      const result: ApiResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      if (result.success) {
        setShowForm(false);
        setEditingEquipment(null);
        resetForm();
        fetchEquipment();
      } else {
        alert(result.error || 'Failed to save equipment');
      }
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to save equipment'));
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
      
      const result: ApiResponse = await response.json();
      
      if (result.success) {
        alert(result.message);
        setShowCsvImport(false);
        setCsvData('');
        fetchEquipment();
      } else {
        alert(result.error || 'Failed to import CSV');
      }
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to import CSV'));
    }
  };

  const handleEdit = (eq: Equipment) => {
    setEditingEquipment(eq);
    setFormData({
      no: eq.no,
      completeDescription: eq.completeDescription,
      equipmentModel: eq.equipmentModel || '',
      capacity: eq.capacity || '',
      flywheelHorsepower: eq.flywheelHorsepower || 0,
      fuelConsumptionAvgLph: eq.fuelConsumptionAvgLph || 0,
      lubeConsumptionAvgLph: eq.lubeConsumptionAvgLph || 0,
      hourlyRate: eq.hourlyRate || 0,
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
      
      const result: ApiResponse = await response.json();
      
      if (result.success) {
        fetchEquipment();
      } else {
        alert(result.error || 'Failed to delete equipment');
      }
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to delete equipment'));
    }
  };

  const resetForm = () => {
    setFormData({
      no: 0,
      completeDescription: '',
      equipmentModel: '',
      capacity: '',
      flywheelHorsepower: 0,
      fuelConsumptionAvgLph: 0,
      lubeConsumptionAvgLph: 0,
      hourlyRate: 0,
    });
  };

  const sampleCsv = `No,Complete Description,Description,Equipment Model,Capacity,Flywheel Horsepower,FuelConsumptionAvgLph,LubeConsumptionAvgLph
1,Motor Grader complete with Scarifier,Motor Grader,CAT 120G,93 kW (125 hp),125,13,0.0195
2,Hydraulic Excavator with Bucket,Hydraulic Excavator,CAT 320D,90 kW (121 hp),121,12,0.0180`;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Equipment Rates Management</h1>
        <p className="text-gray-600">Manage equipment rates and specifications</p>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTableMode('fixed')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold border ${tableMode === 'fixed' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-300'}`}
          >
            Fixed Rates
          </button>
          <button
            onClick={() => setTableMode('variable')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold border ${tableMode === 'variable' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-amber-700 border-amber-300'}`}
          >
            Variable Rates
          </button>
          <button
            onClick={() => setTableMode('database')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold border ${tableMode === 'database' ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-700 border-slate-300'}`}
          >
            Equipment Master
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3 items-end">
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Search Equipment Description
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search description..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              ACEL Edition
            </label>
            <select
              value={rateEdition}
              onChange={(e) => setRateEdition(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              {editionOptions.length === 0 ? (
                <option value="">No edition available</option>
              ) : (
                editionOptions.map((edition) => (
                  <option key={edition} value={edition}>{edition}</option>
                ))
              )}
            </select>
          </div>

          <div className="md:col-span-5 flex items-end gap-2">
            {isMasterView ? (
              <>
                <button
                  onClick={() => setShowCsvImport(true)}
                  className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors text-xs font-semibold"
                >
                  Import Equipment CSV
                </button>
                <button
                  onClick={() => {
                    setEditingEquipment(null);
                    resetForm();
                    setShowForm(true);
                  }}
                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-xs font-semibold"
                >
                  + Add Equipment
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowAcelCsvImport(true)}
                  className="flex-1 bg-emerald-600 text-white px-3 py-2 rounded-md hover:bg-emerald-700 transition-colors text-xs font-semibold"
                >
                  Import ACEL Version CSV
                </button>
                <button
                  onClick={() => {
                    setEditingEquipment(null);
                    resetForm();
                    setShowForm(true);
                  }}
                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-xs font-semibold"
                >
                  + Add Equipment for Edition
                </button>
              </>
            )}
          </div>
        </div>

        {tableMode === 'variable' && (
          <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div>
                <label className="block text-[11px] font-semibold text-amber-800 mb-1">Equipment Version</label>
                <input
                  value={rateEdition.trim().toUpperCase()}
                  disabled
                  className="w-full px-2.5 py-2 border border-amber-300 rounded-md text-sm bg-amber-100 text-amber-900"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-amber-800 mb-1">Scenario</label>
                <select
                  value={scenarioName}
                  onChange={(e) => {
                    const next = e.target.value;
                    setScenarioName(next);
                    const selected = scenarioOptions.find((s) => s.name === next);
                    if (selected) {
                      setFuelPricePerLiter(String(selected.fuelPricePerLiter ?? DEFAULT_FUEL_PRICE));
                      setLubePricePerLiter(String(selected.lubePricePerLiter ?? DEFAULT_LUBE_PRICE));
                    }
                  }}
                  className="w-full px-2.5 py-2 border border-amber-300 rounded-md text-sm"
                >
                  {scenarioOptions.length === 0 ? (
                    <option value="BASE">BASE</option>
                  ) : (
                    scenarioOptions.map((s) => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))
                  )}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-amber-800 mb-1">New Scenario Name</label>
                <input
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                  className="w-full px-2.5 py-2 border border-amber-300 rounded-md text-sm"
                  placeholder="BASE"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-amber-800 mb-1">Fuel Price/L</label>
                <input type="number" step="0.01" min="0" value={fuelPricePerLiter} onChange={(e) => setFuelPricePerLiter(e.target.value)} className="w-full px-2.5 py-2 border border-amber-300 rounded-md text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-amber-800 mb-1">Lube Price/L</label>
                <input type="number" step="0.01" min="0" value={lubePricePerLiter} onChange={(e) => setLubePricePerLiter(e.target.value)} className="w-full px-2.5 py-2 border border-amber-300 rounded-md text-sm" />
              </div>
              <div className="md:col-span-3 flex gap-2">
                <button
                  onClick={handleSaveScenario}
                  className="w-full bg-amber-600 text-white px-3 py-2 rounded-md hover:bg-amber-700 text-xs font-semibold"
                >
                  Save New
                </button>
                <button
                  onClick={handleUpdateScenario}
                  className="w-full bg-indigo-600 text-white px-3 py-2 rounded-md hover:bg-indigo-700 text-xs font-semibold"
                >
                  Update
                </button>
                <button
                  onClick={handleDeleteScenario}
                  className="w-full bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 text-xs font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="text-sm text-gray-500">
          Total: {equipment.length} equipment item{equipment.length !== 1 ? 's' : ''}
          {tableMode !== 'database' && rateEdition.trim() && <span className="ml-2">| Edition: <span className="font-semibold">{rateEdition.trim().toUpperCase()}</span></span>}
        </div>
        {isRateView && (
          <p className="mt-2 text-xs text-gray-500">
            These rate views show the same master equipment list. Values tagged `Master` are fallback prices from the equipment master when the selected edition has no explicit rate yet.
          </p>
        )}
      </div>

      {showAcelCsvImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Import ACEL Version Rates (CSV)</h2>
              <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Upload one ACEL CSV for an edition/version. The import creates or updates both Fixed Rates and Variable Rates for matching equipment.
              </p>
              <div className="grid grid-cols-1 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Edition *</label>
                  <input value={acelCsvEdition} onChange={(e) => setAcelCsvEdition(e.target.value)} placeholder="ACEL-27TH-2026W18" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                    <span>Suggested:</span>
                    <button
                      type="button"
                      onClick={() => setAcelCsvEdition(suggestedEditionName)}
                      className="rounded border border-blue-300 bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      {suggestedEditionName}
                    </button>
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">CSV File *</label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setAcelCsvFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <p className="mt-1 text-xs text-gray-500">Use one normalized ACEL CSV file (like `resources/ACEL_RATE.csv`) to update or add a full edition/version.</p>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowAcelCsvImport(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700">Cancel</button>
                <button onClick={handleImportAcelCsv} disabled={acelCsvSubmitting} className="px-4 py-2 bg-emerald-600 text-white rounded-md disabled:opacity-50">
                  {acelCsvSubmitting ? 'Importing...' : 'Import Version CSV'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    Equipment Model/Model, Capacity, Flywheel Horsepower/HP, FuelConsumptionAvgLph, LubeConsumptionAvgLph
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
                {editingEquipment ? 'Edit Equipment' : isRateView ? 'Add Equipment for Selected Edition' : 'Add Equipment'}
              </h2>
              {tableMode !== 'database' && rateEdition.trim() && (
                <p className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  Saving here also creates or updates matching fixed and variable rate entries for edition `{rateEdition.trim().toUpperCase()}`.
                </p>
              )}
               
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

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
                      Price per Hour
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                   
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fuel Avg Consumption (L/hr)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={formData.fuelConsumptionAvgLph}
                      onChange={(e) => setFormData({ ...formData, fuelConsumptionAvgLph: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lube Avg Consumption (L/hr)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={formData.lubeConsumptionAvgLph}
                      onChange={(e) => setFormData({ ...formData, lubeConsumptionAvgLph: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
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
        ) : tableMode !== 'database' && !rateEdition.trim() ? (
          <div className="p-8 text-center text-gray-500">Select an ACEL edition to view {tableMode === 'fixed' ? 'fixed' : 'variable'} rates.</div>
        ) : equipment.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No equipment found. Click "Add New" or "Import CSV" to create equipment in the master list.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="w-16 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">No.</th>
                  <th className="w-64 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  {tableMode !== 'variable' && <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>}
                  {tableMode !== 'variable' && <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacity</th>}
                  {tableMode === 'fixed' && <th className="w-32 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hourly Rate</th>}
                  {tableMode === 'variable' && (
                    <>
                      <th className="w-32 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Base Price</th>
                      <th className="w-32 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fuel Cost</th>
                      <th className="w-32 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Lubricant Cost</th>
                      <th className="w-32 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Calculated Rate</th>
                    </>
                  )}
                  {tableMode === 'database' && (
                    <>
                      <th className="w-32 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fuel Avg L/hr</th>
                      <th className="w-32 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Lube Avg L/hr</th>
                    </>
                  )}
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
                      <div className="text-sm font-medium text-gray-900 truncate">{eq.completeDescription || eq.description}</div>
                    </td>
                    {tableMode !== 'variable' && (
                      <td className="px-3 py-3 text-sm text-gray-500 truncate">
                        {eq.equipmentModel || '-'}
                      </td>
                    )}
                    {tableMode !== 'variable' && (
                      <td className="px-3 py-3 text-sm text-gray-500 truncate">
                        {eq.capacity || '-'}
                      </td>
                    )}
                    {tableMode === 'fixed' && (
                      <td className="px-3 py-3 text-right text-sm text-gray-900 whitespace-nowrap">
                        {renderRateValue(eq.hourlyRate, false, Boolean(eq.usingMasterRate))}
                      </td>
                    )}
                    {tableMode === 'variable' && (
                      <>
                        <td className="px-3 py-3 text-right text-sm text-gray-900 whitespace-nowrap">{renderRateValue(eq.basePrice, false, Boolean(eq.usingMasterRate))}</td>
                        <td className="px-3 py-3 text-right text-sm text-gray-900 whitespace-nowrap">{renderRateValue(eq.fuelCost)}</td>
                        <td className="px-3 py-3 text-right text-sm text-gray-900 whitespace-nowrap">{renderRateValue(eq.lubeCost)}</td>
                        <td className="px-3 py-3 text-right text-sm whitespace-nowrap">{renderRateValue(eq.calculatedRate ?? eq.basePrice, true, Boolean(eq.usingMasterRate))}</td>
                      </>
                    )}
                    {tableMode === 'database' && (
                      <>
                        <td className="px-3 py-3 text-right text-sm text-gray-700 whitespace-nowrap">
                          {formatLph(Number(eq.fuelConsumptionAvgLph || 0))}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-gray-700 whitespace-nowrap">
                          {formatLph(Number(eq.lubeConsumptionAvgLph || 0))}
                        </td>
                      </>
                    )}
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
