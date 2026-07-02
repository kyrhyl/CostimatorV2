"use client";

import { useEffect, useMemo, useState } from 'react';
import ManualPowConfigModal from './manual-pow/ManualPowConfigModal';
import ManualPowItemsTable from './manual-pow/ManualPowItemsTable';
import ManualPowTemplateModal from './manual-pow/ManualPowTemplateModal';
import type { ManualPowConfigForm, ProjectBoqItem, StagedTemplate } from './manual-pow/types';
import { useManualPowMasterData } from './manual-pow/useManualPowMasterData';
import { useManualPowTemplates } from './manual-pow/useManualPowTemplates';
import {
  deleteProjectBoqItem,
  saveManualPowConfig,
  saveManualPowDraft,
  saveStagedManualPowItems,
  updateProjectBoqQuantity,
} from './manual-pow/services';

export type { ProjectBoqItem } from './manual-pow/types';

interface ManualPowManagerProps {
  projectId: string;
  projectName: string;
  readOnly?: boolean;
  projectLocation?: string;
  district?: string;
  manualConfig?: {
    laborLocation?: string;
    laborVersion?: string;
    cmpdVersion?: string;
    district?: string;
    vatPercentage?: number;
    eaoPercentage?: number;
    notes?: string;
  };
  manualItems: ProjectBoqItem[];
  loading: boolean;
  onReload: (options?: { silent?: boolean }) => Promise<void>;
  onManualConfigSaved?: () => Promise<void>;
  onManualVersionSaved?: (estimateId?: string) => Promise<void> | void;
}

const PART_OPTIONS = ['PART A', 'PART B', 'PART C', 'PART D', 'PART E', 'PART F', 'PART G', 'PART H', 'PART I'];

