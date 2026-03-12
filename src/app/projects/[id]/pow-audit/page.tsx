'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

type AuditChecklist = {
  prescribedFormat: boolean;
  arithmeticAccuracy: boolean;
  valueConsistency: boolean;
  scopeCompleteness: boolean;
};

const defaultChecklist: AuditChecklist = {
  prescribedFormat: false,
  arithmeticAccuracy: false,
  valueConsistency: false,
  scopeCompleteness: false,
};

export default function PowAuditPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const projectId = String(params?.id || '');
  const estimateId = String(searchParams.get('estimateId') || '');

  const roles = session?.user?.roles || [];
  const canSubmitAudit = roles.includes('auditor') || roles.includes('admin') || roles.includes('master_admin');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [estimate, setEstimate] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<AuditChecklist>(defaultChecklist);
  const [findings, setFindings] = useState('');
  const [recommendation, setRecommendation] = useState('');

  const allChecksPassed = useMemo(
    () => Object.values(checklist).every(Boolean),
    [checklist],
  );

  useEffect(() => {
    const load = async () => {
      if (!estimateId) {
        setNotice({ type: 'error', message: 'Missing estimateId query parameter.' });
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/cost-estimates/${estimateId}/audit`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to load audit data');
        }

        setEstimate(data.data?.estimate || null);
        setHistory(data.data?.history || []);

        const latest = data.data?.latest;
        if (latest) {
          setChecklist({ ...defaultChecklist, ...(latest.checklist || {}) });
          setFindings(latest.findings || '');
          setRecommendation(latest.recommendation || '');
        }
      } catch (err: any) {
        setNotice({ type: 'error', message: err.message || 'Failed to load audit data.' });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [estimateId]);

  const saveAudit = async (status: 'draft' | 'submitted') => {
    if (!canSubmitAudit) {
      setNotice({ type: 'error', message: 'You do not have permission to submit audit recommendations.' });
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/cost-estimates/${estimateId}/audit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          checklist,
          findings,
          recommendation,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save audit');
      }

      setNotice({ type: 'success', message: data.message || 'Audit updated successfully.' });

      const refresh = await fetch(`/api/cost-estimates/${estimateId}/audit`);
      const refreshed = await refresh.json();
      if (refresh.ok && refreshed.success) {
        setHistory(refreshed.data?.history || []);
      }
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to save audit.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-6">Loading audit workspace...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/projects/${projectId}`} className="text-blue-600 hover:text-blue-800 text-sm">
            ← Back to Project
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Estimate Audit Workspace</h1>
          <p className="text-sm text-slate-600">
            Review estimate values and prescribed-format compliance before recommendation.
          </p>
        </div>
        <Link
          href={`/projects/${projectId}/pow-report?mode=takeoff&estimateId=${estimateId}`}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          Open POW Report
        </Link>
      </div>

      {notice && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {notice.message}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Estimate Context</h2>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-slate-500">Estimate Number</div>
            <div className="font-semibold text-slate-900">{estimate?.estimateNumber || 'N/A'}</div>
          </div>
          <div>
            <div className="text-slate-500">Estimate Name</div>
            <div className="font-semibold text-slate-900">{estimate?.estimateName || 'Untitled Estimate'}</div>
          </div>
          <div>
            <div className="text-slate-500">Current Estimate Status</div>
            <div className="font-semibold text-slate-900">{estimate?.status || 'draft'}</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Audit Checklist</h2>
        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input type="checkbox" checked={checklist.prescribedFormat} onChange={(e) => setChecklist((prev) => ({ ...prev, prescribedFormat: e.target.checked }))} />
          Prescribed DPWH format is followed
        </label>
        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input type="checkbox" checked={checklist.arithmeticAccuracy} onChange={(e) => setChecklist((prev) => ({ ...prev, arithmeticAccuracy: e.target.checked }))} />
          Arithmetic computations are accurate
        </label>
        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input type="checkbox" checked={checklist.valueConsistency} onChange={(e) => setChecklist((prev) => ({ ...prev, valueConsistency: e.target.checked }))} />
          Estimate values are consistent across POW/ABC/DUPA reports
        </label>
        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input type="checkbox" checked={checklist.scopeCompleteness} onChange={(e) => setChecklist((prev) => ({ ...prev, scopeCompleteness: e.target.checked }))} />
          Scope and pay items are complete for this version
        </label>

        <div className="pt-2 text-xs text-slate-500">
          Checklist completion: {allChecksPassed ? 'All checks passed' : 'Pending checks remain'}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Findings and Recommendation</h2>
        <div>
          <label className="text-sm font-medium text-slate-700">Findings</label>
          <textarea
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
            rows={6}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="List non-compliances, discrepancies, or validation notes..."
            disabled={!canSubmitAudit}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Recommendation</label>
          <select
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            disabled={!canSubmitAudit}
          >
            <option value="">Select recommendation</option>
            <option value="pass">Pass</option>
            <option value="needs_revision">Needs Revision</option>
            <option value="fail">Fail</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => saveAudit('draft')}
            disabled={saving || !canSubmitAudit}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={() => saveAudit('submitted')}
            disabled={saving || !canSubmitAudit}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Submitting...' : 'Submit Recommendation'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 mb-3">Recent Audit History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-500">No audit records yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((item: any) => (
              <div key={item._id} className="flex flex-wrap items-center justify-between border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <span className="font-medium text-slate-900">{item.recommendation || 'No recommendation'}</span>
                <span className="text-slate-600">{item.status}</span>
                <span className="text-slate-600">{item?.auditorId?.name || item?.auditorId?.email || 'Unknown auditor'}</span>
                <span className="text-slate-500">{new Date(item.submittedAt || item.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
