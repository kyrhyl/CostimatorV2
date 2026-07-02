import type { ManualPowConfigForm } from './types';

interface ManualPowConfigModalProps {
  show: boolean;
  configForm: ManualPowConfigForm;
  district?: string;
  laborLocations: string[];
  laborVersionOptions: string[];
  cmpdOptions: string[];
  loadingLaborLocations: boolean;
  loadingLaborVersions: boolean;
  loadingCmpdVersions: boolean;
  configLoading: boolean;
  configError: string | null;
  onClose: () => void;
  onConfigFormChange: (next: ManualPowConfigForm) => void;
  onSave: () => void;
}

export default function ManualPowConfigModal({
  show,
  configForm,
  district,
  laborLocations,
  laborVersionOptions,
  cmpdOptions,
  loadingLaborLocations,
  loadingLaborVersions,
  loadingCmpdVersions,
  configLoading,
  configError,
  onClose,
  onConfigFormChange,
  onSave,
}: ManualPowConfigModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <p className="text-base font-semibold text-gray-900">Manual POW Settings</p>
            <p className="text-xs text-gray-500">Select labor location, labor version, and CMPD version for manual BOQ entries.</p>
          </div>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="space-y-4 px-6 py-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Labor Rate Location</label>
            {loadingLaborLocations ? (
              <p className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-500">Loading locations...</p>
            ) : laborLocations.length === 0 ? (
              <p className="mt-1 rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500">
                No labor rate locations available. Add labor rates in Master Data first.
              </p>
            ) : (
              <select
                value={configForm.laborLocation}
                onChange={(e) => onConfigFormChange({ ...configForm, laborLocation: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">Select location...</option>
                {laborLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Labor Version</label>
            {loadingLaborVersions ? (
              <p className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-500">Loading labor versions...</p>
            ) : laborVersionOptions.length === 0 ? (
              <p className="mt-1 rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500">
                No labor versions available. Create labor rates first.
              </p>
            ) : (
              <select
                value={configForm.laborVersion}
                onChange={(e) => onConfigFormChange({ ...configForm, laborVersion: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">Select labor version...</option>
                {laborVersionOptions.map((version) => (
                  <option key={version} value={version}>
                    {version}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">CMPD Version</label>
            {loadingCmpdVersions ? (
              <p className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-500">Loading CMPD versions...</p>
            ) : cmpdOptions.length === 0 ? (
              <p className="mt-1 rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500">
                No CMPD versions available. Upload price data first.
              </p>
            ) : (
              <select
                value={configForm.cmpdVersion}
                onChange={(e) => onConfigFormChange({ ...configForm, cmpdVersion: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">Select CMPD version...</option>
                {cmpdOptions.map((version) => (
                  <option key={version} value={version}>
                    {version}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">District (optional)</label>
              <input
                type="text"
                value={configForm.district}
                onChange={(e) => onConfigFormChange({ ...configForm, district: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder={district || 'Enter district'}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">VAT %</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={configForm.vatPercentage}
                onChange={(e) => onConfigFormChange({ ...configForm, vatPercentage: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">EAO %</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={configForm.eaoPercentage}
                onChange={(e) => onConfigFormChange({ ...configForm, eaoPercentage: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={configForm.notes}
              onChange={(e) => onConfigFormChange({ ...configForm, notes: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="Optional remarks"
            />
          </div>

          {configError && <p className="text-sm text-red-600">{configError}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={configLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={
              configLoading ||
              laborLocations.length === 0 ||
              laborVersionOptions.length === 0 ||
              cmpdOptions.length === 0
            }
          >
            {configLoading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
