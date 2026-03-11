'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

export default function NewProjectPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState<LaborRate[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
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
  const [haulingCostPerKm, setHaulingCostPerKm] = useState(0);
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
  const [activePOWTab, setActivePOWTab] = useState<'projectDetails' | 'fundSource' | 'physicalTarget' | 'financial'>('projectDetails');

  useEffect(() => {
    fetchLocations();
  }, []);

  // Fetch CMPD versions when district changes
  useEffect(() => {
    if (district) {
      fetchCmpdVersions(district);
    }
  }, [district]);

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/master/labor');
      const result = await response.json();
      if (result.success) {
        setLocations(result.data);
        // Set first location as default if available
        if (result.data.length > 0) {
          setProjectLocation(result.data[0].location);
        }
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchCmpdVersions = async (districtValue: string) => {
    setLoadingVersions(true);
    try {
      const response = await fetch(`/api/master/materials/prices/versions?district=${encodeURIComponent(districtValue)}`);
      const result = await response.json();
      if (result.success) {
        setCmpdVersions(result.versions || []);
        // Auto-select the latest version if available
        if (result.versions && result.versions.length > 0) {
          setCmpdVersion(result.versions[0]);
        } else {
          setCmpdVersion('');
        }
      }
    } catch (error) {
      console.error('Failed to fetch CMPD versions:', error);
      setCmpdVersions([]);
      setCmpdVersion('');
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const projectData = {
      projectName,
      projectLocation,
      district,
      cmpdVersion,
      implementingOffice,
      appropriation: appropriation ? parseFloat(appropriation) : undefined,
      contractId,
      projectType,
      powMode,
      status,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      description,
      haulingCostPerKm,
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
      allotedAmount: allotedAmount ? parseFloat(allotedAmount) : undefined,
      estimatedComponentCost: estimatedComponentCost ? parseFloat(estimatedComponentCost) : undefined,
    };

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });

      const result = await response.json();

      if (result.success) {
        // Redirect to project detail page to add BOQ items
        router.push(`/projects/${result.data._id}`);
      } else {
        alert('Failed to create project: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Create New Project</h1>
        <p className="text-gray-600">
          Enter project details. You'll add BOQ items on the next screen.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Project Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name *
              </label>
              <input
                type="text"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., Rehabilitation of Barangay Road"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Location *
              </label>
              {loadingLocations ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-500">
                  Loading locations...
                </div>
              ) : locations.length === 0 ? (
                <div>
                  <input
                    type="text"
                    required
                    value={projectLocation}
                    onChange={(e) => setProjectLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Cabangasan"
                  />
                  <p className="text-xs text-red-500 mt-1">
                    No labor rates found. Please add labor rates first or enter location manually.
                  </p>
                </div>
              ) : (
                <select
                  required
                  value={projectLocation}
                  onChange={(e) => setProjectLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">-- Select Location --</option>
                  {locations.map((loc) => (
                    <option key={loc._id} value={loc.location}>
                      {loc.location} {loc.district && `(${loc.district})`}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-gray-500 mt-1">
                This location will be used for labor rates and material prices
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                District
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., DPWH Bukidnon DEO"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Appropriation
              </label>
              <input
                type="text"
                value={appropriation}
                onChange={(e) => setAppropriation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., FY 2025 GAA"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Type
              </label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="takeoff">Takeoff Linked</option>
                <option value="manual">Manual BOQ Input</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Choose “Manual BOQ Input” for projects where Program of Works entries will be encoded directly from DUPA templates.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Optional project description"
              />
            </div>
          </div>
        </div>

        {/* Material Hauling Cost */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Material Hauling Cost</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Distance from Office (km)
              </label>
              <input
                type="number"
                value={distanceFromOffice}
                onChange={(e) => setDistanceFromOffice(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="0.0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Distance from your office to the project site
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hauling Cost per Km (₱)
              </label>
              <input
                type="number"
                value={haulingCostPerKm}
                onChange={(e) => setHaulingCostPerKm(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Cost per kilometer for material delivery
              </p>
            </div>
          </div>
          {distanceFromOffice > 0 && haulingCostPerKm > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Total Hauling Cost:</strong> ₱{(distanceFromOffice * haulingCostPerKm).toLocaleString('en-PH', { minimumFractionDigits: 2 })} per unit
              </p>
              <p className="text-xs text-blue-600 mt-1">
                This amount will be added to each material's base price when calculating DUPA
              </p>
            </div>
          )}
        </div>

        {/* DPWH Program of Works Settings */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">DPWH Program of Works Details</h2>
          </div>
          
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-4">
            <nav className="flex space-x-6" aria-label="DPWH POW tabs">
              <button
                onClick={() => setActivePOWTab('projectDetails')}
                className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                  activePOWTab === 'projectDetails'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Project Details
              </button>
              <button
                onClick={() => setActivePOWTab('fundSource')}
                className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                  activePOWTab === 'fundSource'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Fund Source
              </button>
              <button
                onClick={() => setActivePOWTab('physicalTarget')}
                className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                  activePOWTab === 'physicalTarget'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Physical Target
              </button>
              <button
                onClick={() => setActivePOWTab('financial')}
                className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                  activePOWTab === 'financial'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Financial
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="mt-4">
            {/* Project Details Tab */}
            {activePOWTab === 'projectDetails' && (
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
            )}

            {/* Fund Source Tab */}
            {activePOWTab === 'fundSource' && (
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
            )}

            {/* Physical Target Tab */}
            {activePOWTab === 'physicalTarget' && (
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
            )}

            {/* Financial Tab */}
            {activePOWTab === 'financial' && (
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
                      type="number"
                      step="0.01"
                      value={allotedAmount}
                      onChange={(e) => setAllotedAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Component Cost (₱)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={estimatedComponentCost}
                      onChange={(e) => setEstimatedComponentCost(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
          >
            {saving ? 'Creating...' : 'Create Project & Add BOQ'}
          </button>
        </div>
      </form>
    </div>
  );
}