const getDefaultVersionName = () => {
  return `Manual POW - ${new Date().toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
};

export default function ManualPowManager({
  projectId,
  projectName,
  readOnly = false,
  projectLocation,
  district,
  manualConfig,
  manualItems,
  loading,
  onReload,
  onManualConfigSaved,
  onManualVersionSaved,
}: ManualPowManagerProps) {
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [loadCommonTemplates, setLoadCommonTemplates] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [partFilter, setPartFilter] = useState('all');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Record<string, boolean>>({});
  const [quickQuantities, setQuickQuantities] = useState<Record<string, number>>({});
  const [stagedTemplates, setStagedTemplates] = useState<StagedTemplate[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [quickAddingTemplateId, setQuickAddingTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const [pendingQuantities, setPendingQuantities] = useState<Record<string, number>>({});
  const [selectedManualItemIds, setSelectedManualItemIds] = useState<Record<string, boolean>>({});
  const [updatingRowId, setUpdatingRowId] = useState<string | null>(null);
  const [deletingRowId, setDeletingRowId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState<ManualPowConfigForm>({
    laborLocation: manualConfig?.laborLocation || district || projectLocation || '',
    district: manualConfig?.district || district || '',
    laborVersion: manualConfig?.laborVersion || '',
    cmpdVersion: manualConfig?.cmpdVersion || '',
    vatPercentage: manualConfig?.vatPercentage ?? 12,
    eaoPercentage: manualConfig?.eaoPercentage ?? 1,
    notes: manualConfig?.notes || '',
  });

  const [savingDraft, setSavingDraft] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const { templates, loadingTemplates, templateError, resetTemplateState } = useManualPowTemplates({
    enabled: showTemplateModal,
    templateSearch,
    partFilter,
    loadCommon: loadCommonTemplates,
  });

  const {
    laborLocations,
    loadingLaborLocations,
    laborVersionOptions,
    loadingLaborVersions,
    cmpdOptions,
    loadingCmpdVersions,
  } = useManualPowMasterData({
    enabled: showConfigModal,
  });

  const laborLocation = manualConfig?.laborLocation || district || projectLocation || 'Project Location';
  const hasManualSettings = Boolean(manualConfig?.laborLocation || district || projectLocation);

  useEffect(() => {
    setSelectedManualItemIds((prev) => {
      const validIds = new Set(manualItems.map((item) => item._id));
      const next = Object.fromEntries(Object.entries(prev).filter(([id, selected]) => selected && validIds.has(id)));
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [manualItems]);

  const resetTemplateModalState = () => {
    setLoadCommonTemplates(false);
    setTemplateSearch('');
    setPartFilter('all');
    setSelectedTemplateIds({});
    setQuickQuantities({});
    setStagedTemplates([]);
    setError(null);
    setBulkError(null);
    resetTemplateState();
  };

  const closeTemplateModal = () => {
    setShowTemplateModal(false);
    resetTemplateModalState();
  };

  const openConfigModal = () => {
    if (readOnly) return;
    setConfigForm({
      laborLocation: manualConfig?.laborLocation || district || projectLocation || '',
      district: manualConfig?.district || district || '',
      laborVersion: manualConfig?.laborVersion || '',
      cmpdVersion: manualConfig?.cmpdVersion || '',
      vatPercentage: manualConfig?.vatPercentage ?? 12,
      eaoPercentage: manualConfig?.eaoPercentage ?? 1,
      notes: manualConfig?.notes || '',
    });
    setConfigError(null);
    setShowConfigModal(true);
  };

  const openTemplateModal = () => {
    if (readOnly) return;
    if (!manualConfig?.laborLocation || !manualConfig?.laborVersion) {
      openConfigModal();
      return;
    }
    setShowTemplateModal(true);
  };

  const handleSaveManualConfig = async () => {
    if (readOnly) return;
    if (!configForm.laborLocation) {
      setConfigError('Select a labor rate location.');
      return;
    }
    if (!configForm.cmpdVersion) {
      setConfigError('Select a CMPD version.');
      return;
    }
    if (!configForm.laborVersion) {
      setConfigError('Select a labor version.');
      return;
    }

    setConfigLoading(true);
    setConfigError(null);

    try {
      await saveManualPowConfig(projectId, configForm, district);

      if (onManualConfigSaved) {
        await onManualConfigSaved();
      }
      setShowConfigModal(false);
    } catch (err: any) {
      console.error('Failed to save manual configuration', err);
      setConfigError(err.message || 'Failed to save configuration');
    } finally {
      setConfigLoading(false);
    }
  };

  const handleSaveManualPow = async () => {
    if (readOnly) return;
    if (!manualConfig?.laborLocation) {
      setSaveError('Configure the manual POW settings before saving.');
      openConfigModal();
      return;
    }

    if (!manualItems.length) {
      setSaveError('Add at least one BOQ line before saving.');
      return;
    }

    setSavingDraft(true);
    setSaveError(null);

    try {
      const data = await saveManualPowDraft(projectId, {
        name: getDefaultVersionName(),
      });

      setSaveSuccess(data.message || 'Manual Program of Works saved.');
      if (onManualVersionSaved) {
        await onManualVersionSaved(data.data?._id || data.estimateId);
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save Manual Program of Works');
    } finally {
      setSavingDraft(false);
    }
  };

  const toggleTemplateSelection = (id: string) => {
    setSelectedTemplateIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddSelectedTemplates = () => {
    if (readOnly) return;
    const selectedIds = Object.entries(selectedTemplateIds)
      .filter(([, checked]) => checked)
      .map(([id]) => id);

    if (selectedIds.length === 0) {
      setError('Select at least one DUPA template to stage');
      return;
    }

    const newEntries = templates
      .filter((tpl) => selectedIds.includes(tpl._id) && !stagedTemplates.some((item) => item._id === tpl._id))
      .map((tpl) => ({ ...tpl, quantity: 1 }));

    if (newEntries.length === 0) {
      setError('Selected templates are already in the worksheet');
      return;
    }

    setStagedTemplates((prev) => [...prev, ...newEntries]);
    setSelectedTemplateIds({});
    setError(null);
  };

  const handleStagedQuantityChange = (templateId: string, value: number) => {
    if (readOnly) return;
    setStagedTemplates((prev) => prev.map((item) => (item._id === templateId ? { ...item, quantity: value } : item)));
  };

  const handleRemoveStagedTemplate = (templateId: string) => {
    if (readOnly) return;
    setStagedTemplates((prev) => prev.filter((item) => item._id !== templateId));
  };

  const handleSaveStagedItems = async () => {
    if (readOnly) return;
    if (!laborLocation) {
      setBulkError('Set a labor rate location for Manual Program of Works.');
      return;
    }
    if (!manualConfig?.laborVersion) {
      setBulkError('Set a labor version for Manual Program of Works.');
      openConfigModal();
      return;
    }
    if (stagedTemplates.length === 0) {
      setBulkError('Add at least one DUPA template to the worksheet.');
      return;
    }
    if (stagedTemplates.some((item) => !item.quantity || item.quantity <= 0)) {
      setBulkError('Enter a quantity greater than zero for each staged template.');
      return;
    }

    setBulkSaving(true);
    setSaveSuccess(null);
    setBulkError(null);
    setError(null);

    try {
      await saveStagedManualPowItems(
        projectId,
        laborLocation,
        manualConfig?.laborVersion || '',
        manualConfig?.district || district || '',
        stagedTemplates,
      );

      await onReload({ silent: true });
      closeTemplateModal();
    } catch (err: any) {
      console.error('Failed to add manual BOQ items', err);
      setBulkError(err.message || 'Failed to add BOQ items');
    } finally {
      setBulkSaving(false);
    }
  };

  const handleQuickQuantityChange = (templateId: string, value: number) => {
    if (readOnly) return;
    setQuickQuantities((prev) => ({ ...prev, [templateId]: value }));
  };

  const handleQuickAddTemplate = async (template: { _id: string; payItemNumber: string; payItemDescription: string; unitOfMeasurement: string; part?: string; category?: string }) => {
    if (readOnly) return;
    if (!laborLocation) {
      setBulkError('Set a labor rate location for Manual Program of Works.');
      return;
    }
    if (!manualConfig?.laborVersion) {
      setBulkError('Set a labor version for Manual Program of Works.');
      openConfigModal();
      return;
    }

    const quantity = Number(quickQuantities[template._id] ?? 1);
    if (!quantity || quantity <= 0) {
      setBulkError('Enter a quantity greater than zero.');
      return;
    }

    setQuickAddingTemplateId(template._id);
    setSaveSuccess(null);
    setBulkError(null);
    setError(null);

    try {
      await saveStagedManualPowItems(projectId, laborLocation, manualConfig?.laborVersion || '', manualConfig?.district || district || '', [{
        _id: template._id,
        payItemNumber: template.payItemNumber,
        payItemDescription: template.payItemDescription,
        unitOfMeasurement: template.unitOfMeasurement,
        part: template.part,
        category: template.category,
        quantity,
      }]);
      await onReload({ silent: true });
      setQuickQuantities((prev) => ({ ...prev, [template._id]: 1 }));
    } catch (err: any) {
      console.error('Failed to add BOQ item quickly', err);
      setBulkError(err.message || 'Failed to add BOQ item');
    } finally {
      setQuickAddingTemplateId(null);
    }
  };

  const handleQuantityBlur = async (itemId: string, originalQuantity: number) => {
    if (readOnly) return;
    const pending = pendingQuantities[itemId];
    if (pending === undefined || pending === originalQuantity) return;

    if (!pending || pending <= 0) {
      setPendingQuantities((prev) => ({ ...prev, [itemId]: originalQuantity }));
      setSaveError('Quantity must be greater than zero.');
      return;
    }

    try {
      setUpdatingRowId(itemId);
      setSaveSuccess(null);
      await updateProjectBoqQuantity(itemId, pending);
      await onReload({ silent: true });
      setSaveError(null);
    } catch (err: any) {
      console.error('Failed to update quantity', err);
      setSaveError(err.message || 'Failed to save quantity.');
    } finally {
      setUpdatingRowId(null);
    }
  };

  const requestDelete = (itemId: string) => {
    if (readOnly) return;
    setConfirmDeleteId(itemId);
  };

  const handleDelete = async () => {
    if (readOnly) return;
    if (!confirmDeleteId) return;

    try {
      setDeletingRowId(confirmDeleteId);
      setSaveSuccess(null);
      await deleteProjectBoqItem(confirmDeleteId);
      await onReload({ silent: true });
      setSaveError(null);
    } catch (err: any) {
      console.error('Failed to delete BOQ item', err);
      setSaveError(err.message || 'Failed to delete BOQ item.');
    } finally {
      setDeletingRowId(null);
      setConfirmDeleteId(null);
    }
  };

  const selectedManualItems = useMemo(
    () => manualItems.filter((item) => selectedManualItemIds[item._id]),
    [manualItems, selectedManualItemIds],
  );

  const handleToggleSelectAll = (checked: boolean) => {
    if (readOnly) return;
    if (!checked) {
      setSelectedManualItemIds({});
      return;
    }

    setSelectedManualItemIds(
      manualItems.reduce<Record<string, boolean>>((acc, item) => {
        acc[item._id] = true;
        return acc;
      }, {}),
    );
  };

  const handleToggleSelectItem = (itemId: string, checked: boolean) => {
    if (readOnly) return;
    setSelectedManualItemIds((prev) => {
      if (!checked) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }

      return { ...prev, [itemId]: true };
    });
  };

  const handleBulkDelete = async () => {
    if (readOnly) return;
    if (selectedManualItems.length === 0) return;

    try {
      setDeletingRowId('__bulk__');
      setSaveSuccess(null);
      for (const item of selectedManualItems) {
        await deleteProjectBoqItem(item._id);
      }
      await onReload({ silent: true });
      setSelectedManualItemIds({});
      setSaveError(null);
    } catch (err: any) {
      console.error('Failed to delete selected BOQ items', err);
      setSaveError(err.message || 'Failed to delete selected BOQ items.');
    } finally {
      setDeletingRowId(null);
      setConfirmBulkDelete(false);
    }
  };

  const totalManualAmount = useMemo(() => manualItems.reduce((sum, item) => sum + (item.totalAmount || 0), 0), [manualItems]);

  return (
    <section className="rounded-lg bg-white p-4 shadow">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700">Manual Program of Works</p>
          <p className="text-xs text-gray-500">
            Add BOQ lines directly from DUPA templates for {projectName}. These entries drive the Program of Works summaries.
          </p>
          {readOnly && (
            <p className="mt-1 text-xs text-amber-700">Read-only mode: switch project POW mode to Manual to edit BOQ entries.</p>
          )}
          {manualConfig?.laborLocation ? (
            <p className="mt-1 text-xs text-blue-700">
              Labor rates: {manualConfig.laborLocation} • Labor Version: {manualConfig.laborVersion || 'Latest'} • CMPD: {manualConfig.cmpdVersion || 'Project Default'}
            </p>
          ) : (
            <p className="mt-1 text-xs text-red-600">Configure Manual POW (labor location, labor version, and CMPD) before staging DUPA templates.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {!readOnly && manualItems.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmBulkDelete(true)}
              disabled={selectedManualItems.length === 0 || deletingRowId === '__bulk__'}
              className={`inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium ${
                selectedManualItems.length > 0
                  ? 'border-red-200 text-red-700 hover:bg-red-50'
                  : 'cursor-not-allowed border-gray-200 text-gray-400'
              }`}
            >
              {deletingRowId === '__bulk__' ? 'Deleting...' : `Delete Selected${selectedManualItems.length ? ` (${selectedManualItems.length})` : ''}`}
            </button>
          )}
          <button
            type="button"
            onClick={openConfigModal}
            disabled={readOnly}
            className="inline-flex items-center rounded-md border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
          >
            {manualConfig?.laborLocation ? 'Edit Manual Settings' : 'Configure Manual POW'}
          </button>
          <button
            type="button"
            onClick={openTemplateModal}
            disabled={readOnly || !hasManualSettings}
            className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${
              !readOnly && hasManualSettings && manualConfig?.laborLocation
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'cursor-not-allowed bg-gray-200 text-gray-500'
            }`}
            title={hasManualSettings ? 'Add manual BOQ lines' : 'Set manual POW configuration first'}
          >
            + Add BOQ Item
          </button>
          <button
            type="button"
            onClick={handleSaveManualPow}
            disabled={readOnly || !manualItems.length || savingDraft}
            className={`inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium ${
              manualItems.length
                ? 'border-dpwh-green-300 text-dpwh-green-700 hover:bg-dpwh-green-50'
                : 'cursor-not-allowed border-gray-200 text-gray-400'
            }`}
            title={manualItems.length ? 'Save Manual Program of Works' : 'Add BOQ lines before saving'}
          >
            {savingDraft ? 'Saving...' : '💾 Save'}
          </button>
          <button
            type="button"
            onClick={() => void onReload()}
            className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">{saveSuccess}</div>
      )}
      {saveError && !showConfigModal && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{saveError}</div>
      )}

      <ManualPowItemsTable
        manualItems={manualItems}
        loading={loading}
        readOnly={readOnly}
        selectedItemIds={selectedManualItemIds}
        pendingQuantities={pendingQuantities}
        updatingRowId={updatingRowId}
        deletingRowId={deletingRowId}
        totalManualAmount={totalManualAmount}
        onToggleSelectAll={handleToggleSelectAll}
        onToggleSelectItem={handleToggleSelectItem}
        onPendingQuantityChange={(itemId, quantity) => setPendingQuantities((prev) => ({ ...prev, [itemId]: quantity }))}
        onQuantityBlur={handleQuantityBlur}
        onDelete={requestDelete}
      />

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Delete BOQ line?</h3>
            <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                disabled={deletingRowId === confirmDeleteId}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deletingRowId === confirmDeleteId}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deletingRowId === confirmDeleteId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Delete selected BOQ lines?</h3>
            <p className="mt-2 text-sm text-gray-600">
              This removes {selectedManualItems.length} selected pay item{selectedManualItems.length === 1 ? '' : 's'}. This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmBulkDelete(false)}
                disabled={deletingRowId === '__bulk__'}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={deletingRowId === '__bulk__'}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deletingRowId === '__bulk__' ? 'Deleting...' : 'Delete Selected'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ManualPowTemplateModal
        show={showTemplateModal}
        laborLocation={laborLocation}
        cmpdVersion={manualConfig?.cmpdVersion}
        templateSearch={templateSearch}
        partFilter={partFilter}
        partOptions={PART_OPTIONS}
        templates={templates}
        loadingTemplates={loadingTemplates}
        templateError={templateError}
        selectedTemplateIds={selectedTemplateIds}
        quickQuantities={quickQuantities}
        stagedTemplates={stagedTemplates}
        error={error}
        bulkError={bulkError}
        bulkSaving={bulkSaving}
        loadCommonEnabled={loadCommonTemplates}
        onClose={closeTemplateModal}
        onLoadCommon={() => setLoadCommonTemplates(true)}
        onTemplateSearchChange={setTemplateSearch}
        onPartFilterChange={setPartFilter}
        onToggleTemplateSelection={toggleTemplateSelection}
        onQuickQuantityChange={handleQuickQuantityChange}
        onQuickAddTemplate={handleQuickAddTemplate}
        quickAddingTemplateId={quickAddingTemplateId}
        onAddSelectedTemplates={handleAddSelectedTemplates}
        onStagedQuantityChange={handleStagedQuantityChange}
        onRemoveStagedTemplate={handleRemoveStagedTemplate}
        onSaveItems={handleSaveStagedItems}
      />

      <ManualPowConfigModal
        show={showConfigModal}
        configForm={configForm}
        district={district}
        laborLocations={laborLocations}
        laborVersionOptions={laborVersionOptions}
        cmpdOptions={cmpdOptions}
        loadingLaborLocations={loadingLaborLocations}
        loadingLaborVersions={loadingLaborVersions}
        loadingCmpdVersions={loadingCmpdVersions}
        configLoading={configLoading}
        configError={configError}
        onClose={() => setShowConfigModal(false)}
        onConfigFormChange={setConfigForm}
        onSave={handleSaveManualConfig}
      />
    </section>
  );
}
