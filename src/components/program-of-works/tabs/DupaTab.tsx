import { useEffect, useMemo, useState } from 'react';
import type { DupaItemBreakdown, DupaReportData } from '@/types/dupa';
import { FormDUPAPage } from '../forms/FormDUPAPage';

interface DupaTabProps {
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

  const baseDirectPlusMaterials = item.totals.directUnitPlusMaterialsSubmitted || 1;
  const scale = baseDirectPlusMaterials > 0 ? directUnitPlusMaterialsSubmitted / baseDirectPlusMaterials : 1;

  const ocmValue = item.totals.ocmValue * scale;
  const cpValue = item.totals.cpValue * scale;
  const vatValue = item.totals.vatValue * scale;
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

export function DupaTab({
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
}: DupaTabProps) {
  const [partFilter, setPartFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [adjustedOnly, setAdjustedOnly] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<EditableItem | null>(null);
  const [dirty, setDirty] = useState(false);

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
              description: String(entry.completeDescription || entry.description || ''),
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
      return {
        ...row,
        hourlyRate: mappedRate !== undefined ? mappedRate : safe(row.hourlyRate),
      };
    });

    const equipmentItems: EditableEquipment[] = (item.equipmentItems || []).map((row) => {
      const selectedById = row.equipmentId ? equipmentOptions.find((entry) => entry._id === row.equipmentId) : undefined;
      const selectedByDescription = !selectedById
        ? equipmentOptions.find((entry) => entry.description === row.description)
        : undefined;
      const selected = selectedById || selectedByDescription;
      return {
        ...row,
        equipmentId: selected?._id || row.equipmentId,
        description: selected?.description || row.description,
        hourlyRate: selected?.hourlyRate !== undefined ? selected.hourlyRate : safe(row.hourlyRate),
      };
    });

    const materialItems: EditableMaterial[] = (item.materialItems || []).map((row) => {
      const selectedByCode = row.materialCode
        ? materialOptions.find((entry) => entry.materialCode === row.materialCode)
        : undefined;
      const selectedByDescription = !selectedByCode
        ? materialOptions.find((entry) => entry.description === row.description)
        : undefined;
      const selected = selectedByCode || selectedByDescription;
      return {
        ...row,
        materialCode: selected?.materialCode || row.materialCode,
        description: selected?.description || row.description,
        unit: selected?.unit || row.unit,
        unitCost: selected?.basePrice !== undefined ? selected.basePrice : safe(row.unitCost),
      };
    });

    return {
      ...item,
      laborItems,
      equipmentItems,
      materialItems,
    } as EditableItem;
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

  useEffect(() => {
    if (readOnly && editing) setEditing(false);
  }, [readOnly, editing]);

  const confirmDiscardIfNeeded = () => {
    if (!editing || !dirty) return true;
    return window.confirm('You have unsaved DUPA changes. Discard and continue?');
  };

