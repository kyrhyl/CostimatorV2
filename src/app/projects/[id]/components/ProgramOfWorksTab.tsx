'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import CreateEstimateModal from '@/components/cost-estimates/CreateEstimateModal';

interface ProgramOfWorksTabProps {
  projectId: string;
  project: any;
}

export default function ProgramOfWorksTab({ projectId, project }: ProgramOfWorksTabProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [estimateToDelete, setEstimateToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [duplicatingEstimateId, setDuplicatingEstimateId] = useState<string | null>(null);
  const [renamingEstimateId, setRenamingEstimateId] = useState<string | null>(null);
  const [taggingFinalEstimateId, setTaggingFinalEstimateId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
        setNotice({ type: 'success', message: 'Program of Works deleted successfully.' });
      } else {
        const data = await res.json();
        setNotice({ type: 'error', message: `Failed to delete: ${data.error || 'Unknown error'}` });
      }
    } catch (err: any) {
      setNotice({ type: 'error', message: `Failed to delete: ${err.message}` });
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

  const handleDuplicateEstimate = async (estimate: any) => {
    const estimateId = String(estimate?._id || '');
    if (!estimateId) return;

    setDuplicatingEstimateId(estimateId);
    try {
      const res = await fetch(`/api/cost-estimates/${estimateId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copyAdjustments: true }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to duplicate estimate');
      }

      const duplicatedEstimate = data?.data;
      const duplicatedId = duplicatedEstimate?._id;
      const copiedAdjustments = Number(data?.copiedAdjustments || 0);
      setNotice({
        type: 'success',
        message: copiedAdjustments > 0
          ? `Version duplicated with ${copiedAdjustments} copied adjustment(s).`
          : 'Version duplicated successfully.',
      });

      await loadEstimates();

      if (duplicatedId) {
        if (isTakeoffLinkedEstimate(duplicatedEstimate)) {
          router.push(`/projects/${projectId}/program-of-works?estimateId=${duplicatedId}&view=takeoff&section=overview`);
        } else {
          router.push(`/projects/${projectId}/program-of-works?section=manual-boq`);
        }
      }
    } catch (err: any) {
      setNotice({ type: 'error', message: `Failed to duplicate: ${err.message}` });
    } finally {
      setDuplicatingEstimateId(null);
    }
  };

  const handleRenameEstimate = async (estimate: any) => {
    const estimateId = String(estimate?._id || '');
    if (!estimateId) return;

    const currentName = String(estimate?.name || estimate?.estimateName || estimate?.estimateNumber || 'Untitled Estimate');
    const nextName = window.prompt('Rename Program of Works version:', currentName);

    if (nextName === null) return;
    const trimmed = nextName.trim();
    if (!trimmed) {
      setNotice({ type: 'error', message: 'Version name cannot be empty.' });
      return;
    }
    if (trimmed === currentName) return;

    setRenamingEstimateId(estimateId);
    try {
      const res = await fetch(`/api/cost-estimates/${estimateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimateName: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to rename version');
      }

      setEstimates((prev) => prev.map((row) => (
        row._id === estimateId
          ? { ...row, name: trimmed, estimateName: trimmed }
          : row
      )));
      setNotice({ type: 'success', message: 'Version renamed successfully.' });
    } catch (err: any) {
      setNotice({ type: 'error', message: `Failed to rename: ${err.message}` });
    } finally {
      setRenamingEstimateId(null);
    }
  };

  const handleTagAsFinal = async (estimate: any) => {
    const estimateId = String(estimate?._id || '');
    if (!estimateId) return;

    setTaggingFinalEstimateId(estimateId);
    try {
      const res = await fetch(`/api/cost-estimates/${estimateId}/tag-final`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to tag final version');
      }

      await loadEstimates();
      setNotice({ type: 'success', message: 'Version tagged as final submission.' });
    } catch (err: any) {
      setNotice({ type: 'error', message: `Failed to tag final: ${err.message}` });
    } finally {
      setTaggingFinalEstimateId(null);
    }
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

  const isTakeoffLinkedEstimate = (estimate: any) => {
    const source = estimate?.boqSource;
    return (
      source === 'projectBOQ' ||
      source === 'takeoffVersion' ||
      source === 'calcRun' ||
      source === 'boqDatabase' ||
      Boolean(estimate?.takeoffVersionId)
    );
  };

  const getPowReportHref = (estimate: any) => {
    const estimateId = String(estimate?._id || '').trim();
    if (!estimateId) {
      return `/projects/${projectId}/pow-report`;
    }
    return `/projects/${projectId}/pow-report?mode=takeoff&estimateId=${estimateId}`;
  };

  const isManualPow = project?.powMode === 'manual';
  const roles = session?.user?.roles || [];
  const canModifyPow = roles.includes('project_creator') || roles.includes('admin') || roles.includes('master_admin');

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
          {canModifyPow ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-dpwh-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-dpwh-blue-700 transition-all shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Program of Works
            </button>
          ) : (
            <p className="text-sm text-slate-600">Your account is read-only and cannot create Program of Works versions.</p>
          )}
        </div>

        {/* Create Estimate Modal */}
        {showCreateModal && canModifyPow && (
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
      {notice && (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
          <div className="flex items-start justify-between gap-4">
            <p>{notice.message}</p>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-xs font-semibold opacity-80 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Estimates List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-dpwh-blue-700 text-white">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold">Estimate</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">CMPD</th>
              <th className="px-3 py-2 text-center text-xs font-semibold">Source</th>
              <th className="px-3 py-2 text-right text-xs font-semibold">Total</th>
              <th className="px-3 py-2 text-center text-xs font-semibold">Items</th>
              <th className="px-3 py-2 text-center text-xs font-semibold">Status</th>
              <th className="px-3 py-2 text-center text-xs font-semibold">Created</th>
              <th className="px-3 py-2 text-center text-xs font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {estimates.map((estimate) => (
              <tr key={estimate._id} className="hover:bg-gray-50">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Link
                      href={getPowReportHref(estimate)}
                      className="text-dpwh-blue-600 hover:text-dpwh-blue-800 font-medium text-left text-sm"
                    >
                      {estimate.name || estimate.estimateNumber || 'Untitled Estimate'}
                    </Link>
                    {estimate.isFinalSubmission && (
                      <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                        Final Submission
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-600">
                  {estimate.cmpdVersion || 'N/A'}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {(() => {
                    const sourceMeta = getSourceMeta(estimate);
                    return (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${sourceMeta.className}`}>
                        {sourceMeta.label}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-3 py-2.5 text-xs text-right font-semibold text-dpwh-green-700 whitespace-nowrap">
                  {formatCurrency(estimate.costSummary?.grandTotal || 0)}
                </td>
                <td className="px-3 py-2.5 text-xs text-center text-gray-600">
                  {estimate.costSummary?.rateItemsCount || 0}
                </td>
                <td className="px-3 py-2.5 text-center">
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
                <td className="px-3 py-2.5 text-xs text-center text-gray-600 whitespace-nowrap">
                  {formatDate(estimate.createdAt)}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    <Link
                      href={getPowReportHref(estimate)}
                      className="inline-flex items-center whitespace-nowrap leading-5 text-dpwh-blue-600 hover:text-dpwh-blue-800 text-xs px-1.5 py-1 rounded hover:bg-blue-50"
                      title="Program of Works Report"
                    >
                      POW Report
                    </Link>
                    <Link
                      href={`/projects/${projectId}/pow-audit?estimateId=${estimate._id}`}
                      className="inline-flex items-center whitespace-nowrap leading-5 text-slate-700 hover:text-slate-900 text-xs px-1.5 py-1 rounded hover:bg-slate-100"
                      title="Audit this version"
                    >
                      Audit Review
                    </Link>
                    {!canModifyPow && (
                      <Link
                        href={
                          isTakeoffLinkedEstimate(estimate)
                            ? `/projects/${projectId}/program-of-works?estimateId=${estimate._id}&view=takeoff&section=overview`
                            : `/projects/${projectId}/program-of-works?section=manual-boq`
                        }
                        className="inline-flex items-center whitespace-nowrap leading-5 text-dpwh-green-700 hover:text-dpwh-green-900 text-xs px-1.5 py-1 rounded hover:bg-green-50"
                        title="View workspace"
                      >
                        View Workspace
                      </Link>
                    )}
                    {canModifyPow && (
                      <>
                        <Link
                          href={
                            isTakeoffLinkedEstimate(estimate)
                              ? `/projects/${projectId}/program-of-works?estimateId=${estimate._id}&view=takeoff&section=overview`
                              : isManualPow
                              ? `/projects/${projectId}/program-of-works?section=manual-boq`
                              : `/projects/${projectId}/program-of-works?estimateId=${estimate._id}&view=takeoff&section=overview`
                          }
                          className="inline-flex items-center whitespace-nowrap leading-5 text-dpwh-green-600 hover:text-dpwh-green-800 text-xs px-1.5 py-1 rounded hover:bg-green-50"
                          title={isTakeoffLinkedEstimate(estimate) ? 'Edit this version in workspace' : 'Open manual BOQ workspace'}
                        >
                          Edit Workspace
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDuplicateEstimate(estimate)}
                          disabled={duplicatingEstimateId === estimate._id}
                          className="inline-flex items-center whitespace-nowrap leading-5 text-indigo-600 hover:text-indigo-800 text-xs px-1.5 py-1 rounded hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Duplicate this version"
                        >
                          {duplicatingEstimateId === estimate._id ? 'Duplicating...' : 'Duplicate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRenameEstimate(estimate)}
                          disabled={renamingEstimateId === estimate._id}
                          className="inline-flex items-center whitespace-nowrap leading-5 text-amber-700 hover:text-amber-900 text-xs px-1.5 py-1 rounded hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Rename this version"
                        >
                          {renamingEstimateId === estimate._id ? 'Renaming...' : 'Rename'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTagAsFinal(estimate)}
                          disabled={taggingFinalEstimateId === estimate._id || estimate.isFinalSubmission}
                          className="inline-flex items-center whitespace-nowrap leading-5 text-emerald-700 hover:text-emerald-900 text-xs px-1.5 py-1 rounded hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Tag as final submission"
                        >
                          {estimate.isFinalSubmission
                            ? 'Final'
                            : taggingFinalEstimateId === estimate._id
                            ? 'Tagging...'
                            : 'Tag Final'}
                        </button>
                        <button
                          onClick={() => handleDeleteEstimate(estimate._id)}
                          className="inline-flex items-center whitespace-nowrap leading-5 text-dpwh-red-600 hover:text-dpwh-red-800 text-xs px-1.5 py-1 rounded hover:bg-red-50"
                          title="Delete"
                        >
                          Delete
                        </button>
                      </>
                    )}
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
      {showCreateModal && canModifyPow && (
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
