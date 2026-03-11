import type { StagedTemplate, TemplateSummary } from './types';

interface ManualPowTemplateModalProps {
  show: boolean;
  laborLocation: string;
  cmpdVersion?: string;
  templateSearch: string;
  partFilter: string;
  partOptions: string[];
  templates: TemplateSummary[];
  loadingTemplates: boolean;
  templateError: string | null;
  selectedTemplateIds: Record<string, boolean>;
  quickQuantities: Record<string, number>;
  stagedTemplates: StagedTemplate[];
  loadCommonEnabled: boolean;
  error: string | null;
  bulkError: string | null;
  bulkSaving: boolean;
  onClose: () => void;
  onLoadCommon: () => void;
  onTemplateSearchChange: (value: string) => void;
  onPartFilterChange: (value: string) => void;
  onToggleTemplateSelection: (templateId: string) => void;
  onQuickQuantityChange: (templateId: string, value: number) => void;
  onQuickAddTemplate: (template: TemplateSummary) => void;
  quickAddingTemplateId?: string | null;
  onAddSelectedTemplates: () => void;
  onStagedQuantityChange: (templateId: string, value: number) => void;
  onRemoveStagedTemplate: (templateId: string) => void;
  onSaveItems: () => void;
}

export default function ManualPowTemplateModal({
  show,
  laborLocation,
  cmpdVersion,
  templateSearch,
  partFilter,
  partOptions,
  templates,
  loadingTemplates,
  templateError,
  selectedTemplateIds,
  quickQuantities,
  stagedTemplates,
  loadCommonEnabled,
  error,
  bulkError,
  bulkSaving,
  onClose,
  onLoadCommon,
  onTemplateSearchChange,
  onPartFilterChange,
  onToggleTemplateSelection,
  onQuickQuantityChange,
  onQuickAddTemplate,
  quickAddingTemplateId,
  onAddSelectedTemplates,
  onStagedQuantityChange,
  onRemoveStagedTemplate,
  onSaveItems,
}: ManualPowTemplateModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <p className="text-base font-semibold text-gray-900">Add Manual BOQ Item</p>
            <p className="text-xs text-gray-500">Shows common DUPA templates by default; searching expands to all active templates.</p>
          </div>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="space-y-4 px-6 py-4">
          <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            <p>
              <strong>Labor Location:</strong> {laborLocation}
            </p>
            <p>
              <strong>CMPD Version:</strong> {cmpdVersion || 'Project Default'}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Search DUPA Template</label>
              <input
                type="text"
                value={templateSearch}
                onChange={(e) => onTemplateSearchChange(e.target.value)}
                placeholder="Search by pay item number or description"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Part Filter</label>
              <select
                value={partFilter}
                onChange={(e) => onPartFilterChange(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="all">All Parts</option>
                {partOptions.map((part) => (
                  <option key={part} value={part}>
                    {part}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!loadCommonEnabled && !templateSearch.trim() && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-center justify-between gap-3">
              <span>No templates are loaded by default. Search, or load common templates.</span>
              <button
                type="button"
                onClick={onLoadCommon}
                className="rounded border border-amber-300 px-2 py-1 font-medium hover:bg-amber-100"
              >
                Load Common Templates
              </button>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto rounded-md border border-gray-200">
            {templateError ? (
              <p className="px-4 py-3 text-sm text-red-600">{templateError}</p>
            ) : loadingTemplates ? (
              <p className="px-4 py-3 text-sm text-gray-500">Loading templates...</p>
            ) : !loadCommonEnabled && !templateSearch.trim() ? (
              <p className="px-4 py-3 text-sm text-gray-500">No templates loaded yet.</p>
            ) : templates.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-500">
                No templates found {partFilter !== 'all' ? `for ${partFilter}` : ''}.
              </p>
            ) : (
              <ul>
                {templates.map((tpl) => (
                  <li key={tpl._id} className="border-b border-gray-100 last:border-b-0">
                    <div className="flex items-start gap-3 px-4 py-3 text-sm hover:bg-blue-50">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={Boolean(selectedTemplateIds[tpl._id])}
                        onChange={() => onToggleTemplateSelection(tpl._id)}
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {tpl.payItemNumber} · {tpl.payItemDescription}
                          {tpl.isPinnedCommon && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                              ★ Favorite
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          Unit: {tpl.unitOfMeasurement} {tpl.part ? `• ${tpl.part}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={quickQuantities[tpl._id] ?? 1}
                          onChange={(e) => onQuickQuantityChange(tpl._id, Number(e.target.value))}
                          className="w-20 rounded-md border border-gray-300 px-2 py-1 text-right"
                        />
                        <button
                          type="button"
                          onClick={() => onQuickAddTemplate(tpl)}
                          disabled={(quickQuantities[tpl._id] ?? 1) <= 0 || quickAddingTemplateId === tpl._id}
                          className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {quickAddingTemplateId === tpl._id ? 'Adding...' : 'Add Now'}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onAddSelectedTemplates}
              className="inline-flex items-center gap-2 rounded-md border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
              disabled={!Object.values(selectedTemplateIds).some(Boolean)}
            >
              Stage Selected Templates
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Worksheet</label>
              <span className="text-xs text-gray-500">{stagedTemplates.length} item(s)</span>
            </div>
            {stagedTemplates.length === 0 ? (
              <p className="rounded-md border border-dashed border-gray-300 px-3 py-4 text-center text-sm text-gray-500">
                Select DUPA templates above and click "Stage Selected Templates" to prepare quantities.
              </p>
            ) : (
              <div className="max-h-64 overflow-x-auto overflow-y-auto rounded-md border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Pay Item</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Description</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Unit</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">Quantity</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stagedTemplates.map((tpl) => (
                      <tr key={tpl._id}>
                        <td className="px-3 py-2 font-semibold text-gray-900">{tpl.payItemNumber}</td>
                        <td className="px-3 py-2 text-gray-700">{tpl.payItemDescription}</td>
                        <td className="px-3 py-2 text-gray-600">{tpl.unitOfMeasurement}</td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-24 rounded-md border border-gray-300 px-2 py-1 text-right"
                            value={tpl.quantity}
                            onChange={(e) => onStagedQuantityChange(tpl._id, Number(e.target.value))}
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => onRemoveStagedTemplate(tpl._id)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {bulkError && <p className="text-sm text-red-600">{bulkError}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={bulkSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSaveItems}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={bulkSaving || stagedTemplates.length === 0}
          >
            {bulkSaving ? 'Saving...' : 'Save Items'}
          </button>
        </div>
      </div>
    </div>
  );
}
