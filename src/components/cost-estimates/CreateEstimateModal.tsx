'use client';

import { useState, useEffect } from 'react';

interface CreateEstimateModalProps {
  projectId: string;
  takeoffVersionId?: string; // Optional - if not provided, uses latest CalcRun
  onClose: () => void;
  onSuccess: (result: { estimateId?: string | null; manualMode?: boolean }) => void;
}

interface LaborRate {
  _id: string;
  location: string;
  effectiveDate: string;
}

interface TakeoffVersion {
  _id: string;
  versionNumber: string;
  versionName: string;
  status: string;
  createdAt: string;
}

export default function CreateEstimateModal({
  projectId,
  takeoffVersionId,
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
  const [takeoffVersions, setTakeoffVersions] = useState<TakeoffVersion[]>([]);
  const [loadingTakeoffVersions, setLoadingTakeoffVersions] = useState(true);
  const [boqSourceInfo, setBoqSourceInfo] = useState({ hasProjectBOQ: false, itemCount: 0 });
  const [loadingBoqInfo, setLoadingBoqInfo] = useState(true);
  const [pendingEstimateId, setPendingEstimateId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    boqSource: 'boqDatabase', // Default to BOQ Database (NEW)
    takeoffVersionId: takeoffVersionId || '', // Specific version if provided
    location: '',
    district: '',
    cmpdVersion: '',
    vatPercentage: 12,
  });

  useEffect(() => {
    loadLocations();
    loadCmpdVersions();
    loadTakeoffVersions();
    loadBoqInfo();
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
      
      if (data.success && data.versions) {
        setCmpdVersions(data.versions);
      }
    } catch (err) {
      console.error('Failed to load CMPD versions:', err);
    } finally {
      setLoadingCmpdVersions(false);
    }
  };

  const loadTakeoffVersions = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/takeoff-versions`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setTakeoffVersions(data.data);
      }
    } catch (err) {
      console.error('Failed to load takeoff versions:', err);
    } finally {
      setLoadingTakeoffVersions(false);
    }
  };

  const loadBoqInfo = async () => {
    try {
      // Check new BOQ database
      const response = await fetch(`/api/projects/${projectId}/boq/save`);
      const data = await response.json();
      
      if (data.success) {
        const latest = data.versions && data.versions[0];
        setBoqSourceInfo({
          hasProjectBOQ: data.hasBoq,
          itemCount: latest?.itemCount || 0
        });
      }
    } catch (err) {
      console.error('Failed to load BOQ info:', err);
    } finally {
      setLoadingBoqInfo(false);
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
        vatPercentage: formData.vatPercentage,
        boqSource: formData.boqSource, // Tell API which source to use
      };

      // Only include takeoffVersionId if user selected a specific version
      if (formData.boqSource === 'takeoffVersion' && formData.takeoffVersionId) {
        payload.takeoffVersionId = formData.takeoffVersionId;
      }

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

          <div>
            <label className="block text-sm font-medium mb-1">
              BOQ Source <span className="text-red-500">*</span>
            </label>
            {loadingBoqInfo ? (
              <div className="w-full border rounded px-3 py-2 text-gray-400">
                Loading BOQ sources...
              </div>
            ) : (
              <select
                required
                value={formData.boqSource}
                onChange={(e) => setFormData({ ...formData, boqSource: e.target.value, takeoffVersionId: '' })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="boqDatabase">
                  BOQ Database (from Takeoff) {boqSourceInfo.hasProjectBOQ ? `(${boqSourceInfo.itemCount} items)` : '(Empty)'}
                </option>
                <option value="takeoffVersion">Takeoff Version Snapshot</option>
                <option value="calcRun">Latest Calculation Run (Legacy)</option>
                <option value="manual">Manual BOQ Input</option>
              </select>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {formData.boqSource === 'boqDatabase' && 'Uses persistent BOQ database from takeoff (recommended)'}
              {formData.boqSource === 'takeoffVersion' && 'Uses specific takeoff version snapshot'}
              {formData.boqSource === 'calcRun' && 'Uses latest calculation run (fallback)'}
              {formData.boqSource === 'manual' && 'Set up manual Program of Works entries from DUPA templates'}
            </p>
          </div>

          {formData.boqSource === 'takeoffVersion' && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Select Takeoff Version <span className="text-red-500">*</span>
              </label>
              {loadingTakeoffVersions ? (
                <div className="w-full border rounded px-3 py-2 text-gray-400">
                  Loading versions...
                </div>
              ) : takeoffVersions.length === 0 ? (
                <div className="text-sm text-red-600 p-2 bg-red-50 rounded">
                  No takeoff versions found. Please create a takeoff version first.
                </div>
              ) : (
                <select
                  required
                  value={formData.takeoffVersionId}
                  onChange={(e) => setFormData({ ...formData, takeoffVersionId: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Select version...</option>
                  {takeoffVersions.map((version) => (
                    <option key={version._id} value={version._id}>
                      v{version.versionNumber} - {version.versionName} ({version.status})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

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
