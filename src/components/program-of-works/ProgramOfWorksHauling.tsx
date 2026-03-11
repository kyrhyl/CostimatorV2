'use client';

import { useEffect, useMemo, useState } from 'react';
import { computeHaulingCost } from '@/lib/calc/hauling';

interface RouteSegment {
  terrain: string;
  distanceKm: number;
  speedUnloadedKmh: number;
  speedLoadedKmh: number;
}

interface ProjectHaulingConfig {
  materialName?: string;
  materialSource?: string;
  totalDistance?: number;
  freeHaulingDistance?: number;
  routeSegments?: RouteSegment[];
  equipmentCapacity?: number;
  equipmentRentalRate?: number;
}

interface ProgramOfWorksHaulingProps {
  projectId: string;
  powMode?: 'takeoff' | 'manual';
  activeEstimateId?: string;
  onEstimateRepriced?: (estimateId: string) => void;
  project: {
    distanceFromOffice?: number;
    haulingConfig?: ProjectHaulingConfig | null;
  } | null;
}

const defaultSegments: RouteSegment[] = [
  {
    terrain: 'Level Road',
    distanceKm: 0,
    speedUnloadedKmh: 40,
    speedLoadedKmh: 30,
  },
  {
    terrain: 'Rolling Terrain',
    distanceKm: 0,
    speedUnloadedKmh: 30,
    speedLoadedKmh: 20,
  },
  {
    terrain: 'Mountainous Terrain',
    distanceKm: 0,
    speedUnloadedKmh: 20,
    speedLoadedKmh: 15,
  },
];

