'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import VersionStatusBadge from '@/components/versioning/VersionStatusBadge';
import CreateEstimateModal from '@/components/cost-estimates/CreateEstimateModal';
import { fetchJsonDedup } from '@/lib/utils/fetch-json-dedup';

const ProgramOfWorksTab = dynamic(() => import('./components/ProgramOfWorksTab'), {
  loading: () => <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading program of works...</div>,
});

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
  const { data: session } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'estimates'>('overview');
  const [estimates, setEstimates] = useState<ProjectEstimate[]>([]);
  const [versionSummary, setVersionSummary] = useState<{
    activeCostEstimate?: { estimateNumber: string; grandTotal: number; cmpdVersion: string; status: string; createdAt: string };
    totalEstimates: number;
  } | null>(null);
  const [showCreateEstimateModal, setShowCreateEstimateModal] = useState(false);

  useEffect(() => {
    fetchProject();
    fetchVersionSummary();
  }, [id]);

  useEffect(() => {
    const syncTabFromUrl = () => {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (tabParam === 'overview' || tabParam === 'estimates') {
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
  }, [activeTab, id]);

  const fetchProject = async () => {
    try {
      const { res: response, data: result } = await fetchJsonDedup(`/api/projects/${id}`, `project:${id}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

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
      const { res: response, data: result } = await fetchJsonDedup(`/api/projects/${id}/estimates`, `project-estimates:${id}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

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
      const estimatesResult = await fetchJsonDedup(`/api/projects/${id}/cost-estimates`, `cost-estimates:${id}`);

      if (estimatesResult.res.ok) {
        const estimatesData = estimatesResult.data;
        if (estimatesData.success) {
          const estimateRows = estimatesData.data || [];
          const activeEstimate = estimateRows.find((e: any) => e.status === 'approved') || estimateRows[0];

          setVersionSummary({
            activeCostEstimate: activeEstimate
              ? {
                  estimateNumber: activeEstimate.estimateNumber,
                  grandTotal: activeEstimate.costSummary?.grandTotal || 0,
                  cmpdVersion: activeEstimate.cmpdVersion,
                  status: activeEstimate.status,
                  createdAt: activeEstimate.createdAt,
                }
              : undefined,
            totalEstimates: estimateRows.length,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch version summary:', error);
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
  const roles = session?.user?.roles || [];
  const canEditProject = roles.includes('project_creator') || roles.includes('admin') || roles.includes('master_admin');
  const canDeleteProject = roles.includes('admin') || roles.includes('master_admin');
  const canCreatePow = roles.includes('project_creator') || roles.includes('admin') || roles.includes('master_admin');

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
      <div className="mb-6">
        <Link href="/projects" className="text-blue-600 hover:text-blue-800 mb-2 inline-block">
          ← Back to Projects
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{project.projectName}</h1>
            <p className="text-gray-600">{project.projectLocation}</p>
          </div>
          {activeTab === 'overview' && canEditProject ? (
            <div className="flex gap-2">
              <Link href={`/projects/${id}/edit`} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Edit Project
              </Link>
              {canDeleteProject && (
                <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                  Delete
                </button>
              )}
            </div>
          ) : activeTab === 'estimates' && canCreatePow ? (
            <button
              onClick={() => setShowCreateEstimateModal(true)}
              className="inline-flex items-center gap-2 bg-dpwh-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-dpwh-green-700 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Program of Works
            </button>
          ) : null}
        </div>
      </div>

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
            onClick={() => setActiveTab('estimates')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'estimates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Program of Works
            {estimates.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">{estimates.length}</span>
            )}
          </button>
        </nav>
      </div>

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
                  Manual Program of Works
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
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">POW Mode</p><p className="mt-1 font-semibold capitalize text-slate-900">manual</p></div>
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

              {versionSummary && versionSummary.totalEstimates > 0 && (
                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Version Summary</h3>
                  </div>
                  <div className="space-y-3 p-5">
                    <div className="rounded-md border border-slate-200 p-3 text-sm">
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
                    <div className="text-xs text-slate-500">Total Program of Works versions: {versionSummary.totalEstimates}</div>
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

      {activeTab === 'estimates' && <ProgramOfWorksTab projectId={id} project={project} />}

      {showCreateEstimateModal && (
        <CreateEstimateModal
          projectId={id}
          onClose={() => {
            setShowCreateEstimateModal(false);
          }}
          onSuccess={(result) => {
            setShowCreateEstimateModal(false);
            if (result?.estimateId) {
              router.push(`/projects/${id}/program-of-works?estimateId=${result.estimateId}&section=overview`);
            } else {
              router.push(`/projects/${id}/program-of-works?section=manual-boq`);
            }
          }}
        />
      )}
    </div>
  );
}
