import { useEffect, useMemo, useState } from 'react';
import type { DupaItemBreakdown, DupaReportData } from '@/types/dupa';
import { FormDUPAPage } from '../forms/FormDUPAPage';
import { DupaTab } from './DupaTab';

interface DupaWorkspaceTabProps {
  data: DupaReportData;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
  selectedPrintKey: string | null;
  onSelectedPrintKeyChange: (key: string | null) => void;
  readOnly?: boolean;
  adjustedKeys?: string[];
  onSaveDupaAdjustment?: (itemKey: string, item: DupaItemBreakdown) => Promise<void>;
  onResetDupaAdjustment?: (itemKey: string) => Promise<void>;
  laborLocation?: string;
  district?: string;
}

type KeyedItem = { item: DupaItemBreakdown; index: number; key: string };
type EditableLabor = DupaItemBreakdown['laborItems'][number];
type EditableEquipment = DupaItemBreakdown['equipmentItems'][number] & { equipmentId?: string };
type EditableMaterial = DupaItemBreakdown['materialItems'][number] & { materialCode?: string };
type EditableItem = Omit<DupaItemBreakdown, 'laborItems' | 'equipmentItems' | 'materialItems'> & {
  laborItems: EditableLabor[];
  equipmentItems: EditableEquipment[];
  materialItems: EditableMaterial[];
};

const getItemKey = (item: DupaReportData['items'][number], index: number) =>
  item.dupaItemId || `${item.part}-${item.payItemNumber}-${item.payItemDescription}::${index}`;

const safe = (value: number) => (Number.isFinite(value) ? value : 0);

const LABOR_KEYS: Array<{ label: string; field: string }> = [
  { label: 'Foreman', field: 'foreman' },
  { label: 'Leadman', field: 'leadman' },
  { label: 'Equipment Operator - Heavy', field: 'equipmentOperatorHeavy' },
  { label: 'Equipment Operator - High Skilled', field: 'equipmentOperatorHighSkilled' },
  { label: 'Equipment Operator - Light Skilled', field: 'equipmentOperatorLightSkilled' },
  { label: 'Driver', field: 'driver' },
  { label: 'Skilled Labor', field: 'laborSkilled' },
  { label: 'Semi-Skilled Labor', field: 'laborSemiSkilled' },
  { label: 'Unskilled Labor', field: 'laborUnskilled' },
];

function normalizeLaborLabel(input: string) {
  return input.toLowerCase().replace(/[^a-z]/g, '');
}

function uniqueSuggestions(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const label = value.trim();
    if (!label) return;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(label);
  });
  return result;
}

function recomputeItem(item: EditableItem): EditableItem {
  const laborItems = item.laborItems.map((row) => ({
    ...row,
    amount: safe(row.noOfPersons) * safe(row.noOfHours) * safe(row.hourlyRate),
  }));
  const equipmentItems = item.equipmentItems.map((row) => ({
    ...row,
    amount: safe(row.noOfUnits) * safe(row.noOfHours) * safe(row.hourlyRate),
  }));
  const materialItems = item.materialItems.map((row) => ({
    ...row,
    amount: safe(row.quantity) * safe(row.unitCost),
  }));

  const laborSubmitted = laborItems.reduce((sum, row) => sum + row.amount, 0);
  const equipmentSubmitted = equipmentItems.reduce((sum, row) => sum + row.amount, 0);
  const directCostSubmitted = laborSubmitted + equipmentSubmitted;
  const outputSubmitted = item.outputPerHour > 0 ? item.outputPerHour : 1;
  const directUnitCostSubmitted = outputSubmitted > 0 ? directCostSubmitted / outputSubmitted : 0;
  const materialsSubmitted = materialItems.reduce((sum, row) => sum + row.amount, 0);
  const directUnitPlusMaterialsSubmitted = directUnitCostSubmitted + materialsSubmitted;
  const ocmPercent = safe(item.totals.ocmPercent);
  const cpPercent = safe(item.totals.cpPercent);
  const vatPercent = safe(item.totals.vatPercent);
  const ocmValue = directUnitPlusMaterialsSubmitted * (ocmPercent / 100);
  const cpValue = directUnitPlusMaterialsSubmitted * (cpPercent / 100);
  const vatValue = (directUnitPlusMaterialsSubmitted + ocmValue + cpValue) * (vatPercent / 100);
  const totalUnitCostSubmitted = directUnitPlusMaterialsSubmitted + ocmValue + cpValue + vatValue;

  return {
    ...item,
    laborItems,
    equipmentItems,
    materialItems,
    totals: {
      ...item.totals,
      laborSubmitted,
      equipmentSubmitted,
      directCostSubmitted,
      outputSubmitted,
      directUnitCostSubmitted,
      materialsSubmitted,
      directUnitPlusMaterialsSubmitted,
      ocmValue,
      cpValue,
      vatValue,
      totalUnitCostSubmitted,
    },
  };
}