export default function ProgramOfWorksHauling({
  projectId,
  powMode,
  activeEstimateId,
  onEstimateRepriced,
  project,
}: ProgramOfWorksHaulingProps) {
  const [materialName, setMaterialName] = useState('Aggregates');
  const [materialSource, setMaterialSource] = useState('');
  const [totalDistance, setTotalDistance] = useState(0);
  const [freeHaulingDistance, setFreeHaulingDistance] = useState(3);
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>(defaultSegments);
  const [equipmentCapacity, setEquipmentCapacity] = useState(10);
  const [equipmentRentalRate, setEquipmentRentalRate] = useState(1420);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [repricingEstimate, setRepricingEstimate] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isRouteOpen, setIsRouteOpen] = useState(false);
  const [isEquipmentOpen, setIsEquipmentOpen] = useState(false);
  const [baselineConfig, setBaselineConfig] = useState('');

  useEffect(() => {
    const config = project?.haulingConfig;
    const nextConfig = {
      materialName: config?.materialName || 'Aggregates',
      materialSource: config?.materialSource || '',
      totalDistance: typeof config?.totalDistance === 'number' ? config.totalDistance : 0,
      freeHaulingDistance: typeof config?.freeHaulingDistance === 'number' ? config.freeHaulingDistance : 3,
      routeSegments: config?.routeSegments?.length
        ? config.routeSegments.map((segment) => ({ ...segment }))
        : defaultSegments.map((segment) => ({ ...segment })),
      equipmentCapacity: typeof config?.equipmentCapacity === 'number' ? config.equipmentCapacity : 10,
      equipmentRentalRate: typeof config?.equipmentRentalRate === 'number' ? config.equipmentRentalRate : 1420,
    };

    setMaterialName(nextConfig.materialName);
    setMaterialSource(nextConfig.materialSource);
    setTotalDistance(nextConfig.totalDistance);
    setFreeHaulingDistance(nextConfig.freeHaulingDistance);
    setRouteSegments(nextConfig.routeSegments);
    setEquipmentCapacity(nextConfig.equipmentCapacity);
    setEquipmentRentalRate(nextConfig.equipmentRentalRate);
    setBaselineConfig(JSON.stringify(nextConfig));
  }, [project]);

  const currentConfig = useMemo(
    () => ({
      materialName,
      materialSource,
      totalDistance,
      freeHaulingDistance,
      routeSegments,
      equipmentCapacity,
      equipmentRentalRate,
    }),
    [materialName, materialSource, totalDistance, freeHaulingDistance, routeSegments, equipmentCapacity, equipmentRentalRate],
  );

  const dirty = baselineConfig !== '' && JSON.stringify(currentConfig) !== baselineConfig;

  const haulingResult = useMemo(() => {
    if (!routeSegments.length || totalDistance <= 0 || equipmentCapacity <= 0 || equipmentRentalRate <= 0) {
      return null;
    }

    return computeHaulingCost({
      totalDistanceKm: totalDistance,
      freeHaulingDistanceKm: freeHaulingDistance,
      routeSegments: routeSegments.map((segment) => ({
        distanceKm: segment.distanceKm,
        speedUnloadedKmh: segment.speedUnloadedKmh,
        speedLoadedKmh: segment.speedLoadedKmh,
      })),
      equipmentHourlyRatePhp: equipmentRentalRate,
      equipmentCapacityCuM: equipmentCapacity,
    });
  }, [routeSegments, totalDistance, freeHaulingDistance, equipmentCapacity, equipmentRentalRate]);

  const chargeableDistance = Math.max(totalDistance - freeHaulingDistance, 0);

  const updateSegment = (index: number, patch: Partial<RouteSegment>) => {
    const updated = [...routeSegments];
    updated[index] = { ...updated[index], ...patch };
    setRouteSegments(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        haulingConfig: {
          ...currentConfig,
        },
      };

      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save hauling configuration');
      }

      setMessage('Hauling configuration saved.');
      setBaselineConfig(JSON.stringify(currentConfig));
    } catch (error: any) {
      setMessage(error.message || 'Failed to save hauling configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = async () => {
    if (!confirm('Recalculate all BOQ items with current hauling configuration? This will update material costs using the latest hauling computation.')) {
      return;
    }

    setRecalculating(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/boq/recalculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to recalculate BOQ costs');
      }

      setMessage(`Recalculated ${data.updatedCount || 0} BOQ item(s).`);
    } catch (error: any) {
      setMessage(error.message || 'Failed to recalculate BOQ costs.');
    } finally {
      setRecalculating(false);
    }
  };

  const handleRepriceEstimate = async () => {
    if (!activeEstimateId) {
      setMessage('Select an estimate first before repricing.');
      return;
    }

    setRepricingEstimate(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/cost-estimates/${activeEstimateId}/reprice`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reprice estimate');
      }

      const newEstimateId = data?.data?._id as string | undefined;
      if (newEstimateId && onEstimateRepriced) {
        onEstimateRepriced(newEstimateId);
      }

      setMessage(data.message || 'Created a repriced estimate version.');
    } catch (error: any) {
      setMessage(error.message || 'Failed to reprice estimate.');
    } finally {
      setRepricingEstimate(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">DPWH Hauling Cost Computation</h2>
            <p className="text-sm text-gray-600">Compact setup for hauling assumptions and repricing actions.</p>
          </div>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${dirty ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
            {dirty ? 'Unsaved changes' : 'Saved'}
          </span>
        </div>

        {project?.distanceFromOffice === 0 && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Project distance from office is not set. Provide total hauling distance to avoid zero hauling result.
          </div>
        )}

        {message && (
          <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">{message}</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] gap-4">
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Material and Distance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Material</label>
                <input
                  type="text"
                  value={materialName}
                  onChange={(e) => setMaterialName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="e.g., Sand & Gravel"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Material Source</label>
                <input
                  type="text"
                  value={materialSource}
                  onChange={(e) => setMaterialSource(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="e.g., Quarry location"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Total Distance (km)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalDistance}
                  onChange={(e) => setTotalDistance(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Free Distance (km)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={freeHaulingDistance}
                  onChange={(e) => setFreeHaulingDistance(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Chargeable Distance (km)</label>
                <input
                  type="text"
                  value={chargeableDistance.toFixed(2)}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-700"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <button
              type="button"
              onClick={() => setIsRouteOpen((prev) => !prev)}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-800"
            >
              <span>Route Breakdown</span>
              <span>{isRouteOpen ? 'Hide' : 'Show'}</span>
            </button>
            {isRouteOpen && (
              <div className="space-y-3 mt-3">
                {routeSegments.map((segment, index) => (
                  <div key={segment.terrain} className="rounded-md border border-gray-100 p-3">
                    <p className="text-xs font-semibold text-gray-700 mb-2">{segment.terrain}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={segment.distanceKm}
                        onChange={(e) => updateSegment(index, { distanceKm: parseFloat(e.target.value) || 0 })}
                        className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                        placeholder="Distance km"
                      />
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={segment.speedUnloadedKmh}
                        onChange={(e) => updateSegment(index, { speedUnloadedKmh: parseFloat(e.target.value) || 0 })}
                        className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                        placeholder="Unloaded km/hr"
                      />
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={segment.speedLoadedKmh}
                        onChange={(e) => updateSegment(index, { speedLoadedKmh: parseFloat(e.target.value) || 0 })}
                        className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                        placeholder="Loaded km/hr"
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Unloaded: {(segment.distanceKm / (segment.speedUnloadedKmh || 1)).toFixed(3)} hr • Loaded: {(segment.distanceKm / (segment.speedLoadedKmh || 1)).toFixed(3)} hr
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <button
              type="button"
              onClick={() => setIsEquipmentOpen((prev) => !prev)}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-800"
            >
              <span>Dump Truck Configuration</span>
              <span>{isEquipmentOpen ? 'Hide' : 'Show'}</span>
            </button>
            {isEquipmentOpen && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Capacity (cu.m.)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={equipmentCapacity}
                    onChange={(e) => setEquipmentCapacity(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Rental Rate per Hour (PHP)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={equipmentRentalRate}
                    onChange={(e) => setEquipmentRentalRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 h-fit">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="text-xs uppercase text-blue-700">Cost per Cu.M.</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">
              ₱{(haulingResult?.costPerCuMPhp || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 text-sm text-blue-900">
              <div>
                <div className="text-xs text-blue-700">Chargeable Distance</div>
                <div className="font-semibold">{haulingResult?.chargeableDistanceKm?.toFixed(2) || '0.00'} km</div>
              </div>
              <div>
                <div className="text-xs text-blue-700">Cycle Time</div>
                <div className="font-semibold">{haulingResult?.cycleTimeHr?.toFixed(2) || '0.00'} hr</div>
              </div>
              <div>
                <div className="text-xs text-blue-700">Cost per Trip</div>
                <div className="font-semibold">₱{(haulingResult?.costPerTripPhp || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
              </div>
              <div>
                <div className="text-xs text-blue-700">Delay Allowance</div>
                <div className="font-semibold">{haulingResult?.delayAllowanceHr?.toFixed(2) || '0.00'} hr</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 space-y-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 bg-dpwh-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-dpwh-blue-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
            {powMode === 'manual' && (
              <button
                onClick={handleRecalculate}
                disabled={recalculating}
                className="w-full inline-flex items-center justify-center gap-2 bg-dpwh-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-dpwh-green-700 disabled:opacity-60"
              >
                {recalculating ? 'Recalculating...' : 'Recalculate BOQ Costs'}
              </button>
            )}
            {powMode !== 'manual' && (
              <button
                onClick={handleRepriceEstimate}
                disabled={repricingEstimate || !activeEstimateId}
                className="w-full inline-flex items-center justify-center gap-2 bg-dpwh-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-dpwh-blue-700 disabled:opacity-60"
              >
                {repricingEstimate ? 'Repricing Estimate...' : 'Reprice Current Estimate'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