  const changeSelectedItem = (key: string) => {
    if (!confirmDiscardIfNeeded()) return;
    onSelectedPrintKeyChange(key);
    setEditing(false);
    setDirty(false);
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

  const applyMasterRatesToDraft = () => {
    if (!draft) return;
    setDraft(recomputeItem(applyLatestMasterValues(draft)));
    setDirty(true);
  };

  const updateDraft = (updater: (current: EditableItem) => EditableItem) => {
    setDraft((current) => {
      if (!current) return current;
      const next = recomputeItem(updater(current));
      return next;
    });
    setDirty(true);
  };

  const laborSuggestions = useMemo(() => uniqueSuggestions(LABOR_KEYS.map((entry) => entry.label)), []);
  const equipmentSuggestions = useMemo(
    () => uniqueSuggestions(equipmentOptions.map((entry) => entry.description)),
    [equipmentOptions],
  );
  const materialSuggestions = useMemo(
    () => uniqueSuggestions(materialOptions.map((entry) => entry.description)),
    [materialOptions],
  );

  if (!data.items.length) {
    return <div className="bg-white border border-gray-200 rounded-lg p-6 text-sm text-gray-600">No DUPA items found for this project.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="sticky top-20 z-10 rounded-lg border border-gray-200 bg-white/95 p-3 backdrop-blur no-print print:hidden" data-print-hide="true">
        <div className="grid grid-cols-1 gap-2 xl:grid-cols-[minmax(0,1fr)_200px_auto]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              if (!confirmDiscardIfNeeded()) return;
              setSearchTerm(e.target.value);
            }}
            placeholder="Search pay item number or description"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={partFilter}
            onChange={(e) => {
              if (!confirmDiscardIfNeeded()) return;
              setPartFilter(e.target.value);
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">All Parts</option>
            {partOptions.map((part) => (
              <option key={part} value={part}>{part}</option>
            ))}
          </select>
          <label className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={adjustedOnly}
              onChange={(e) => {
                if (!confirmDiscardIfNeeded()) return;
                setAdjustedOnly(e.target.checked);
              }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            Adjusted only
          </label>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
          <span className="rounded-full bg-slate-100 px-2 py-0.5">Total: {keyedItems.length}</span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">Visible: {filteredItems.length}</span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">Adjusted: {adjustedKeys.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-gray-200 bg-white no-print print:hidden" data-print-hide="true">
          <div className="max-h-[70vh] overflow-auto">
            {!filteredItems.length ? (
              <p className="p-4 text-sm text-gray-600">No DUPA items match the current filters.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filteredItems.map((entry) => {
                  const isSelected = selectedKey === entry.key;
                  const isAdjusted = adjustedKeys.includes(entry.key);
                  return (
                    <li key={entry.key}>
                      <button
                        type="button"
                        onClick={() => changeSelectedItem(entry.key)}
                        className={`w-full px-3 py-2 text-left transition ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-gray-800">{entry.item.part} · {entry.item.payItemNumber}</p>
                          {isAdjusted && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">ADJ</span>}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">{entry.item.payItemDescription}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <div className="space-y-2 min-w-0">
          {selectedEntry && (
            <div className="sticky top-[134px] z-[9] rounded-lg border border-gray-200 bg-white/95 p-3 backdrop-blur no-print print:hidden" data-print-hide="true">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{selectedEntry.item.part} - {selectedEntry.item.payItemNumber}</p>
                  <p className="text-xs text-gray-600">{selectedEntry.item.payItemDescription}</p>
                  <p className="mt-1 text-xs text-gray-500">Edit directly inside the DUPA form table below.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!readOnly && editing && (
                    <button
                      type="button"
                      onClick={applyMasterRatesToDraft}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Sync Latest Rates
                    </button>
                  )}
                  {!readOnly && !editing ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(recomputeItem(applyLatestMasterValues(selectedEntry.item)));
                        setEditing(true);
                        setDirty(false);
                      }}
                      className="rounded-md border border-blue-300 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      Edit Inline
                    </button>
                  ) : null}
                  {!readOnly && editing ? (
                    <>
                      <button
                        type="button"
                        onClick={saveCurrent}
                        disabled={saving || !dirty}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(false);
                          setDirty(false);
                          if (selectedEntry) {
                            setDraft(recomputeItem(applyLatestMasterValues(selectedEntry.item)));
                          }
                        }}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </>
                  ) : null}
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
                </div>
              </div>
              {editing && (
                <p className="mt-2 text-xs font-medium text-amber-700">
                  {dirty ? 'You have unsaved changes.' : 'Edit values directly in the form. Save when done.'}
                </p>
              )}
            </div>
          )}

          {selectedEntry && (draft || selectedEntry.item) && (
            <FormDUPAPage
              report={data}
              item={(editing && draft ? draft : selectedEntry.item) as DupaItemBreakdown}
              pageNumber="DUPA-Preview"
              formatCurrency={formatCurrency}
              formatNumber={formatNumber}
              editable={!readOnly && editing}
              laborSuggestions={laborSuggestions}
              equipmentSuggestions={equipmentSuggestions}
              materialSuggestions={materialSuggestions}
              onLaborFieldChange={(index, field, value) => {
                updateDraft((current) => {
                  const laborItems = current.laborItems.map((row, rowIndex) => {
                    if (rowIndex !== index) return row;
                    const next = { ...row };
                    if (field === 'designation') {
                      next.designation = String(value);
                      const mappedRate = laborRateMap[normalizeLaborLabel(next.designation)];
                      if (mappedRate !== undefined) next.hourlyRate = mappedRate;
                    } else {
                      (next as any)[field] = Number(value || 0);
                    }
                    return next;
                  });
                  return { ...current, laborItems };
                });
              }}
              onEquipmentFieldChange={(index, field, value) => {
                updateDraft((current) => {
                  const equipmentItems = current.equipmentItems.map((row, rowIndex) => {
                    if (rowIndex !== index) return row;
                    const next = { ...row };
                    if (field === 'description') {
                      next.description = String(value);
                      const selected = equipmentOptions.find((option) => option.description === next.description);
                      if (selected) {
                        next.equipmentId = selected._id;
                        next.hourlyRate = Number(selected.hourlyRate || 0);
                      }
                    } else {
                      (next as any)[field] = Number(value || 0);
                    }
                    return next;
                  });
                  return { ...current, equipmentItems };
                });
              }}
              onMaterialFieldChange={(index, field, value) => {
                updateDraft((current) => {
                  const materialItems = current.materialItems.map((row, rowIndex) => {
                    if (rowIndex !== index) return row;
                    const next = { ...row };
                    if (field === 'description') {
                      next.description = String(value);
                      const selected = materialOptions.find((option) => option.description === next.description);
                      if (selected) {
                        next.materialCode = selected.materialCode;
                        next.unit = selected.unit;
                        next.unitCost = Number(selected.basePrice || 0);
                      }
                    } else if (field === 'unit') {
                      next.unit = String(value);
                    } else {
                      (next as any)[field] = Number(value || 0);
                    }
                    return next;
                  });
                  return { ...current, materialItems };
                });
              }}
              onAddLaborRow={() => {
                updateDraft((current) => ({
                  ...current,
                  laborItems: [...current.laborItems, { designation: '', noOfPersons: 0, noOfHours: 0, hourlyRate: 0, amount: 0 }],
                }));
              }}
              onAddEquipmentRow={() => {
                updateDraft((current) => ({
                  ...current,
                  equipmentItems: [...current.equipmentItems, { equipmentId: '', description: '', noOfUnits: 0, noOfHours: 0, hourlyRate: 0, amount: 0 }],
                }));
              }}
              onAddMaterialRow={() => {
                updateDraft((current) => ({
                  ...current,
                  materialItems: [...current.materialItems, { materialCode: '', description: '', unit: '', quantity: 0, unitCost: 0, amount: 0 }],
                }));
              }}
              onRemoveLaborRow={(index) => {
                updateDraft((current) => ({
                  ...current,
                  laborItems: current.laborItems.filter((_, rowIndex) => rowIndex !== index),
                }));
              }}
              onRemoveEquipmentRow={(index) => {
                updateDraft((current) => ({
                  ...current,
                  equipmentItems: current.equipmentItems.filter((_, rowIndex) => rowIndex !== index),
                }));
              }}
              onRemoveMaterialRow={(index) => {
                updateDraft((current) => ({
                  ...current,
                  materialItems: current.materialItems.filter((_, rowIndex) => rowIndex !== index),
                }));
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
