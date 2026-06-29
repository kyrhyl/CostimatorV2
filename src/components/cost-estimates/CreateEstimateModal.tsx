'use client';

import { useState, useEffect } from 'react';

interface CreateEstimateModalProps {
  projectId: string;
  onClose: () => void;
  onSuccess: (result: { estimateId?: string | null; manualMode?: boolean }) => void;
}

interface LaborRate {
  _id: string;
  location: string;
  effectiveDate: string;
}

interface LaborVersionOption {
  laborVersion: string;
  status: string;
}

interface AcelEditionResponse {
  success: boolean;
  data?: string[];
  editions?: string[];
}

export default function CreateEstimateModal({
  projectId,
  onClose,
  onSuccess,
}: CreateEstimateModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unmappedLines, setUnmappedLines] = useState<string[]>([]);
  const [missingMaterialPrices, setMissingMaterialPrices] = useState<
    { materialCode: string; description: string; unit: string }[]
  >([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [cmpdVersions, setCmpdVersions] = useState<string[]>([]);
  const [loadingCmpdVersions, setLoadingCmpdVersions] = useState(true);
  const [acelEditions, setAcelEditions] = useState<string[]>([]);
  const [loadingAcelEditions, setLoadingAcelEditions] = useState(true);
  const [laborVersions, setLaborVersions] = useState<LaborVersionOption[]>([]);
  const [loadingLaborVersions, setLoadingLaborVersions] = useState(true);
  const [pendingEstimateId, setPendingEstimateId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    district: '',
    cmpdVersion: '',
    equipmentRateEdition: '',
    laborVersion: '',
    vatPercentage: 12,
  });

  useEffect(() => {
    loadLocations();
    loadCmpdVersions();
    loadAcelEditions();
    loadLaborVersions();
  }, []);

  const loadLocations = async () => {
    try {
      const response = await fetch('/api/master/labor');
      const data = await response.json();
      
      if (data.success && data.data) {
        // Extract unique locations from labor rates
        const uniqueLocations = [...new Set(data.data.map((rate: LaborRate) => rate.location))];
        setLocations(uniqueLocations as string[]);
      }
    } catch (err) {
      console.error('Failed to load locations:', err);
    } finally {
      setLoadingLocations(false);
    }
  };

  const loadCmpdVersions = async () => {
    try {
      const response = await fetch('/api/master/materials/prices/versions');
      const data = await response.json();

      const versions = Array.isArray(data.versions)
        ? data.versions
        : Array.isArray(data.data)
          ? data.data
          : [];

      if (data.success) {
        setCmpdVersions(versions);
        if (versions.length > 0) {
          setFormData((prev) => ({
            ...prev,
            cmpdVersion: prev.cmpdVersion || versions[0],
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load CMPD versions:', err);
    } finally {
      setLoadingCmpdVersions(false);
    }
  };

  const loadLaborVersions = async () => {
    try {
      const response = await fetch('/api/master/labor/versions');
      const data = await response.json();
      if (data.success && Array.isArray(data.versions)) {
        const filtered = data.versions
          .filter((entry: LaborVersionOption) => entry.laborVersion && entry.laborVersion !== 'UNVERSIONED')
          .sort((a: LaborVersionOption, b: LaborVersionOption) => b.laborVersion.localeCompare(a.laborVersion));
        setLaborVersions(filtered);
        if (filtered.length > 0) {
          setFormData((prev) => ({ ...prev, laborVersion: prev.laborVersion || filtered[0].laborVersion }));
        }
      }
    } catch (err) {
      console.error('Failed to load labor versions:', err);
    } finally {
      setLoadingLaborVersions(false);
    }
  };

  const loadAcelEditions = async () => {
    try {
      const response = await fetch('/api/master/equipment/rates/editions');
      const data: AcelEditionResponse = await response.json();
      const editions = Array.isArray(data.editions)
        ? data.editions
        : Array.isArray(data.data)
          ? data.data
          : [];

      if (data.success) {
        setAcelEditions(editions);
        if (editions.length > 0) {
          setFormData((prev) => ({
            ...prev,
            equipmentRateEdition: prev.equipmentRateEdition || editions[0],
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load ACEL editions:', err);
    } finally {
      setLoadingAcelEditions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setUnmappedLines([]);
    setMissingMaterialPrices([]);
    setPendingEstimateId(null);

    try {
      const payload: any = {
        name: formData.name,
        location: formData.location,
        district: formData.district,
        cmpdVersion: formData.cmpdVersion,
        equipmentRateEdition: formData.equipmentRateEdition,
        laborVersion: formData.laborVersion,
        vatPercentage: formData.vatPercentage,
        boqSource: 'manual',
      };

      const response = await fetch(`/api/projects/${projectId}/cost-estimates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create estimate');
      }

      if (data.manualMode) {
        onSuccess({ manualMode: true });
        return;
      }

      const hasUnmappedLines = Array.isArray(data.unmappedLines) && data.unmappedLines.length > 0;
      const hasMissingPrices = Array.isArray(data.missingMaterialPrices) && data.missingMaterialPrices.length > 0;
      const newEstimateId = (data.data && data.data._id) || data.estimateId || null;

      if (hasUnmappedLines) {
        setUnmappedLines(data.unmappedLines);
      }

      if (hasMissingPrices) {
        setMissingMaterialPrices(data.missingMaterialPrices);
      }

      if (!hasUnmappedLines && !hasMissingPrices) {
        onSuccess({ estimateId: newEstimateId });
      } else {
        setPendingEstimateId(newEstimateId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAnyway = () => {
    if (pendingEstimateId) {
      onSuccess({ estimateId: pendingEstimateId });
    } else {
      onSuccess({ estimateId: undefined });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Create Cost Estimate</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {unmappedLines.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
            <p className="font-semibold">Warning: Some BOQ lines have no DUPA templates:</p>
            <ul className="list-disc ml-6 mt-2">
              {unmappedLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <button
              onClick={handleContinueAnyway}
              className="mt-3 bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
            >
              Continue Anyway
            </button>
          </div>
        )}

        {missingMaterialPrices.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
            <p className="font-semibold">Warning: Missing CMPD prices (set to zero):</p>
            <p className="text-sm mt-1">Add canvass prices before final approval.</p>
            <ul className="list-disc ml-6 mt-2">
              {missingMaterialPrices.map((item) => (
                <li key={`${item.materialCode}-${item.description}`}>
                  {item.materialCode} - {item.description} ({item.unit})
                </li>
              ))}
            </ul>
            <button
              onClick={handleContinueAnyway}
              className="mt-3 bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
            >
              Continue Anyway
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Estimate Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., V1 - Initial Estimate"
            />
          </div>

          <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            This project uses the manual Program of Works workflow. After setup, you will add BOQ entries directly from DUPA templates and current master data.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Location <span className="text-red-500">*</span>
              </label>
              {loadingLocations ? (
                <div className="w-full border rounded px-3 py-2 text-gray-400">
                  Loading locations...
                </div>
              ) : locations.length === 0 ? (
                <div className="text-sm text-red-600 p-2 bg-red-50 rounded">
                  No labor rates found. Please add labor rates first.
                </div>
              ) : (
                <select
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Select location...</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">District</label>
              <input
                type="text"
                required
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., NCR"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              CMPD Version <span className="text-red-500">*</span>
            </label>
            {loadingCmpdVersions ? (
              <div className="w-full border rounded px-3 py-2 text-gray-400">
                Loading CMPD versions...
              </div>
              ) : cmpdVersions.length === 0 ? (
                <div className="text-sm text-yellow-600 p-2 bg-yellow-50 rounded">
                  No CMPD versions found. Materials without CMPD or canvass prices will be zero-priced.
                </div>
            ) : (
              <select
                required
                value={formData.cmpdVersion}
                onChange={(e) => setFormData({ ...formData, cmpdVersion: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select CMPD version...</option>
                {cmpdVersions.map((version) => (
                  <option key={version} value={version}>
                    {version}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">ACEL Edition (Equipment Rates)</label>
            {loadingAcelEditions ? (
              <div className="w-full border rounded px-3 py-2 text-gray-400">
                Loading ACEL editions...
              </div>
            ) : acelEditions.length === 0 ? (
              <div className="text-sm text-yellow-600 p-2 bg-yellow-50 rounded">
                No ACEL editions found. Equipment pricing will fall back to the master equipment hourly rates.
              </div>
            ) : (
              <select
                value={formData.equipmentRateEdition}
                onChange={(e) => setFormData({ ...formData, equipmentRateEdition: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Use master equipment rates</option>
                {acelEditions.map((edition) => (
                  <option key={edition} value={edition}>
                    {edition}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Labor Version (Quarter)</label>
            {loadingLaborVersions ? (
              <div className="w-full border rounded px-3 py-2 text-gray-400">Loading labor versions...</div>
            ) : (
              <select
                value={formData.laborVersion}
                onChange={(e) => setFormData({ ...formData, laborVersion: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Latest published</option>
                {laborVersions.map((version) => (
                  <option key={version.laborVersion} value={version.laborVersion}>
                    {version.laborVersion} ({version.status})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
            <p className="text-blue-800 font-medium mb-1">Automatic Markup Calculation</p>
            <p className="text-blue-700 text-xs">
              OCM and CP percentages will be automatically determined based on the total project cost according to DPWH regulations.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">VAT %</label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.vatPercentage}
                onChange={(e) => setFormData({ ...formData, vatPercentage: parseFloat(e.target.value) })}
                className="w-full border rounded px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">Default: 12% (Philippine tax law)</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || loadingLocations || locations.length === 0 || loadingCmpdVersions}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Estimate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
