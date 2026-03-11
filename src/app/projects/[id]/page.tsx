'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import VersionStatusBadge from '@/components/versioning/VersionStatusBadge';
import EstimateList from '@/components/cost-estimates/EstimateList';
import CreateEstimateModal from '@/components/cost-estimates/CreateEstimateModal';
import TakeoffViewer from '@/components/takeoff/TakeoffViewer';
import BOQViewer from '@/components/takeoff/BOQViewer';
import CalcRunList from '@/components/takeoff/CalcRunList';
import ProgramOfWorksTab from './components/ProgramOfWorksTab';

interface Project {
  _id: string;
  projectName: string;
  projectLocation: string;
  district: string;
  cmpdVersion?: string;
  implementingOffice: string;
  appropriation: number;
  contractId?: string;
  projectType: string;
  powMode?: 'takeoff' | 'manual';
  status: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  haulingCostPerKm: number;
  distanceFromOffice: number;
  createdAt: string;
  updatedAt: string;
  // DPWH POW fields
  address?: string;
  targetStartDate?: string;
  targetCompletionDate?: string;
  contractDurationCD?: number;
  workingDays?: number;
  unworkableDays?: {
    sundays?: number;
    holidays?: number;
    rainyDays?: number;
  };
  fundSource?: {
    projectId?: string;
    fundingAgreement?: string;
    fundingOrganization?: string;
  };
  physicalTarget?: {
    infraType?: string;
    projectComponentId?: string;
    targetAmount?: number;
    unitOfMeasure?: string;
  };
  projectComponent?: {
    componentId?: string;
    infraId?: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
  };
  allotedAmount?: number;
  estimatedComponentCost?: number;
}

interface ProjectEstimate {
  _id: string;
  version: number;
  estimateType: 'preliminary' | 'detailed' | 'revised' | 'final';
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  grandTotal: number;
  totalItems: number;
  preparedBy?: string;
  preparedDate?: string;
  approvedBy?: string;
  approvedDate?: string;
  createdAt: string;
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'estimates' | 'takeoff'>('overview');
  const [activeTakeoffSubTab, setActiveTakeoffSubTab] = useState<'takeoff-report' | 'boq' | 'versions'>('takeoff-report');
  const [estimates, setEstimates] = useState<ProjectEstimate[]>([]);
  const [versionSummary, setVersionSummary] = useState<{
    activeTakeoffVersion?: { _id: string; versionNumber: number; versionLabel: string; status: string; createdAt: string; boqLineCount: number };
    activeCostEstimate?: { estimateNumber: string; grandTotal: number; cmpdVersion: string; status: string; createdAt: string };
    totalVersions: number;
    totalEstimates: number;
  } | null>(null);
  
  // New state for takeoff dashboard
  const [latestCalcRun, setLatestCalcRun] = useState<any>(null);
  const [loadingTakeoffData, setLoadingTakeoffData] = useState(false);
  
  // Program of Works modal
  const [showCreateEstimateModal, setShowCreateEstimateModal] = useState(false);
  const [selectedTakeoffVersionId, setSelectedTakeoffVersionId] = useState<string | null>(null);

  useEffect(() => {
    fetchProject();
    fetchVersionSummary();
  }, [id]);

  useEffect(() => {
    const syncTabFromUrl = () => {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (tabParam === 'overview' || tabParam === 'takeoff' || tabParam === 'estimates') {
        setActiveTab(tabParam);
      }
    };

    syncTabFromUrl();
    window.addEventListener('popstate', syncTabFromUrl);
    return () => window.removeEventListener('popstate', syncTabFromUrl);
  }, []);

