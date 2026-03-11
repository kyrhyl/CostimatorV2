import type { SaveVersionForm } from './types';

interface ManualPowSaveVersionModalProps {
  show: boolean;
  saveForm: SaveVersionForm;
  savingVersion: boolean;
  versionError: string | null;
  onClose: () => void;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onSave: () => void;
}

export default function ManualPowSaveVersionModal({
  show,
  saveForm,
  savingVersion,
  versionError,
  onClose,
  onNameChange,
  onDescriptionChange,
  onSave,
}: ManualPowSaveVersionModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <p className="text-base font-semibold text-gray-900">Save Manual Program of Works</p>
            <p className="text-xs text-gray-500">Create a version entry using the current manual BOQ.</p>
          </div>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="space-y-4 px-6 py-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Version Name</label>
            <input
              type="text"
              value={saveForm.name}
              onChange={(e) => onNameChange(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="Manual POW - Jan 2026"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
            <textarea
              rows={3}
              value={saveForm.description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="Additional remarks or instructions"
            />
          </div>
          <p className="text-xs text-gray-500">
            A cost estimate version will be created using the current manual BOQ items. You can review or submit it from the Program
            of Works tab.
          </p>
          {versionError && <p className="text-sm text-red-600">{versionError}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={savingVersion}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-md bg-dpwh-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-dpwh-green-700 disabled:opacity-50"
            disabled={savingVersion}
          >
            {savingVersion ? 'Saving...' : 'Save Version'}
          </button>
        </div>
      </div>
    </div>
  );
}
