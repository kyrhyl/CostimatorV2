'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const STATUS_OPTIONS = ['Planning', 'Approved', 'Ongoing', 'Completed', 'Cancelled'];
const PROJECT_TYPES = [
  'Road Construction',
  'Bridge Construction',
  'Building Construction',
  'Flood Control',
  'Drainage System',
  'Other Infrastructure'
];

interface LaborRate {
  _id: string;
  location: string;
  district?: string;
}

function formatCurrencyInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, '');
  if (!cleaned) return '';

  const [intPartRaw, ...decParts] = cleaned.split('.');
  const intPart = intPartRaw.replace(/^0+(?=\d)/, '') || '0';
  const formattedInt = Number(intPart).toLocaleString('en-US');
  const decPart = decParts.join('').slice(0, 2);

  return decParts.length > 0 ? `${formattedInt}.${decPart}` : formattedInt;
}

function parseCurrencyInput(value: string): number | undefined {
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locations, setLocations] = useState<LaborRate[]>([]);
  const [cmpdVersions, setCmpdVersions] = useState<string[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Form fields
  const [projectName, setProjectName] = useState('');
  const [projectLocation, setProjectLocation] = useState('');
  const [district, setDistrict] = useState('Bukidnon 1st District');
  const [cmpdVersion, setCmpdVersion] = useState('');
  const [implementingOffice, setImplementingOffice] = useState('');
  const [appropriation, setAppropriation] = useState('');
  const [contractId, setContractId] = useState('');
  const [projectType, setProjectType] = useState('Road Construction');
  const [powMode, setPowMode] = useState<'takeoff' | 'manual'>('takeoff');
  const [status, setStatus] = useState('Planning');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [distanceFromOffice, setDistanceFromOffice] = useState(0);

  // DPWH Program of Works fields
  const [address, setAddress] = useState('');
  const [targetStartDate, setTargetStartDate] = useState('');
  const [targetCompletionDate, setTargetCompletionDate] = useState('');
  const [contractDurationCD, setContractDurationCD] = useState('');
  const [workingDays, setWorkingDays] = useState('');
  const [unworkableDaysSundays, setUnworkableDaysSundays] = useState('');
  const [unworkableDaysHolidays, setUnworkableDaysHolidays] = useState('');
  const [unworkableDaysRainyDays, setUnworkableDaysRainyDays] = useState('');
  const [fundSourceProjectId, setFundSourceProjectId] = useState('');
  const [fundSourceFundingAgreement, setFundSourceFundingAgreement] = useState('');
  const [fundSourceFundingOrganization, setFundSourceFundingOrganization] = useState('');
  const [physicalTargetInfraType, setPhysicalTargetInfraType] = useState('');
  const [physicalTargetProjectComponentId, setPhysicalTargetProjectComponentId] = useState('');
  const [physicalTargetTargetAmount, setPhysicalTargetTargetAmount] = useState('');
  const [physicalTargetUnitOfMeasure, setPhysicalTargetUnitOfMeasure] = useState('');
  const [projectComponentComponentId, setProjectComponentComponentId] = useState('');
  const [projectComponentInfraId, setProjectComponentInfraId] = useState('');
  const [projectComponentLatitude, setProjectComponentLatitude] = useState('');
  const [projectComponentLongitude, setProjectComponentLongitude] = useState('');
  const [allotedAmount, setAllotedAmount] = useState('');
  const [estimatedComponentCost, setEstimatedComponentCost] = useState('');

  const fetchLocations = useCallback(async () => {
    try {
      const response = await fetch('/api/master/labor');
      const result = await response.json();
      if (result.success) {
        setLocations(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    }
  }, []);

  const fetchCmpdVersions = useCallback(async (districtValue: string) => {
    setLoadingVersions(true);
    try {
      const response = await fetch(`/api/master/materials/prices/versions?district=${encodeURIComponent(districtValue)}`);
      const result = await response.json();
      if (result.success) {
        setCmpdVersions(result.versions || []);
      }
    } catch (error) {
      console.error('Failed to fetch CMPD versions:', error);
      setCmpdVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  }, []);

  const fetchProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${id}`);
      const result = await response.json();

      if (result.success) {
        const project = result.data;
        setProjectName(project.projectName || '');
        setProjectLocation(project.projectLocation || '');
        setDistrict(project.district || 'Bukidnon 1st District');
        setCmpdVersion(project.cmpdVersion || '');
        setImplementingOffice(project.implementingOffice || '');
        setAppropriation(formatCurrencyInput(project.appropriation?.toString() || ''));
        setContractId(project.contractId || '');
        setProjectType(project.projectType || 'Road Construction');
        setPowMode(project.powMode || 'takeoff');
        setStatus(project.status || 'Planning');
        setDescription(project.description || '');
        setDistanceFromOffice(project.distanceFromOffice || 0);

        // Format dates for input fields
        if (project.startDate) {
          setStartDate(new Date(project.startDate).toISOString().split('T')[0]);
        }
        if (project.endDate) {
          setEndDate(new Date(project.endDate).toISOString().split('T')[0]);
        }

        // DPWH POW fields
        setAddress(project.address || '');
        if (project.targetStartDate) {
          setTargetStartDate(new Date(project.targetStartDate).toISOString().split('T')[0]);
        }
        if (project.targetCompletionDate) {
          setTargetCompletionDate(new Date(project.targetCompletionDate).toISOString().split('T')[0]);
        }
        setContractDurationCD(project.contractDurationCD?.toString() || '');
        setWorkingDays(project.workingDays?.toString() || '');
        setUnworkableDaysSundays((project.unworkableDays as any)?.sundays?.toString() || '');
        setUnworkableDaysHolidays((project.unworkableDays as any)?.holidays?.toString() || '');
        setUnworkableDaysRainyDays((project.unworkableDays as any)?.rainyDays?.toString() || '');
        setFundSourceProjectId((project.fundSource as any)?.projectId || '');
        setFundSourceFundingAgreement((project.fundSource as any)?.fundingAgreement || '');
        setFundSourceFundingOrganization((project.fundSource as any)?.fundingOrganization || '');
        setPhysicalTargetInfraType((project.physicalTarget as any)?.infraType || '');
        setPhysicalTargetProjectComponentId((project.physicalTarget as any)?.projectComponentId || '');
        setPhysicalTargetTargetAmount((project.physicalTarget as any)?.targetAmount?.toString() || '');
        setPhysicalTargetUnitOfMeasure((project.physicalTarget as any)?.unitOfMeasure || '');
        setProjectComponentComponentId((project.projectComponent as any)?.componentId || '');
        setProjectComponentInfraId((project.projectComponent as any)?.infraId || '');
        setProjectComponentLatitude((project.projectComponent as any)?.coordinates?.latitude?.toString() || '');
        setProjectComponentLongitude((project.projectComponent as any)?.coordinates?.longitude?.toString() || '');
        setAllotedAmount(formatCurrencyInput(project.allotedAmount?.toString() || ''));
        setEstimatedComponentCost(formatCurrencyInput(project.estimatedComponentCost?.toString() || ''));

        // Fetch CMPD versions for the project's district
        if (project.district) {
          fetchCmpdVersions(project.district);
        }
      } else {
        setError(result.error || 'Failed to load project');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [id, fetchCmpdVersions]);

  useEffect(() => {
    fetchLocations();
    if (id) {
      fetchProject();
    }
  }, [id, fetchProject, fetchLocations]);

  // Reload CMPD versions when district changes manually
  useEffect(() => {
    if (district && !loading) {
      fetchCmpdVersions(district);
    }
  }, [district, loading, fetchCmpdVersions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const projectData = {
      projectName,
      projectLocation,
      district,
      cmpdVersion,
      implementingOffice,
      appropriation: parseCurrencyInput(appropriation),
      contractId,
      projectType,
      powMode,
      status,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      description,
      distanceFromOffice,
      // DPWH POW fields
      address,
      targetStartDate: targetStartDate || undefined,
      targetCompletionDate: targetCompletionDate || undefined,
      contractDurationCD: contractDurationCD ? parseFloat(contractDurationCD) : undefined,
      workingDays: workingDays ? parseInt(workingDays) : undefined,
      unworkableDays: {
        sundays: unworkableDaysSundays ? parseInt(unworkableDaysSundays) : 0,
        holidays: unworkableDaysHolidays ? parseInt(unworkableDaysHolidays) : 0,
        rainyDays: unworkableDaysRainyDays ? parseInt(unworkableDaysRainyDays) : 0,
      },
      fundSource: {
        projectId: fundSourceProjectId || undefined,
        fundingAgreement: fundSourceFundingAgreement || undefined,
        fundingOrganization: fundSourceFundingOrganization || undefined,
      },
      physicalTarget: {
        infraType: physicalTargetInfraType || undefined,
        projectComponentId: physicalTargetProjectComponentId || undefined,
        targetAmount: physicalTargetTargetAmount ? parseFloat(physicalTargetTargetAmount) : undefined,
        unitOfMeasure: physicalTargetUnitOfMeasure || undefined,
      },
      projectComponent: {
        componentId: projectComponentComponentId || undefined,
        infraId: projectComponentInfraId || undefined,
        coordinates: {
          latitude: projectComponentLatitude ? parseFloat(projectComponentLatitude) : undefined,
          longitude: projectComponentLongitude ? parseFloat(projectComponentLongitude) : undefined,
        },
      },
      allotedAmount: parseCurrencyInput(allotedAmount),
      estimatedComponentCost: parseCurrencyInput(estimatedComponentCost),
    };

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });

      const raw = await response.text();
      let result: any = null;

      if (raw) {
        try {
          result = JSON.parse(raw);
        } catch {
          result = null;
        }
      }

      if (!response.ok) {
        throw new Error(result?.error || raw || `Request failed (${response.status})`);
      }

      if (result?.success) {
        router.push(`/projects/${id}`);
      } else {
        setError(result?.error || 'Failed to update project');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error && !projectName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Project</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/projects"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Link href="/projects" className="hover:text-blue-600">Projects</Link>
            <span>/</span>
            <Link href={`/projects/${id}`} className="hover:text-blue-600">{projectName || 'Project'}</Link>
            <span>/</span>
            <span className="text-gray-900">Edit</span>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Edit Project</h1>
              <p className="text-gray-600">
                Update project details and configuration
              </p>
            </div>
            <Link
              href={`/projects/${id}`}
              className="text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancel
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Project Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Rehabilitation of Barangay Road"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Location <span className="text-red-500">*</span>
                </label>
                {locations.length === 0 ? (
                  <div>
                    <input
                      type="text"
                      required
                      value={projectLocation}
                      onChange={(e) => setProjectLocation(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter location (e.g., Malaybalay City)"
                    />
                    <p className="text-xs text-amber-600 mt-1">
                      No labor rate locations found. Enter manually or add locations in Master Data.
                    </p>
                  </div>
                ) : (
                  <select
                    required
                    value={projectLocation}
                    onChange={(e) => setProjectLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a location</option>
                    {locations.map((loc) => (
                      <option key={loc._id} value={loc.location}>
                        {loc.location} {loc.district && `(${loc.district})`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  District
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Bukidnon 1st District"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CMPD Version
                </label>
                {loadingVersions ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-500">
                    Loading versions...
                  </div>
                ) : cmpdVersions.length === 0 ? (
                  <div>
                    <input
                      type="text"
                      value={cmpdVersion}
                      onChange={(e) => setCmpdVersion(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., CMPD-2024-Q1"
                    />
                    <p className="text-xs text-orange-500 mt-1">
                      No CMPD versions found for this district. You can enter manually or leave blank to use latest prices.
                    </p>
                  </div>
                ) : (
                  <select
                    value={cmpdVersion}
                    onChange={(e) => setCmpdVersion(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">-- Use Latest --</option>
                    {cmpdVersions.map((version) => (
                      <option key={version} value={version}>
                        {version}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Select the CMPD (Construction Materials Price Data) version for material pricing
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Implementing Office
                </label>
                <input
                  type="text"
                  value={implementingOffice}
                  onChange={(e) => setImplementingOffice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., DPWH Bukidnon 1st DEO"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Appropriation
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={appropriation}
                  onChange={(e) => setAppropriation(formatCurrencyInput(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract ID
                </label>
                <input
                  type="text"
                  value={contractId}
                  onChange={(e) => setContractId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., DPWH-BUK-2024-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Type
                </label>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {PROJECT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Program of Works Mode
                </label>
                <select
                  value={powMode}
                  onChange={(e) => setPowMode(e.target.value as 'takeoff' | 'manual')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="takeoff">Takeoff Linked</option>
                  <option value="manual">Manual BOQ Input</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select “Manual BOQ Input” when the Program of Works will be prepared independently of quantity takeoff.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Distance from Office (km)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={distanceFromOffice}
                  onChange={(e) => setDistanceFromOffice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Project description, scope, and objectives"
                />
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">DPWH Project Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Sitio Tagilanao, Malaybalay City, Bukidnon"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Start Date</label>
                <input
                  type="date"
                  value={targetStartDate}
                  onChange={(e) => setTargetStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Completion Date</label>
                <input
                  type="date"
                  value={targetCompletionDate}
                  onChange={(e) => setTargetCompletionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contract Duration (CD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={contractDurationCD}
                  onChange={(e) => setContractDurationCD(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">No. of Workable Days</label>
                <input
                  type="number"
                  value={workingDays}
                  onChange={(e) => setWorkingDays(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unworkable Days - Sundays</label>
                <input
                  type="number"
                  value={unworkableDaysSundays}
                  onChange={(e) => setUnworkableDaysSundays(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unworkable Days - Holidays</label>
                <input
                  type="number"
                  value={unworkableDaysHolidays}
                  onChange={(e) => setUnworkableDaysHolidays(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unworkable Days - Rainy Days</label>
                <input
                  type="number"
                  value={unworkableDaysRainyDays}
                  onChange={(e) => setUnworkableDaysRainyDays(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Fund Source</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
                <input
                  type="text"
                  value={fundSourceProjectId}
                  onChange={(e) => setFundSourceProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 2025-BEFF-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Funding Agreement</label>
                <input
                  type="text"
                  value={fundSourceFundingAgreement}
                  onChange={(e) => setFundSourceFundingAgreement(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., (BEFF) FY 2025"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Funding Organization</label>
                <input
                  type="text"
                  value={fundSourceFundingOrganization}
                  onChange={(e) => setFundSourceFundingOrganization(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., National Treasury"
                />
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Physical Target</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Infra Type</label>
                <input
                  type="text"
                  value={physicalTargetInfraType}
                  onChange={(e) => setPhysicalTargetInfraType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Local"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Component ID</label>
                <input
                  type="text"
                  value={physicalTargetProjectComponentId}
                  onChange={(e) => setPhysicalTargetProjectComponentId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., CW1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={physicalTargetTargetAmount}
                  onChange={(e) => setPhysicalTargetTargetAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measure</label>
                <input
                  type="text"
                  value={physicalTargetUnitOfMeasure}
                  onChange={(e) => setPhysicalTargetUnitOfMeasure(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., No. of Storey"
                />
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Financial & Component Details</h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Component ID</label>
                  <input
                    type="text"
                    value={projectComponentComponentId}
                    onChange={(e) => setProjectComponentComponentId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 22"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Infra ID</label>
                  <input
                    type="text"
                    value={projectComponentInfraId}
                    onChange={(e) => setProjectComponentInfraId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 212"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={projectComponentLatitude}
                    onChange={(e) => setProjectComponentLatitude(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.000000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={projectComponentLongitude}
                    onChange={(e) => setProjectComponentLongitude(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.000000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Allotted Amount (₱)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={allotedAmount}
                    onChange={(e) => setAllotedAmount(formatCurrencyInput(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Component Cost (₱)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={estimatedComponentCost}
                    onChange={(e) => setEstimatedComponentCost(formatCurrencyInput(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <Link
              href={`/projects/${id}`}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Updating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
