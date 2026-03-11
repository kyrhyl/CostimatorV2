'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CreateEstimateModal from '@/components/cost-estimates/CreateEstimateModal';

interface ProgramOfWorksTabProps {
  projectId: string;
  project: any;
}

export default function ProgramOfWorksTab({ projectId, project: _project }: ProgramOfWorksTabProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [estimateToDelete, setEstimateToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadEstimates();
  }, [projectId]);

  const loadEstimates = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/cost-estimates`);
      const data = await res.json();
      const estimatesList = data.data || data.estimates || [];
      setEstimates(estimatesList);
    } catch (err) {
      console.error('Failed to load estimates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEstimate = async (estimateId: string) => {
    setEstimateToDelete(estimateId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!estimateToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/cost-estimates/${estimateToDelete}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Remove from list
        setEstimates(estimates.filter(e => e._id !== estimateToDelete));
        
        alert('Program of Works deleted successfully');
      } else {
        const data = await res.json();
        alert('Failed to delete: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setEstimateToDelete(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSourceMeta = (estimate: any) => {
    const source = estimate?.boqSource;
    if (source === 'manual') {
      return { label: 'Manual BOQ', className: 'bg-amber-100 text-amber-800' };
    }
    if (source === 'projectBOQ') {
      return { label: 'Takeoff Linked', className: 'bg-blue-100 text-blue-800' };
    }
    if (source === 'takeoffVersion' || source === 'calcRun' || source === 'boqDatabase') {
      return { label: 'Takeoff Linked', className: 'bg-blue-100 text-blue-800' };
    }
    if (estimate?.takeoffVersionId) {
      return { label: 'Takeoff Linked', className: 'bg-blue-100 text-blue-800' };
    }
    return { label: 'Unknown Source', className: 'bg-gray-100 text-gray-700' };
  };

  const latestEstimate = useMemo(() => {
    if (estimates.length === 0) return null;
    return [...estimates].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })[0];
  }, [estimates]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-dpwh-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading Program of Works...</p>
        </div>
      </div>
    );
  }

  if (estimates.length === 0) {
    return (
      <div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Program of Works Yet
          </h3>
          <p className="text-gray-700 mb-6">
            Create your first cost estimate from a takeoff version to generate the Program of Works.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-dpwh-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-dpwh-blue-700 transition-all shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Program of Works
          </button>
        </div>

        {/* Create Estimate Modal */}
        {showCreateModal && (
          <CreateEstimateModal
            projectId={projectId}
            onClose={() => setShowCreateModal(false)}
            onSuccess={(result) => {
              setShowCreateModal(false);
              loadEstimates();
              if (result?.manualMode) {
                router.push(`/projects/${projectId}/program-of-works?section=manual-boq`);
              } else if (result?.estimateId) {
                router.push(`/projects/${projectId}/program-of-works?estimateId=${result.estimateId}&view=takeoff&section=overview`);
              }
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header with Actions */}
      <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Program of Works</h2>
          <p className="text-sm text-gray-600 mt-1">{estimates.length} estimate(s) available</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}/program-of-works`}
            className="inline-flex items-center gap-2 border border-dpwh-blue-200 text-dpwh-blue-700 bg-white px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5v2h6V5m4 4H5v10a2 2 0 002 2h10a2 2 0 002-2z" />
            </svg>
            Open Workspace
          </Link>
          <Link
            href={`/projects/${projectId}/pow-report`}
            className="inline-flex items-center gap-2 bg-dpwh-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-dpwh-blue-700 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h10" />
            </svg>
            Open POW Report
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-dpwh-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-dpwh-green-700 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Program of Works
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-gray-500">Total Estimates</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{estimates.length}</div>
          <div className="text-xs text-gray-500 mt-2">
            Combined Value {formatCurrency(estimates.reduce((sum, est) => sum + (est.costSummary?.grandTotal || 0), 0))}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-gray-500">Latest Estimate</div>
          <div className="text-lg font-semibold text-dpwh-green-700 mt-1">
            {latestEstimate ? formatCurrency(latestEstimate.costSummary?.grandTotal || 0) : 'N/A'}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {latestEstimate ? formatDate(latestEstimate.createdAt) : 'No estimates yet'}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-gray-500">Latest Status</div>
          <div className="mt-2">
            {latestEstimate ? (
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                latestEstimate.status === 'approved'
                  ? 'bg-dpwh-green-100 text-dpwh-green-800'
                  : latestEstimate.status === 'draft'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-dpwh-yellow-100 text-dpwh-yellow-800'
              }`}>
                {latestEstimate.status || 'draft'}
              </span>
            ) : (
              <span className="text-sm text-gray-500">N/A</span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {latestEstimate?.estimateNumber || 'No reference'}
          </div>
        </div>
      </div>

      {/* Estimates List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-dpwh-blue-700 text-white">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Estimate Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">CMPD Version</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Source</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Grand Total</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Items</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Status</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Date Created</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {estimates.map((estimate) => (
              <tr key={estimate._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Link
                    href={`/projects/${projectId}/pow-report`}
                    className="text-dpwh-blue-600 hover:text-dpwh-blue-800 font-medium text-left"
                  >
                    {estimate.name || estimate.estimateNumber || 'Untitled Estimate'}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {estimate.cmpdVersion || 'N/A'}
                </td>
                <td className="px-6 py-4 text-center">
                  {(() => {
                    const sourceMeta = getSourceMeta(estimate);
                    return (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${sourceMeta.className}`}>
                        {sourceMeta.label}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-6 py-4 text-sm text-right font-semibold text-dpwh-green-700">
                  {formatCurrency(estimate.costSummary?.grandTotal || 0)}
                </td>
                <td className="px-6 py-4 text-sm text-center text-gray-600">
                  {estimate.costSummary?.rateItemsCount || 0}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    estimate.status === 'approved'
                      ? 'bg-dpwh-green-100 text-dpwh-green-800'
                      : estimate.status === 'draft'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-dpwh-yellow-100 text-dpwh-yellow-800'
                  }`}>
                    {estimate.status || 'draft'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-center text-gray-600">
                  {formatDate(estimate.createdAt)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center gap-2">
                    <Link
                      href={`/projects/${projectId}/pow-report`}
                      className="text-dpwh-blue-600 hover:text-dpwh-blue-800 text-sm px-2 py-1 rounded hover:bg-blue-50"
                      title="Program of Works Report"
                    >
                      📄 POW Report
                    </Link>
                    <Link
                      href={`/projects/${projectId}/program-of-works?estimateId=${estimate._id}&view=takeoff&section=overview`}
                      className="text-dpwh-green-600 hover:text-dpwh-green-800 text-sm px-2 py-1 rounded hover:bg-green-50"
                      title="Edit this version in workspace"
                    >
                      ✏️ Edit in Workspace
                    </Link>
                    <button
                      onClick={() => handleDeleteEstimate(estimate._id)}
                      className="text-dpwh-red-600 hover:text-dpwh-red-800 text-sm px-2 py-1 rounded hover:bg-red-50"
                      title="Delete"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Total Estimates: <strong>{estimates.length}</strong></span>
            <span className="text-gray-600">
              Combined Value: <strong className="text-dpwh-green-700">
                {formatCurrency(estimates.reduce((sum, est) => sum + (est.costSummary?.grandTotal || 0), 0))}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Create Estimate Modal */}
      {showCreateModal && (
        <CreateEstimateModal
          projectId={projectId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(result) => {
            setShowCreateModal(false);
            loadEstimates();
            if (result?.manualMode) {
              router.push(`/projects/${projectId}/program-of-works?section=manual-boq`);
            } else if (result?.estimateId) {
              router.push(`/projects/${projectId}/program-of-works?estimateId=${result.estimateId}&view=takeoff&section=overview`);
            }
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this Program of Works? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setEstimateToDelete(null);
                }}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 bg-dpwh-red-600 text-white rounded-lg hover:bg-dpwh-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