  useEffect(() => {
    if (activeTab === 'estimates') {
      fetchEstimates();
    }
    if (activeTab === 'takeoff') {
      fetchLatestTakeoffData();
    }
  }, [activeTab, id]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setProject(result.data);
      } else {
        console.error('Failed to fetch project:', result.error);
      }
    } catch (error) {
      console.error('Failed to fetch project:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEstimates = async () => {
    try {
      const response = await fetch(`/api/projects/${id}/estimates`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setEstimates(result.data);
      } else {
        console.error('Failed to fetch estimates:', result.error);
      }
    } catch (error) {
      console.error('Failed to fetch estimates:', error);
    }
  };

  const fetchVersionSummary = async () => {
    try {
      // Fetch takeoff versions
      const versionsResponse = await fetch(`/api/projects/${id}/takeoff-versions`);
      const estimatesResponse = await fetch(`/api/projects/${id}/cost-estimates`);
      
      if (versionsResponse.ok && estimatesResponse.ok) {
        const versionsData = await versionsResponse.json();
        const estimatesData = await estimatesResponse.json();
        
        if (versionsData.success && estimatesData.success) {
          const versions = versionsData.data || [];
          const estimates = estimatesData.data || [];
          
          // Find active version (most recent approved or latest)
          const activeVersion = versions.find((v: any) => v.status === 'approved') || versions[0];
          
          // Find active estimate (most recent approved or latest)
          const activeEstimate = estimates.find((e: any) => e.status === 'approved') || estimates[0];
          
          setVersionSummary({
            activeTakeoffVersion: activeVersion ? {
              _id: activeVersion._id,
              versionNumber: activeVersion.versionNumber,
              versionLabel: activeVersion.versionLabel,
              status: activeVersion.status,
              createdAt: activeVersion.createdAt,
              boqLineCount: activeVersion.boqLines?.length || 0
            } : undefined,
            activeCostEstimate: activeEstimate ? {
              estimateNumber: activeEstimate.estimateNumber,
              grandTotal: activeEstimate.costSummary?.grandTotal || 0,
              cmpdVersion: activeEstimate.cmpdVersion,
              status: activeEstimate.status,
              createdAt: activeEstimate.createdAt
            } : undefined,
            totalVersions: versions.length,
            totalEstimates: estimates.length
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch version summary:', error);
    }
  };

  const fetchLatestTakeoffData = async () => {
    setLoadingTakeoffData(true);
    try {
      // Fetch latest calc run
      const calcRunRes = await fetch(`/api/projects/${id}/calcruns/latest`);
      if (calcRunRes.ok) {
        const calcRunData = await calcRunRes.json();
        const calcRun = calcRunData.data; // API returns { success: true, data: calcRun }
        setLatestCalcRun(calcRun);
      } else {
        setLatestCalcRun(null);
      }
    } catch (error) {
      console.error('Failed to fetch takeoff data:', error);
      setLatestCalcRun(null);
    } finally {
      setLoadingTakeoffData(false);
    }
  };

  const handleGenerateEstimate = async () => {
    if (!confirm('Generate a new program of works from current BOQ items?')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${id}/estimates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estimateType: 'detailed',
          preparedBy: 'User',
          notes: 'Generated from project BOQ',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        alert(result.message || 'Estimate generated successfully');
        fetchEstimates();
      } else {
        alert('Failed to generate estimate: ' + result.error);
      }
    } catch (error: any) {
      console.error('Failed to generate estimate:', error);
      alert('Failed to generate estimate: ' + error.message);
    }
  };

  const handleSubmitEstimate = async (version: number) => {
    if (!confirm(`Submit estimate version ${version} for approval?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${id}/estimates/${version}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preparedBy: 'User' }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        alert(result.message || 'Estimate submitted');
        fetchEstimates();
      } else {
        alert('Failed to submit estimate: ' + result.error);
      }
    } catch (error: any) {
      console.error('Failed to submit estimate:', error);
      alert('Failed to submit estimate: ' + error.message);
    }
  };

  const handleApproveEstimate = async (version: number) => {
    if (!confirm(`Approve estimate version ${version}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${id}/estimates/${version}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: 'Admin' }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        alert(result.message || 'Estimate approved');
        fetchEstimates();
      } else {
        alert('Failed to approve estimate: ' + result.error);
      }
    } catch (error: any) {
      console.error('Failed to approve estimate:', error);
      alert('Failed to approve estimate: ' + error.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete project "${project?.projectName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        router.push('/projects');
      } else {
        alert('Failed to delete project: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project');
    }
  };

  const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : 'N/A');
  const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString() : 'N/A');
  const formatCurrency = (value?: number) =>
    typeof value === 'number' ? `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : 'N/A';
  const formatNumber = (value?: number) => (typeof value === 'number' ? value.toLocaleString('en-PH') : 'N/A');
  const formatCoordinate = (value?: number) => (typeof value === 'number' ? value.toFixed(6) : 'N/A');
  const projectStatusClass =
    project?.status === 'Completed'
      ? 'bg-emerald-100 text-emerald-800'
      : project?.status === 'Ongoing'
      ? 'bg-blue-100 text-blue-800'
      : project?.status === 'Approved'
      ? 'bg-cyan-100 text-cyan-800'
      : project?.status === 'Cancelled'
      ? 'bg-red-100 text-red-800'
      : 'bg-slate-100 text-slate-800';
  const latitude = project?.projectComponent?.coordinates?.latitude;
  const longitude = project?.projectComponent?.coordinates?.longitude;
  const hasCoordinates = typeof latitude === 'number' && typeof longitude === 'number';
  const mapHref = hasCoordinates ? `https://www.google.com/maps?q=${latitude},${longitude}` : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Project not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/projects"
          className="text-blue-600 hover:text-blue-800 mb-2 inline-block"
        >
          ← Back to Projects
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{project.projectName}</h1>
            <p className="text-gray-600">{project.projectLocation}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/projects/${id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Edit Project
            </Link>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Project Overview
          </button>
          <button
            onClick={() => setActiveTab('takeoff')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'takeoff'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Quantity Takeoff
          </button>
          <button
            onClick={() => setActiveTab('estimates')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'estimates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Program of Works
            {estimates.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                {estimates.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-dpwh-blue-200 bg-gradient-to-br from-dpwh-blue-700 via-dpwh-blue-600 to-cyan-700 px-6 py-5 text-white shadow-lg">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-blue-100">Project Overview</p>
                <h2 className="mt-2 text-2xl font-bold leading-tight">{project.contractId || 'No Contract ID'} - {project.projectName}</h2>
                <p className="mt-2 text-sm text-blue-100">{project.projectType || 'Infrastructure Project'} • {project.projectLocation || 'No location set'}</p>
              </div>
              <div className="text-right">
                <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                  {project.powMode === 'manual' ? 'Manual POW' : 'Takeoff Linked'}
                </span>
                <div className="mt-2 text-xs text-blue-100">Last updated {formatDate(project.updatedAt)}</div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Allotted Amount</p>
              <p className="mt-2 text-2xl font-bold text-dpwh-blue-700">{formatCurrency(project.allotedAmount)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Target Duration</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(project.contractDurationCD)} Days</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Implementing Office</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{project.implementingOffice || 'N/A'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Project Status</p>
              <div className="mt-2">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${projectStatusClass}`}>
                  {project.status}
                </span>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Project Information</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 p-5 text-sm sm:grid-cols-2 xl:grid-cols-3">
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">Contract ID</p><p className="mt-1 font-semibold text-slate-900">{project.contractId || 'N/A'}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">Project Type</p><p className="mt-1 font-semibold text-slate-900">{project.projectType || 'N/A'}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">POW Mode</p><p className="mt-1 font-semibold capitalize text-slate-900">{project.powMode || 'takeoff'}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">Location</p><p className="mt-1 font-semibold text-slate-900">{project.projectLocation || 'N/A'}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">District</p><p className="mt-1 font-semibold text-slate-900">{project.district || 'N/A'}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">CMPD Version</p><p className="mt-1 font-semibold text-slate-900">{project.cmpdVersion || 'Latest'}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">Distance from Office</p><p className="mt-1 font-semibold text-slate-900">{formatNumber(project.distanceFromOffice)} km</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">Created</p><p className="mt-1 font-semibold text-slate-900">{formatDate(project.createdAt)}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">Updated</p><p className="mt-1 font-semibold text-slate-900">{formatDate(project.updatedAt)}</p></div>
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Project Timeline & Deliverables</h3>
                </div>
                <div className="space-y-5 p-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Target Start</p>
                      <p className="mt-1 text-base font-bold text-slate-900">{formatDate(project.targetStartDate)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Target Completion</p>
                      <p className="mt-1 text-base font-bold text-slate-900">{formatDate(project.targetCompletionDate)}</p>
                    </div>
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-blue-600">Contract Duration</p>
                      <p className="mt-1 text-base font-bold text-dpwh-blue-700">{formatNumber(project.contractDurationCD)} Days</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                    <div><p className="text-xs uppercase tracking-wide text-slate-500">Workable Days</p><p className="mt-1 font-semibold text-slate-900">{formatNumber(project.workingDays)}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-slate-500">Sundays</p><p className="mt-1 font-semibold text-slate-900">{formatNumber(project.unworkableDays?.sundays)}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-slate-500">Holidays</p><p className="mt-1 font-semibold text-slate-900">{formatNumber(project.unworkableDays?.holidays)}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-slate-500">Rainy Days</p><p className="mt-1 font-semibold text-slate-900">{formatNumber(project.unworkableDays?.rainyDays)}</p></div>
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Financial & Component Details</h3>
                </div>
                <div className="space-y-6 p-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-emerald-700">Allotted Amount</p>
                      <p className="mt-1 text-2xl font-bold text-emerald-700">{formatCurrency(project.allotedAmount)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Target Amount</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">{formatNumber(project.physicalTarget?.targetAmount)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                    <div><p className="text-xs uppercase tracking-wide text-slate-500">Component ID</p><p className="mt-1 font-semibold text-slate-900">{project.projectComponent?.componentId || 'N/A'}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-slate-500">Infra ID</p><p className="mt-1 font-semibold text-slate-900">{project.projectComponent?.infraId || 'N/A'}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-slate-500">Infra Type</p><p className="mt-1 font-semibold text-slate-900">{project.physicalTarget?.infraType || 'N/A'}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-slate-500">Unit of Measure</p><p className="mt-1 font-semibold text-slate-900">{project.physicalTarget?.unitOfMeasure || 'N/A'}</p></div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                    <div><p className="text-xs uppercase tracking-wide text-slate-500">Estimated Component Cost</p><p className="mt-1 font-semibold text-slate-900">{formatCurrency(project.estimatedComponentCost)}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-slate-500">Address</p><p className="mt-1 font-semibold text-slate-900">{project.address || 'N/A'}</p></div>
                  </div>
                </div>
              </section>

              {versionSummary && (versionSummary.totalVersions > 0 || versionSummary.totalEstimates > 0) && (
                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Version Summary</h3>
                  </div>
                  <div className="space-y-3 p-5">
                    <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                      <div className="rounded-md border border-slate-200 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-medium text-slate-700">Active Takeoff</span>
                          {versionSummary.activeTakeoffVersion && <VersionStatusBadge status={versionSummary.activeTakeoffVersion.status as any} />}
                        </div>
                        {versionSummary.activeTakeoffVersion ? (
                          <>
                            <div className="font-semibold text-slate-900">V{versionSummary.activeTakeoffVersion.versionNumber} - {versionSummary.activeTakeoffVersion.versionLabel}</div>
                            <div className="mt-1 text-xs text-slate-500">{versionSummary.activeTakeoffVersion.boqLineCount} BOQ items</div>
                          </>
                        ) : (
                          <div className="text-xs text-slate-500">No takeoff versions yet</div>
                        )}
                      </div>
                      <div className="rounded-md border border-slate-200 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-medium text-slate-700">Active Program of Works</span>
                          {versionSummary.activeCostEstimate && <VersionStatusBadge status={versionSummary.activeCostEstimate.status as any} />}
                        </div>
                        {versionSummary.activeCostEstimate ? (
                          <>
                            <div className="font-semibold text-slate-900">{versionSummary.activeCostEstimate.estimateNumber}</div>
                            <div className="mt-1 text-sm font-semibold text-emerald-700">₱{versionSummary.activeCostEstimate.grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                          </>
                        ) : (
                          <div className="text-xs text-slate-500">No program of works yet</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Total versions: {versionSummary.totalVersions} • Total estimates: {versionSummary.totalEstimates}</span>
                      <Link href={`/takeoff/${id}#versions`} className="font-medium text-blue-600 hover:text-blue-800">Manage Versions</Link>
                    </div>
                  </div>
                </section>
              )}

              {project.description && (
                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Description</h3>
                  </div>
                  <p className="whitespace-pre-wrap p-5 text-sm text-slate-700">{project.description}</p>
                </section>
              )}
            </div>

            <div className="space-y-6">
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Funding Information</h3>
                </div>
                <div className="space-y-4 p-5 text-sm">
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">Project ID</p><p className="mt-1 font-semibold text-slate-900">{project.fundSource?.projectId || 'N/A'}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">Funding Agreement</p><p className="mt-1 font-semibold text-slate-900">{project.fundSource?.fundingAgreement || 'N/A'}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">Funding Organization</p><p className="mt-1 font-semibold text-slate-900">{project.fundSource?.fundingOrganization || 'N/A'}</p></div>
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Site Location</h3>
                </div>
                <div className="space-y-4 p-5 text-sm">
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Map Coordinates</p>
                    <p className="mt-2 font-mono text-slate-900">{formatCoordinate(latitude)}, {formatCoordinate(longitude)}</p>
                    {mapHref ? (
                      <a href={mapHref} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-md bg-dpwh-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-dpwh-blue-700">
                        Open in Maps
                      </a>
                    ) : (
                      <p className="mt-2 text-xs text-slate-500">Coordinates not set</p>
                    )}
                  </div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">Full Address</p><p className="mt-1 font-semibold text-slate-900">{project.address || 'N/A'}</p></div>
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Activity Audit</h3>
                </div>
                <div className="space-y-4 p-5">
                  <div className="flex gap-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">Project last updated</p>
                      <p className="text-[11px] text-slate-500">{formatDateTime(project.updatedAt)}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-300"></span>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">Project created</p>
                      <p className="text-[11px] text-slate-500">{formatDateTime(project.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'takeoff' && (
        <div className="space-y-6">
          {/* Sub-tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-2" aria-label="Takeoff sub-tabs">
              <button
                onClick={() => setActiveTakeoffSubTab('takeoff-report')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTakeoffSubTab === 'takeoff-report'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>📐</span>
                  <span>Takeoff Report</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTakeoffSubTab('boq')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTakeoffSubTab === 'boq'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>📋</span>
                  <span>Bill of Quantities</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTakeoffSubTab('versions')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTakeoffSubTab === 'versions'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>🕐</span>
                  <span>Version History</span>
                </span>
              </button>
            </nav>
          </div>

          {/* Sub-tab Content */}
          <div>
            {/* Takeoff Report Sub-tab */}
            {activeTakeoffSubTab === 'takeoff-report' && (
              <>
                {loadingTakeoffData ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600">Loading takeoff data...</p>
                  </div>
                ) : !latestCalcRun ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-12 text-center">
                    <div className="text-6xl mb-4">📐</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Generate Your First Takeoff
                    </h3>
                    <div className="text-left max-w-2xl mx-auto mb-6 space-y-3">
                      <p className="text-gray-700 font-medium">Follow these steps to get started:</p>
                      <ol className="list-decimal list-inside space-y-2 text-gray-600">
                        <li>Set up your Grid System (coordinate reference)</li>
                        <li>Define Floor Levels (vertical organization)</li>
                        <li>Create Element Templates (columns, beams, slabs, etc.)</li>
                        <li>Place Element Instances on your levels</li>
                        <li>Generate Takeoff (return to this tab to view results)</li>
                      </ol>
                    </div>
                    <Link
                      href={`/takeoff/${id}`}
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Open Advanced Workspace
                    </Link>
                  </div>
                ) : (
                  <TakeoffViewer
                    projectId={id}
                    latestCalcRun={latestCalcRun}
                    onTakeoffGenerated={async () => {
                      await fetchLatestTakeoffData();
                    }}
                  />
                )}
              </>
            )}

            {/* BOQ Sub-tab */}
            {activeTakeoffSubTab === 'boq' && (
              <>
                {loadingTakeoffData ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600">Loading BOQ data...</p>
                  </div>
                ) : !latestCalcRun ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-12 text-center">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No Takeoff Data Available
                    </h3>
                    <p className="text-gray-600 mb-6">
                      You must generate a takeoff first before creating a Bill of Quantities.
                    </p>
                    <button
                      onClick={() => setActiveTakeoffSubTab('takeoff-report')}
                      className="inline-flex items-center gap-2 bg-yellow-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-yellow-700 transition-all shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Go to Takeoff Report Tab
                    </button>
                  </div>
                ) : (
                  <BOQViewer
                    projectId={id}
                    takeoffLines={latestCalcRun.takeoffLines || []}
                  />
                )}
              </>
            )}

            {/* Version History Sub-tab */}
            {activeTakeoffSubTab === 'versions' && (
              <CalcRunList projectId={id} />
            )}
          </div>

          {/* Advanced Workspace Link Card */}
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">🏗️</div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Need Advanced Features?
                </h4>
                <p className="text-gray-600 mb-4">
                  The Advanced Workspace provides 3D modeling tools, element libraries, grid systems, 
                  and interactive quantity calculations for complex takeoff scenarios.
                </p>
                <Link
                  href={`/takeoff/${id}`}
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  Open Advanced Workspace
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'estimates' && (
        <ProgramOfWorksTab projectId={id} project={project} />
      )}
      
      {showCreateEstimateModal && (
        <CreateEstimateModal
          projectId={id}
          takeoffVersionId={selectedTakeoffVersionId || undefined}
          onClose={() => {
            setShowCreateEstimateModal(false);
            setSelectedTakeoffVersionId(null);
          }}
          onSuccess={(result) => {
            setShowCreateEstimateModal(false);
            setSelectedTakeoffVersionId(null);
            if (result?.manualMode) {
              router.push(`/projects/${id}/program-of-works?section=manual-boq`);
            } else if (result?.estimateId) {
              router.push(`/projects/${id}/program-of-works?estimateId=${result.estimateId}&view=takeoff&section=overview`);
            }
          }}
        />
      )}
    </div>
  );
}
