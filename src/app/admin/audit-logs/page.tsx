'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type AuditActor = {
  userId?: string;
  email?: string;
  name?: string;
  roles?: string[];
};

type AuditLogRow = {
  _id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId?: string;
  projectId?: string;
  summary?: string;
  status: 'success' | 'failed';
  route: string;
  method: string;
  actor?: AuditActor;
  changes?: {
    before?: unknown;
    after?: unknown;
    fields?: Record<string, { before: unknown; after: unknown }>;
  };
  error?: string;
};

type AuditResponse = {
  success: boolean;
  data: AuditLogRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

const PAGE_SIZE = 50;

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    entityType: '',
    action: '',
    status: '',
    actor: '',
    projectId: '',
    dateFrom: '',
    dateTo: '',
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));

    for (const [key, value] of Object.entries(filters)) {
      if (value.trim()) {
        params.set(key, value.trim());
      }
    }

    return params.toString();
  }, [filters, page]);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/audit-logs?${queryString}`);
      const result: AuditResponse & { error?: string } = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch audit logs');
      }

      setLogs(result.data || []);
      setTotalPages(result.pagination?.pages || 1);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [queryString]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-600 mt-1">Track who changed data, what changed, and when.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/users" className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            User Management
          </Link>
          <button onClick={fetchLogs} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <input
            value={filters.entityType}
            onChange={(e) => {
              setPage(1);
              setFilters(prev => ({ ...prev, entityType: e.target.value }));
            }}
            placeholder="Entity type"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={filters.action}
            onChange={(e) => {
              setPage(1);
              setFilters(prev => ({ ...prev, action: e.target.value }));
            }}
            placeholder="Action"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={filters.status}
            onChange={(e) => {
              setPage(1);
              setFilters(prev => ({ ...prev, status: e.target.value }));
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Any Status</option>
            <option value="success">success</option>
            <option value="failed">failed</option>
          </select>
          <input
            value={filters.actor}
            onChange={(e) => {
              setPage(1);
              setFilters(prev => ({ ...prev, actor: e.target.value }));
            }}
            placeholder="Actor"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={filters.projectId}
            onChange={(e) => {
              setPage(1);
              setFilters(prev => ({ ...prev, projectId: e.target.value }));
            }}
            placeholder="Project ID"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => {
              setPage(1);
              setFilters(prev => ({ ...prev, dateFrom: e.target.value }));
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => {
              setPage(1);
              setFilters(prev => ({ ...prev, dateTo: e.target.value }));
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={() => {
              setPage(1);
              setFilters({
                entityType: '',
                action: '',
                status: '',
                actor: '',
                projectId: '',
                dateFrom: '',
                dateTo: '',
              });
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No audit logs found.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {logs.map((log) => {
              const actorLabel = log.actor?.name || log.actor?.email || log.actor?.userId || 'system';
              const isExpanded = expandedId === log._id;

              return (
                <div key={log._id} className="p-4">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : log._id)}
                    className="w-full text-left"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {log.action} {log.entityType}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">{log.summary || 'No summary provided'}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          By {actorLabel} • {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {log.status}
                        </span>
                        <span className="inline-flex rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700">
                          {log.method}
                        </span>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                      <div className="text-xs text-gray-700 mb-2">
                        Route: <span className="font-mono">{log.route}</span>
                      </div>
                      {log.entityId && (
                        <div className="text-xs text-gray-700 mb-2">Entity ID: <span className="font-mono">{log.entityId}</span></div>
                      )}
                      {log.projectId && (
                        <div className="text-xs text-gray-700 mb-2">Project ID: <span className="font-mono">{log.projectId}</span></div>
                      )}
                      {log.error && <div className="text-xs text-red-700 mb-2">Error: {log.error}</div>}
                      {log.changes?.fields && (
                        <pre className="text-xs overflow-auto bg-white border border-gray-200 rounded p-2">{JSON.stringify(log.changes.fields, null, 2)}</pre>
                      )}
                      {!log.changes?.fields && Boolean(log.changes?.before || log.changes?.after) && (
                        <pre className="text-xs overflow-auto bg-white border border-gray-200 rounded p-2">{JSON.stringify(log.changes, null, 2)}</pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          disabled={page <= 1}
          onClick={() => setPage(prev => Math.max(prev - 1, 1))}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
        >
          Previous
        </button>
        <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage(prev => prev + 1)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
