'use client';

import React, { useState } from 'react';

interface SaveBOQModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (action: 'update' | 'version', versionName?: string) => Promise<void>;
  hasExistingBOQ: boolean;
}

export default function SaveBOQModal({ isOpen, onClose, onSave, hasExistingBOQ }: SaveBOQModalProps) {
  const [action, setAction] = useState<'update' | 'version'>('version');
  const [versionName, setVersionName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await onSave(action, versionName || undefined);
      onClose();
      // Reset form
      setAction('version');
      setVersionName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save BOQ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Save BOQ to Database</h3>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {hasExistingBOQ && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                You have existing BOQ data in the database. Choose how to save:
              </p>
            </div>
          )}

          {/* Action Selection */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="action"
                value="update"
                checked={action === 'update'}
                onChange={(e) => setAction(e.target.value as 'update')}
                disabled={saving}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Update Existing BOQ</div>
                <div className="text-sm text-gray-600">
                  Replace all current BOQ data with this version
                  {hasExistingBOQ && <span className="text-red-600"> (This will delete existing data)</span>}
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="action"
                value="version"
                checked={action === 'version'}
                onChange={(e) => setAction(e.target.value as 'version')}
                disabled={saving}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Create New Version</div>
                <div className="text-sm text-gray-600">
                  Keep existing BOQ data and create a new version
                  {hasExistingBOQ && <span className="text-green-600"> (Recommended)</span>}
                </div>
              </div>
            </label>
          </div>

          {/* Version Name (optional) */}
          {action === 'version' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Version Name (Optional)
              </label>
              <input
                type="text"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                disabled={saving}
                placeholder={`BOQ Version ${new Date().toLocaleDateString()}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                If not provided, will use default naming like "BOQ Version 2"
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 font-medium flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save to Database
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
