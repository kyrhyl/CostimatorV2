/**
 * Version Timeline Component
 * 
 * Displays a timeline/list of all takeoff versions for a project
 * with status, dates, and actions
 */

'use client';

import React, { useState, useEffect } from 'react';
import VersionStatusBadge, { TakeoffVersionStatus } from './VersionStatusBadge';
import { ITakeoffVersion } from '@/types/versioning';

interface VersionTimelineProps {
  projectId: string;
  onVersionSelect?: (versionId: string) => void;
  activeVersionId?: string;
}

export function VersionTimeline({ projectId, onVersionSelect, activeVersionId }: VersionTimelineProps) {
  const [versions, setVersions] = useState<ITakeoffVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSuperseded, setShowSuperseded] = useState(false);

  useEffect(() => {
    fetchVersions();
  }, [projectId, showSuperseded]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/projects/${projectId}/takeoff-versions?includeSuperseded=${showSuperseded}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch versions');
      }
      
      const data = await response.json();
      setVersions(data.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (versionId: string, action: string, reason?: string) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/takeoff-versions/${versionId}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            userId: 'current-user', // TODO: Get from auth context
            reason,
          }),
        }
      );
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }
      
      // Refresh versions
      fetchVersions();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDuplicate = async (versionId: string) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/takeoff-versions/${versionId}/duplicate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            createdBy: 'current-user', // TODO: Get from auth context
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to duplicate version');
      }
      
      // Refresh versions
      fetchVersions();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading versions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error: {error}</p>
        <button
          onClick={fetchVersions}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Takeoff Versions ({versions.length})
        </h3>
        <label className="flex items-center text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showSuperseded}
            onChange={(e) => setShowSuperseded(e.target.checked)}
            className="mr-2 rounded border-gray-300"
          />
          Show superseded versions
        </label>
      </div>

      {/* Version List */}
      {versions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No versions found. Create your first version to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {versions.map((version) => (
            <VersionCard
              key={version._id.toString()}
              version={version}
              isActive={version._id.toString() === activeVersionId}
              onSelect={() => onVersionSelect?.(version._id.toString())}
              onStatusChange={handleStatusChange}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface VersionCardProps {
  version: ITakeoffVersion;
  isActive: boolean;
  onSelect: () => void;
  onStatusChange: (versionId: string, action: string, reason?: string) => void;
  onDuplicate: (versionId: string) => void;
}

function VersionCard({ version, isActive, onSelect, onStatusChange, onDuplicate }: VersionCardProps) {
  const [showActions, setShowActions] = useState(false);

  const canEdit = version.status === 'draft' || version.status === 'rejected';
  const canSubmit = version.status === 'draft';
  const canApprove = version.status === 'submitted';
  const canReject = version.status === 'submitted';

  return (
    <div
      className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
        isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Version Header */}
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-semibold text-gray-900">
              Version {version.versionNumber}
            </h4>
            <VersionStatusBadge status={version.status as TakeoffVersionStatus} />
            {isActive && (
              <span className="text-xs text-blue-600 font-medium">ACTIVE</span>
            )}
          </div>

          {/* Version Details */}
          <p className="text-sm text-gray-700 mb-1">{version.versionLabel}</p>
          {version.description && (
            <p className="text-xs text-gray-500 mb-2">{version.description}</p>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Type: {version.versionType}</span>
            <span>BOQ Lines: {version.boqLineCount || 0}</span>
            <span>
              Created: {new Date(version.createdAt).toLocaleDateString()}
            </span>
            {version.approvedDate && (
              <span>
                Approved: {new Date(version.approvedDate).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Change Summary */}
          {version.changesSummary && (
            <div className="mt-2 text-xs text-gray-600">
              Changes: +{version.changesSummary.elementsAdded} -{version.changesSummary.elementsRemoved} ~{version.changesSummary.elementsModified}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(!showActions);
            }}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {showActions && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <div className="py-1">
                {canSubmit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(version._id.toString(), 'submit');
                      setShowActions(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Submit for Approval
                  </button>
                )}
                {canApprove && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(version._id.toString(), 'approve');
                      setShowActions(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50"
                  >
                    Approve
                  </button>
                )}
                {canReject && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const reason = prompt('Rejection reason:');
                      if (reason) {
                        onStatusChange(version._id.toString(), 'reject', reason);
                      }
                      setShowActions(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    Reject
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(version._id.toString());
                    setShowActions(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Duplicate
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VersionTimeline;