const inputClass = 'w-full rounded-md border border-slate-300 px-2 py-1 text-sm';

export function DupaWorkspaceTab(props: DupaWorkspaceTabProps) {
  const {
    data,
    formatCurrency,
    formatNumber,
    selectedPrintKey,
    onSelectedPrintKeyChange,
    readOnly = false,
    adjustedKeys = [],
    onSaveDupaAdjustment,
    onResetDupaAdjustment,
    laborLocation,
    district,
  } = props;

  const [useLegacyView, setUseLegacyView] = useState(false);
  const [partFilter, setPartFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [adjustedOnly, setAdjustedOnly] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<EditableItem | null>(null);
  const [dirty, setDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [laborRateMap, setLaborRateMap] = useState<Record<string, number>>({});
  const [equipmentOptions, setEquipmentOptions] = useState<Array<{ _id: string; description: string; hourlyRate?: number }>>([]);
  const [materialOptions, setMaterialOptions] = useState<Array<{ materialCode: string; description: string; unit: string; basePrice?: number }>>([]);

  const keyedItems = useMemo<KeyedItem[]>(
    () => data.items.map((item, index) => ({ item, index, key: getItemKey(item, index) })),
    [data.items],
  );

  const partOptions = useMemo(() => Array.from(new Set(keyedItems.map((entry) => entry.item.part))).sort(), [keyedItems]);

  const filteredItems = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    return keyedItems.filter((entry) => {
      if (partFilter !== 'all' && entry.item.part !== partFilter) return false;
      if (adjustedOnly && !adjustedKeys.includes(entry.key)) return false;
      if (!needle) return true;
      const haystack = `${entry.item.payItemNumber} ${entry.item.payItemDescription}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [keyedItems, partFilter, searchTerm, adjustedOnly, adjustedKeys]);

  useEffect(() => {
    if (!filteredItems.length) {
      if (selectedPrintKey !== null) onSelectedPrintKeyChange(null);
      return;
    }
    const hasSelected = selectedPrintKey !== null && filteredItems.some((entry) => entry.key === selectedPrintKey);
    if (!hasSelected) onSelectedPrintKeyChange(filteredItems[0].key);
  }, [filteredItems, onSelectedPrintKeyChange, selectedPrintKey]);

  const selectedEntry = useMemo(
    () => filteredItems.find((entry) => entry.key === selectedPrintKey) || filteredItems[0] || null,
    [filteredItems, selectedPrintKey],
  );

  useEffect(() => {
    const loadMaster = async () => {
      try {
        const laborParams = new URLSearchParams();
        if (laborLocation) laborParams.set('location', laborLocation);
        if (!laborLocation && district) laborParams.set('district', district);
        const laborUrl = laborParams.toString() ? `/api/master/labor?${laborParams.toString()}` : '/api/master/labor';

        const [laborRes, equipmentRes, materialRes] = await Promise.all([
          fetch(laborUrl),
          fetch('/api/master/equipment'),
          fetch('/api/master/materials'),
        ]);

        const [laborJson, equipmentJson, materialJson] = await Promise.all([
          laborRes.json(),
          equipmentRes.json(),
          materialRes.json(),
        ]);

        if (laborRes.ok && laborJson.success && Array.isArray(laborJson.data) && laborJson.data.length > 0) {
          const record = laborJson.data[0];
          const nextMap: Record<string, number> = {};
          LABOR_KEYS.forEach((entry) => {
            const rate = Number(record?.[entry.field] || 0);
            nextMap[normalizeLaborLabel(entry.label)] = rate;
          });
          setLaborRateMap(nextMap);
        }

        if (equipmentRes.ok && equipmentJson.success && Array.isArray(equipmentJson.data)) {
          setEquipmentOptions(
            equipmentJson.data.map((entry: any) => ({
              _id: String(entry._id),
              description: String(entry.description || ''),
              hourlyRate: Number(entry.hourlyRate || 0),
            })),
          );
        }

        if (materialRes.ok && materialJson.success && Array.isArray(materialJson.data)) {
          setMaterialOptions(
            materialJson.data.map((entry: any) => ({
              materialCode: String(entry.materialCode || ''),
              description: String(entry.materialDescription || ''),
              unit: String(entry.unit || ''),
              basePrice: Number(entry.basePrice || 0),
            })),
          );
        }
      } catch (error) {
        console.error('Failed to load DUPA master data', error);
      }
    };

    void loadMaster();
  }, [laborLocation, district]);

  const applyLatestMasterValues = (item: DupaItemBreakdown | EditableItem): EditableItem => {
    const laborItems: EditableLabor[] = (item.laborItems || []).map((row) => {
      const mappedRate = laborRateMap[normalizeLaborLabel(row.designation || '')];
      return { ...row, hourlyRate: mappedRate !== undefined ? mappedRate : safe(row.hourlyRate) };
    });

    const equipmentItems: EditableEquipment[] = (item.equipmentItems || []).map((row) => {
      const selectedById = row.equipmentId ? equipmentOptions.find((entry) => entry._id === row.equipmentId) : undefined;
      const selectedByDescription = !selectedById ? equipmentOptions.find((entry) => entry.description === row.description) : undefined;
      const selected = selectedById || selectedByDescription;
      return {
        ...row,
        equipmentId: selected?._id || row.equipmentId,
        description: selected?.description || row.description,
        hourlyRate: selected?.hourlyRate !== undefined ? selected.hourlyRate : safe(row.hourlyRate),
      };
    });

    const materialItems: EditableMaterial[] = (item.materialItems || []).map((row) => {
      const selectedByCode = row.materialCode ? materialOptions.find((entry) => entry.materialCode === row.materialCode) : undefined;
      const selectedByDescription = !selectedByCode ? materialOptions.find((entry) => entry.description === row.description) : undefined;
      const selected = selectedByCode || selectedByDescription;
      return {
        ...row,
        materialCode: selected?.materialCode || row.materialCode,
        description: selected?.description || row.description,
        unit: selected?.unit || row.unit,
        unitCost: selected?.basePrice !== undefined ? selected.basePrice : safe(row.unitCost),
      };
    });

    return { ...item, laborItems, equipmentItems, materialItems } as EditableItem;
  };

  useEffect(() => {
    if (!selectedEntry) {
      setDraft(null);
      setEditing(false);
      setDirty(false);
      return;
    }
    if (editing) return;
    setDraft(recomputeItem(applyLatestMasterValues(selectedEntry.item)));
    setDirty(false);
  }, [selectedEntry, editing, laborRateMap, equipmentOptions, materialOptions]);

  const selectedKey = selectedEntry?.key || null;

  const updateDraft = (updater: (current: EditableItem) => EditableItem) => {
    setDraft((current) => {
      if (!current) return current;
      return recomputeItem(updater(current));
    });
    setDirty(true);
  };

  const saveCurrent = async () => {
    if (!selectedKey || !draft || !onSaveDupaAdjustment) return;
    setSaving(true);
    try {
      await onSaveDupaAdjustment(selectedKey, recomputeItem(applyLatestMasterValues(draft)));
      setEditing(false);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const resetCurrent = async () => {
    if (!selectedKey || !onResetDupaAdjustment) return;
    setSaving(true);
    try {
      await onResetDupaAdjustment(selectedKey);
      setEditing(false);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const selectedItem = editing && draft ? draft : selectedEntry?.item;
  const directUnitSubtotal = safe(selectedItem?.totals.directUnitPlusMaterialsSubmitted || 0);
  const ocmPercent = safe(selectedItem?.totals.ocmPercent || 0);
  const cpPercent = safe(selectedItem?.totals.cpPercent || 0);
  const vatPercent = safe(selectedItem?.totals.vatPercent || 0);
  const indirectSubtotal = safe(selectedItem?.totals.ocmValue || 0) + safe(selectedItem?.totals.cpValue || 0) + safe(selectedItem?.totals.vatValue || 0);

  if (useLegacyView) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 flex items-center justify-between">
          <span>Legacy DUPA editor mode (backup).</span>
          <button
            type="button"
            onClick={() => setUseLegacyView(false)}
            className="rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
          >
            Return to modern editor
          </button>
        </div>
        <DupaTab {...props} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">DUPA Workspace Editor</h3>
            <p className="text-xs text-slate-600">Editor-first layout with separate DPWH form preview.</p>
          </div>
          <button
            type="button"
            onClick={() => setUseLegacyView(true)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Switch to legacy editor (backup)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="space-y-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search pay item"
              className={inputClass}
            />
            <select value={partFilter} onChange={(e) => setPartFilter(e.target.value)} className={inputClass}>
              <option value="all">All Parts</option>
              {partOptions.map((part) => (
                <option key={part} value={part}>{part}</option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 text-xs text-slate-700">
              <input type="checkbox" checked={adjustedOnly} onChange={(e) => setAdjustedOnly(e.target.checked)} className="h-4 w-4" />
              Adjusted only
            </label>
          </div>
          <ul className="mt-3 max-h-[65vh] space-y-1 overflow-auto">
            {filteredItems.map((entry) => {
              const selected = selectedKey === entry.key;
              const adjusted = adjustedKeys.includes(entry.key);
              return (
                <li key={entry.key}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectedPrintKeyChange(entry.key);
                      setEditing(false);
                      setDirty(false);
                    }}
                    className={`w-full rounded-md border px-2 py-2 text-left ${selected ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    <p className="text-xs font-semibold text-slate-800">{entry.item.part} - {entry.item.payItemNumber}</p>
                    <p className="text-xs text-slate-600 line-clamp-2">{entry.item.payItemDescription}</p>
                    {adjusted && <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">Adjusted</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="space-y-3 min-w-0">
          {!selectedEntry || !selectedItem ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">No DUPA item selected.</div>
          ) : (
            <>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{selectedEntry.item.payItemNumber} - {selectedEntry.item.payItemDescription}</p>
                    <p className="text-xs text-slate-600">{selectedEntry.item.part} | UOM: {selectedEntry.item.unitOfMeasurement} | Qty: {formatNumber(selectedEntry.item.quantity)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!readOnly && !editing && (
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(recomputeItem(applyLatestMasterValues(selectedEntry.item)));
                          setEditing(true);
                          setDirty(false);
                        }}
                        className="rounded-md border border-blue-300 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        Edit
                      </button>
                    )}
                    {!readOnly && editing && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (!draft) return;
                            setDraft(recomputeItem(applyLatestMasterValues(draft)));
                            setDirty(true);
                          }}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          Sync rates
                        </button>
                        <button
                          type="button"
                          onClick={saveCurrent}
                          disabled={saving || !dirty}
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(false);
                            setDirty(false);
                            setDraft(recomputeItem(applyLatestMasterValues(selectedEntry.item)));
                          }}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {!readOnly && adjustedKeys.includes(selectedKey || '') && onResetDupaAdjustment && (
                      <button
                        type="button"
                        onClick={resetCurrent}
                        disabled={saving}
                        className="rounded-md border border-amber-300 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                      >
                        Reset
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPreview((prev) => !prev)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {showPreview ? 'Hide preview' : 'Preview DPWH form'}
                    </button>
                  </div>
                </div>
                {editing && <p className="mt-2 text-xs text-amber-700">{dirty ? 'Unsaved changes' : 'Edit values below, then save.'}</p>}
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="mb-2 text-sm font-semibold text-slate-900">Labor</p>
                  <div className="overflow-auto">
                    <table className="w-full min-w-[640px] table-fixed text-sm">
                      <thead className="text-xs text-slate-600">
                        <tr>
                          <th className="w-[36%] text-left pb-2">Designation</th>
                          <th className="w-[12%] text-right pb-2">Persons</th>
                          <th className="w-[12%] text-right pb-2">Hours</th>
                          <th className="w-[16%] text-right pb-2">Rate</th>
                          <th className="w-[16%] text-right pb-2">Amount</th>
                          <th className="w-[8%] text-center pb-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedItem.laborItems.map((row, idx) => (
                          <tr key={`labor-${idx}`} className="border-t border-slate-100">
                            <td className="py-1.5">
                              {editing ? (
                                <input
                                  list="dupa-labor-suggestions-modern"
                                  className={inputClass}
                                  value={row.designation}
                                  onChange={(e) => updateDraft((current) => {
                                    const laborItems = current.laborItems.map((entry, entryIndex) => {
                                      if (entryIndex !== idx) return entry;
                                      const next = { ...entry, designation: e.target.value };
                                      const mappedRate = laborRateMap[normalizeLaborLabel(next.designation)];
                                      if (mappedRate !== undefined) next.hourlyRate = mappedRate;
                                      return next;
                                    });
                                    return { ...current, laborItems };
                                  })}
                                />
                              ) : row.designation}
                            </td>
                            <td className="py-1.5 text-right tabular-nums">{editing ? <input type="number" className={inputClass} value={row.noOfPersons} onChange={(e) => updateDraft((current) => ({ ...current, laborItems: current.laborItems.map((entry, entryIndex) => entryIndex === idx ? { ...entry, noOfPersons: Number(e.target.value || 0) } : entry) }))} /> : formatNumber(row.noOfPersons)}</td>
                            <td className="py-1.5 text-right tabular-nums">{editing ? <input type="number" className={inputClass} value={row.noOfHours} onChange={(e) => updateDraft((current) => ({ ...current, laborItems: current.laborItems.map((entry, entryIndex) => entryIndex === idx ? { ...entry, noOfHours: Number(e.target.value || 0) } : entry) }))} /> : formatNumber(row.noOfHours)}</td>
                            <td className="py-1.5 text-right tabular-nums">{editing ? <input type="number" className={inputClass} value={row.hourlyRate} onChange={(e) => updateDraft((current) => ({ ...current, laborItems: current.laborItems.map((entry, entryIndex) => entryIndex === idx ? { ...entry, hourlyRate: Number(e.target.value || 0) } : entry) }))} /> : formatNumber(row.hourlyRate)}</td>
                            <td className="py-1.5 text-right tabular-nums">{formatCurrency(row.amount)}</td>
                            <td className="py-1.5 text-center">{editing && selectedItem.laborItems.length > 1 ? <button type="button" className="text-xs text-red-600" onClick={() => updateDraft((current) => ({ ...current, laborItems: current.laborItems.filter((_, entryIndex) => entryIndex !== idx) }))}>Remove</button> : null}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-200 bg-slate-50">
                          <td className="py-2 text-xs font-semibold uppercase tracking-wide text-slate-600" colSpan={4}>
                            Labor Subtotal
                          </td>
                          <td className="py-2 text-right text-sm font-semibold tabular-nums text-slate-900">
                            {formatCurrency(selectedItem.totals.laborSubmitted)}
                          </td>
                          <td className="py-2" />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  {editing && <button type="button" className="mt-2 text-xs font-semibold text-blue-700" onClick={() => updateDraft((current) => ({ ...current, laborItems: [...current.laborItems, { designation: '', noOfPersons: 0, noOfHours: 0, hourlyRate: 0, amount: 0 }] }))}>+ Add labor row</button>}
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="mb-2 text-sm font-semibold text-slate-900">Equipment</p>
                  <div className="overflow-auto">
                    <table className="w-full min-w-[640px] table-fixed text-sm">
                      <thead className="text-xs text-slate-600">
                        <tr>
                          <th className="w-[36%] text-left pb-2">Description</th>
                          <th className="w-[12%] text-right pb-2">Units</th>
                          <th className="w-[12%] text-right pb-2">Hours</th>
                          <th className="w-[16%] text-right pb-2">Rate</th>
                          <th className="w-[16%] text-right pb-2">Amount</th>
                          <th className="w-[8%] text-center pb-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedItem.equipmentItems.map((row, idx) => (
                          <tr key={`equipment-${idx}`} className="border-t border-slate-100">
                            <td className="py-1.5">{editing ? <input list="dupa-equipment-suggestions-modern" className={inputClass} value={row.description} onChange={(e) => updateDraft((current) => ({ ...current, equipmentItems: current.equipmentItems.map((entry, entryIndex) => entryIndex === idx ? { ...entry, description: e.target.value } : entry) }))} /> : row.description}</td>
                            <td className="py-1.5 text-right tabular-nums">{editing ? <input type="number" className={inputClass} value={row.noOfUnits} onChange={(e) => updateDraft((current) => ({ ...current, equipmentItems: current.equipmentItems.map((entry, entryIndex) => entryIndex === idx ? { ...entry, noOfUnits: Number(e.target.value || 0) } : entry) }))} /> : formatNumber(row.noOfUnits)}</td>
                            <td className="py-1.5 text-right tabular-nums">{editing ? <input type="number" className={inputClass} value={row.noOfHours} onChange={(e) => updateDraft((current) => ({ ...current, equipmentItems: current.equipmentItems.map((entry, entryIndex) => entryIndex === idx ? { ...entry, noOfHours: Number(e.target.value || 0) } : entry) }))} /> : formatNumber(row.noOfHours)}</td>
                            <td className="py-1.5 text-right tabular-nums">{editing ? <input type="number" className={inputClass} value={row.hourlyRate} onChange={(e) => updateDraft((current) => ({ ...current, equipmentItems: current.equipmentItems.map((entry, entryIndex) => entryIndex === idx ? { ...entry, hourlyRate: Number(e.target.value || 0) } : entry) }))} /> : formatNumber(row.hourlyRate)}</td>
                            <td className="py-1.5 text-right tabular-nums">{formatCurrency(row.amount)}</td>
                            <td className="py-1.5 text-center">{editing && selectedItem.equipmentItems.length > 1 ? <button type="button" className="text-xs text-red-600" onClick={() => updateDraft((current) => ({ ...current, equipmentItems: current.equipmentItems.filter((_, entryIndex) => entryIndex !== idx) }))}>Remove</button> : null}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-200 bg-slate-50">
                          <td className="py-2 text-xs font-semibold uppercase tracking-wide text-slate-600" colSpan={4}>
                            Equipment Subtotal
                          </td>
                          <td className="py-2 text-right text-sm font-semibold tabular-nums text-slate-900">
                            {formatCurrency(selectedItem.totals.equipmentSubmitted)}
                          </td>
                          <td className="py-2" />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  {editing && <button type="button" className="mt-2 text-xs font-semibold text-blue-700" onClick={() => updateDraft((current) => ({ ...current, equipmentItems: [...current.equipmentItems, { equipmentId: '', description: '', noOfUnits: 0, noOfHours: 0, hourlyRate: 0, amount: 0 }] }))}>+ Add equipment row</button>}
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="mb-2 text-sm font-semibold text-slate-900">Materials</p>
                  <div className="overflow-auto">
                    <table className="w-full min-w-[640px] table-fixed text-sm">
                      <thead className="text-xs text-slate-600">
                        <tr>
                          <th className="w-[36%] text-left pb-2">Description</th>
                          <th className="w-[16%] text-left pb-2">Unit</th>
                          <th className="w-[12%] text-right pb-2">Qty</th>
                          <th className="w-[16%] text-right pb-2">Unit Cost</th>
                          <th className="w-[12%] text-right pb-2">Amount</th>
                          <th className="w-[8%] text-center pb-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedItem.materialItems.map((row, idx) => (
                          <tr key={`material-${idx}`} className="border-t border-slate-100">
                            <td className="py-1.5">{editing ? <input list="dupa-material-suggestions-modern" className={inputClass} value={row.description} onChange={(e) => updateDraft((current) => ({ ...current, materialItems: current.materialItems.map((entry, entryIndex) => entryIndex === idx ? { ...entry, description: e.target.value } : entry) }))} /> : row.description}</td>
                            <td className="py-1.5">{editing ? <input className={inputClass} value={row.unit} onChange={(e) => updateDraft((current) => ({ ...current, materialItems: current.materialItems.map((entry, entryIndex) => entryIndex === idx ? { ...entry, unit: e.target.value } : entry) }))} /> : row.unit}</td>
                            <td className="py-1.5 text-right tabular-nums">{editing ? <input type="number" className={inputClass} value={row.quantity} onChange={(e) => updateDraft((current) => ({ ...current, materialItems: current.materialItems.map((entry, entryIndex) => entryIndex === idx ? { ...entry, quantity: Number(e.target.value || 0) } : entry) }))} /> : formatNumber(row.quantity)}</td>
                            <td className="py-1.5 text-right tabular-nums">{editing ? <input type="number" className={inputClass} value={row.unitCost} onChange={(e) => updateDraft((current) => ({ ...current, materialItems: current.materialItems.map((entry, entryIndex) => entryIndex === idx ? { ...entry, unitCost: Number(e.target.value || 0) } : entry) }))} /> : formatCurrency(row.unitCost)}</td>
                            <td className="py-1.5 text-right tabular-nums">{formatCurrency(row.amount)}</td>
                            <td className="py-1.5 text-center">{editing && selectedItem.materialItems.length > 1 ? <button type="button" className="text-xs text-red-600" onClick={() => updateDraft((current) => ({ ...current, materialItems: current.materialItems.filter((_, entryIndex) => entryIndex !== idx) }))}>Remove</button> : null}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-200 bg-slate-50">
                          <td className="py-2 text-xs font-semibold uppercase tracking-wide text-slate-600" colSpan={4}>
                            Material Subtotal
                          </td>
                          <td className="py-2 text-right text-sm font-semibold tabular-nums text-slate-900">
                            {formatCurrency(selectedItem.totals.materialsSubmitted)}
                          </td>
                          <td className="py-2" />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  {editing && <button type="button" className="mt-2 text-xs font-semibold text-blue-700" onClick={() => updateDraft((current) => ({ ...current, materialItems: [...current.materialItems, { materialCode: '', description: '', unit: '', quantity: 0, unitCost: 0, amount: 0 }] }))}>+ Add material row</button>}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="mb-2 text-sm font-semibold text-slate-900">Totals</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                  <div className="rounded border border-slate-200 p-2"><p className="text-xs text-slate-500">Labor</p><p className="font-semibold tabular-nums">{formatCurrency(selectedItem.totals.laborSubmitted)}</p></div>
                  <div className="rounded border border-slate-200 p-2"><p className="text-xs text-slate-500">Equipment</p><p className="font-semibold tabular-nums">{formatCurrency(selectedItem.totals.equipmentSubmitted)}</p></div>
                  <div className="rounded border border-slate-200 p-2"><p className="text-xs text-slate-500">Materials</p><p className="font-semibold tabular-nums">{formatCurrency(selectedItem.totals.materialsSubmitted)}</p></div>
                  <div className="rounded border border-slate-200 bg-slate-50 p-2"><p className="text-xs text-slate-500">Direct Unit Subtotal</p><p className="font-semibold tabular-nums">{formatCurrency(directUnitSubtotal)}</p></div>
                  <div className="rounded border border-amber-200 bg-amber-50 p-2"><p className="text-xs text-amber-700">Indirect Cost Subtotal</p><p className="font-semibold text-amber-800 tabular-nums">{formatCurrency(indirectSubtotal)}</p></div>
                  <div className="rounded border border-amber-200 bg-amber-50 p-2"><p className="text-xs text-amber-700">OCM ({formatNumber(ocmPercent)}%)</p><p className="font-semibold text-amber-800 tabular-nums">{formatCurrency(selectedItem.totals.ocmValue)}</p></div>
                  <div className="rounded border border-amber-200 bg-amber-50 p-2"><p className="text-xs text-amber-700">CP ({formatNumber(cpPercent)}%)</p><p className="font-semibold text-amber-800 tabular-nums">{formatCurrency(selectedItem.totals.cpValue)}</p></div>
                  <div className="rounded border border-amber-200 bg-amber-50 p-2"><p className="text-xs text-amber-700">VAT ({formatNumber(vatPercent)}%)</p><p className="font-semibold text-amber-800 tabular-nums">{formatCurrency(selectedItem.totals.vatValue)}</p></div>
                  <div className="rounded border border-blue-200 bg-blue-50 p-2"><p className="text-xs text-blue-600">Total Unit Cost</p><p className="font-semibold text-blue-800 tabular-nums">{formatCurrency(selectedItem.totals.totalUnitCostSubmitted)}</p></div>
                </div>
                <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  <p className="font-semibold text-slate-800">How final unit price is derived</p>
                  <p className="mt-1 tabular-nums">
                    {formatCurrency(directUnitSubtotal)} + {formatCurrency(indirectSubtotal)} (Indirect: OCM + CP + VAT) = {formatCurrency(selectedItem.totals.totalUnitCostSubmitted)}
                  </p>
                  <p className="mt-1 tabular-nums">
                    OCM: {formatCurrency(selectedItem.totals.ocmValue)} | CP: {formatCurrency(selectedItem.totals.cpValue)} | VAT: {formatCurrency(selectedItem.totals.vatValue)}
                  </p>
                </div>
              </div>

              {showPreview && (
                <div className="rounded-lg border border-slate-200 bg-white p-2">
                  <FormDUPAPage
                    report={data}
                    item={selectedItem as DupaItemBreakdown}
                    pageNumber="DUPA-Preview"
                    formatCurrency={formatCurrency}
                    formatNumber={formatNumber}
                    editable={false}
                  />
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <datalist id="dupa-labor-suggestions-modern">
        {uniqueSuggestions(LABOR_KEYS.map((entry) => entry.label)).map((label, index) => (
          <option key={`${label}-${index}`} value={label} />
        ))}
      </datalist>
      <datalist id="dupa-equipment-suggestions-modern">
        {uniqueSuggestions(equipmentOptions.map((entry) => entry.description)).map((label, index) => (
          <option key={`${label}-${index}`} value={label} />
        ))}
      </datalist>
      <datalist id="dupa-material-suggestions-modern">
        {uniqueSuggestions(materialOptions.map((entry) => entry.description)).map((label, index) => (
          <option key={`${label}-${index}`} value={label} />
        ))}
      </datalist>
    </div>
  );
}
