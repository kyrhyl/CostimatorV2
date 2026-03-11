import { useEffect, useMemo, useState } from 'react';
import Combobox from '@/components/Combobox';
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
  `${item.part}-${item.payItemNumber}-${item.payItemDescription}::${index}`;

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

  const [laborRateMap, setLaborRateMap] = useState<Record<string, number>>({});
  const [equipmentOptions, setEquipmentOptions] = useState<Array<{ _id: string; description: string; hourlyRate?: number }>>([]);
  const [materialOptions, setMaterialOptions] = useState<Array<{ materialCode: string; description: string; unit: string; basePrice?: number }>>([]);
  const [equipmentSearchLoading, setEquipmentSearchLoading] = useState(false);
  const [materialSearchLoading, setMaterialSearchLoading] = useState(false);

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

  const laborDesignationOptions = useMemo(
    () => LABOR_KEYS.map((entry) => ({ value: entry.label, label: entry.label })),
    [],
  );

  const equipmentDropdownOptions = useMemo(
    () => equipmentOptions.map((entry) => ({ value: entry._id, label: entry.description })),
    [equipmentOptions],
  );

  const materialDropdownOptions = useMemo(
    () => materialOptions.map((entry) => ({ value: entry.materialCode, label: entry.description })),
    [materialOptions],
  );

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
      return;
    }
    if (editing) return;
    setDraft(recomputeItem(applyLatestMasterValues(selectedEntry.item)));
  }, [selectedEntry, editing, laborRateMap, equipmentOptions, materialOptions]);

  const selectedKey = selectedEntry?.key || null;

  useEffect(() => {
    if (readOnly && editing) setEditing(false);
  }, [readOnly, editing]);

  const handleEquipmentSearch = async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    setEquipmentSearchLoading(true);
    try {
      const res = await fetch(`/api/master/equipment?search=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setEquipmentOptions(
          data.data.map((entry: any) => ({ _id: String(entry._id), description: String(entry.description || ''), hourlyRate: Number(entry.hourlyRate || 0) })),
        );
      }
    } catch (error) {
      console.error('Failed to search equipment', error);
    } finally {
      setEquipmentSearchLoading(false);
    }
  };

  const handleMaterialSearch = async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    setMaterialSearchLoading(true);
    try {
      const res = await fetch(`/api/master/materials?search=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setMaterialOptions(
          data.data.map((entry: any) => ({
            materialCode: String(entry.materialCode || ''),
            description: String(entry.materialDescription || ''),
            unit: String(entry.unit || ''),
            basePrice: Number(entry.basePrice || 0),
          })),
        );
      }
    } catch (error) {
      console.error('Failed to search materials', error);
    } finally {
      setMaterialSearchLoading(false);
    }
  };

  const saveCurrent = async () => {
    if (!selectedKey || !draft || !onSaveDupaAdjustment) return;
    setSaving(true);
    try {
      await onSaveDupaAdjustment(selectedKey, recomputeItem(applyLatestMasterValues(draft)));
      setEditing(false);
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
    } finally {
      setSaving(false);
    }
  };

  if (!data.items.length) {
    return <div className="bg-white border border-gray-200 rounded-lg p-6 text-sm text-gray-600">No DUPA items found for this project.</div>;
  }

  return (
    <div className="space-y-2">
      <div className="sticky top-20 z-10 bg-white/95 backdrop-blur border border-gray-200 rounded-lg p-2 no-print print:hidden" data-print-hide="true">
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_auto] gap-2 items-center">
          <select
            value={partFilter}
            onChange={(e) => setPartFilter(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
          >
            <option value="all">All Parts</option>
            {partOptions.map((part) => (
              <option key={part} value={part}>{part}</option>
            ))}
          </select>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search pay item no. or description"
            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
          />
          <label className="inline-flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 rounded-md border border-gray-200 bg-white">
            <input
              type="checkbox"
              checked={adjustedOnly}
              onChange={(e) => setAdjustedOnly(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            Adjusted only
          </label>
        </div>
      </div>

      <div className="space-y-3">
        {!filteredItems.length && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-sm text-gray-600">
            No DUPA items match the current filters.
          </div>
        )}

        {filteredItems.map((entry) => {
          const isSelected = selectedKey === entry.key;
          const isAdjusted = adjustedKeys.includes(entry.key);
          const renderedItem = isSelected && draft ? recomputeItem(draft) : entry.item;

          return (
            <div key={entry.key} className="space-y-2">
              <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 no-print print:hidden" data-print-hide="true">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{entry.item.part} - {entry.item.payItemNumber}</p>
                    <p className="text-xs text-gray-500">{entry.item.payItemDescription}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdjusted && <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded">ADJUSTED</span>}
                    {!isSelected && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectedPrintKeyChange(entry.key);
                          setEditing(false);
                        }}
                        className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50"
                      >
                        Set active
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {!readOnly && isSelected && renderedItem && (
                <div className="bg-white border border-gray-200 rounded-lg p-3 no-print print:hidden" data-print-hide="true">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Edit DUPA Build-Up</p>
                  <p className="text-xs text-gray-500">Using latest master rates on load. Quantity remains fixed by BOQ/takeoff.</p>
                </div>
                <div className="flex gap-2">
                  {!editing ? (
                    <button type="button" onClick={() => { setDraft(recomputeItem(applyLatestMasterValues(entry.item))); setEditing(true); }} className="px-3 py-1.5 text-sm rounded border border-blue-300 text-blue-700 hover:bg-blue-50">Edit DUPA</button>
                  ) : (
                    <>
                      <button type="button" onClick={saveCurrent} disabled={saving} className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving...' : 'Save'}</button>
                      <button type="button" onClick={() => { setEditing(false); setDraft(recomputeItem(applyLatestMasterValues(entry.item))); }} className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50">Cancel</button>
                    </>
                  )}
                  {adjustedKeys.includes(selectedKey || '') && onResetDupaAdjustment && (
                    <button type="button" onClick={resetCurrent} disabled={saving} className="px-3 py-1.5 text-sm rounded border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-60">Reset</button>
                  )}
                </div>
              </div>

              {editing && draft && (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded border border-gray-200 p-2">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Labor</p>
                      {draft.laborItems.map((row, i) => (
                        <div key={`l-${i}`} className="mb-2">
                          <Combobox
                            options={laborDesignationOptions}
                            value={row.designation}
                            onChange={(value) => {
                              const mappedRate = laborRateMap[normalizeLaborLabel(value)] || 0;
                              setDraft((prev) => prev ? recomputeItem({
                                ...prev,
                                laborItems: prev.laborItems.map((x, idx) => idx === i ? { ...x, designation: value, hourlyRate: mappedRate } : x),
                              }) : prev);
                            }}
                            placeholder="Select labor designation"
                            className="text-xs"
                          />
                          <div className="grid grid-cols-3 gap-1 mt-1">
                            <input type="number" value={row.noOfPersons} onChange={(e) => setDraft((prev) => prev ? recomputeItem({ ...prev, laborItems: prev.laborItems.map((x, idx) => idx === i ? { ...x, noOfPersons: Number(e.target.value || 0) } : x) }) : prev)} className="px-2 py-1 border border-gray-300 rounded text-xs" placeholder="Persons" />
                            <input type="number" value={row.noOfHours} onChange={(e) => setDraft((prev) => prev ? recomputeItem({ ...prev, laborItems: prev.laborItems.map((x, idx) => idx === i ? { ...x, noOfHours: Number(e.target.value || 0) } : x) }) : prev)} className="px-2 py-1 border border-gray-300 rounded text-xs" placeholder="Hours" />
                            <input type="number" value={row.hourlyRate} disabled className="px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50" placeholder="Rate" />
                          </div>
                          <button type="button" onClick={() => setDraft((prev) => prev ? recomputeItem({ ...prev, laborItems: prev.laborItems.filter((_, idx) => idx !== i) }) : prev)} className="text-[11px] text-red-600 hover:text-red-700 mt-1">Remove labor row</button>
                        </div>
                      ))}
                      <button type="button" onClick={() => setDraft((prev) => prev ? recomputeItem({ ...prev, laborItems: [...prev.laborItems, { designation: '', noOfPersons: 0, noOfHours: 0, hourlyRate: 0, amount: 0 }] }) : prev)} className="text-xs text-blue-700">+ Add labor</button>
                    </div>

                    <div className="rounded border border-gray-200 p-2">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Equipment</p>
                      {draft.equipmentItems.map((row, i) => (
                        <div key={`e-${i}`} className="mb-2">
                          <Combobox
                            options={equipmentDropdownOptions}
                            value={row.equipmentId || ''}
                            selectedLabel={row.description}
                            onSearch={handleEquipmentSearch}
                            loading={equipmentSearchLoading}
                            onChange={(value) => {
                              const selected = equipmentOptions.find((entry) => entry._id === value);
                              setDraft((prev) => prev ? recomputeItem({
                                ...prev,
                                equipmentItems: prev.equipmentItems.map((x, idx) =>
                                  idx === i
                                    ? { ...x, equipmentId: value, description: selected?.description || '', hourlyRate: selected?.hourlyRate || 0 }
                                    : x,
                                ),
                              }) : prev);
                            }}
                            placeholder="Search equipment"
                            className="text-xs"
                          />
                          <div className="grid grid-cols-3 gap-1 mt-1">
                            <input type="number" value={row.noOfUnits} onChange={(e) => setDraft((prev) => prev ? recomputeItem({ ...prev, equipmentItems: prev.equipmentItems.map((x, idx) => idx === i ? { ...x, noOfUnits: Number(e.target.value || 0) } : x) }) : prev)} className="px-2 py-1 border border-gray-300 rounded text-xs" placeholder="Units" />
                            <input type="number" value={row.noOfHours} onChange={(e) => setDraft((prev) => prev ? recomputeItem({ ...prev, equipmentItems: prev.equipmentItems.map((x, idx) => idx === i ? { ...x, noOfHours: Number(e.target.value || 0) } : x) }) : prev)} className="px-2 py-1 border border-gray-300 rounded text-xs" placeholder="Hours" />
                            <input type="number" value={row.hourlyRate} disabled className="px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50" placeholder="Rate" />
                          </div>
                          <button type="button" onClick={() => setDraft((prev) => prev ? recomputeItem({ ...prev, equipmentItems: prev.equipmentItems.filter((_, idx) => idx !== i) }) : prev)} className="text-[11px] text-red-600 hover:text-red-700 mt-1">Remove equipment row</button>
                        </div>
                      ))}
                      <button type="button" onClick={() => setDraft((prev) => prev ? recomputeItem({ ...prev, equipmentItems: [...prev.equipmentItems, { equipmentId: '', description: '', noOfUnits: 0, noOfHours: 0, hourlyRate: 0, amount: 0 }] }) : prev)} className="text-xs text-blue-700">+ Add equipment</button>
                    </div>

                    <div className="rounded border border-gray-200 p-2">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Materials</p>
                      {draft.materialItems.map((row, i) => (
                        <div key={`m-${i}`} className="mb-2">
                          <Combobox
                            options={materialDropdownOptions}
                            value={row.materialCode || ''}
                            selectedLabel={row.description}
                            onSearch={handleMaterialSearch}
                            loading={materialSearchLoading}
                            onChange={(value) => {
                              const selected = materialOptions.find((entry) => entry.materialCode === value);
                              setDraft((prev) => prev ? recomputeItem({
                                ...prev,
                                materialItems: prev.materialItems.map((x, idx) =>
                                  idx === i
                                    ? {
                                        ...x,
                                        materialCode: value,
                                        description: selected?.description || '',
                                        unit: selected?.unit || '',
                                        unitCost: selected?.basePrice || 0,
                                      }
                                    : x,
                                ),
                              }) : prev);
                            }}
                            placeholder="Search material"
                            className="text-xs"
                          />
                          <div className="grid grid-cols-3 gap-1 mt-1">
                            <input value={row.unit} disabled className="px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50" placeholder="Unit" />
                            <input type="number" value={row.quantity} onChange={(e) => setDraft((prev) => prev ? recomputeItem({ ...prev, materialItems: prev.materialItems.map((x, idx) => idx === i ? { ...x, quantity: Number(e.target.value || 0) } : x) }) : prev)} className="px-2 py-1 border border-gray-300 rounded text-xs" placeholder="Qty" />
                            <input type="number" value={row.unitCost} disabled className="px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50" placeholder="Unit cost" />
                          </div>
                          <button type="button" onClick={() => setDraft((prev) => prev ? recomputeItem({ ...prev, materialItems: prev.materialItems.filter((_, idx) => idx !== i) }) : prev)} className="text-[11px] text-red-600 hover:text-red-700 mt-1">Remove material row</button>
                        </div>
                      ))}
                      <button type="button" onClick={() => setDraft((prev) => prev ? recomputeItem({ ...prev, materialItems: [...prev.materialItems, { materialCode: '', description: '', unit: '', quantity: 0, unitCost: 0, amount: 0 }] }) : prev)} className="text-xs text-blue-700">+ Add material</button>
                    </div>
                  </div>
                </div>
              )}
                </div>
              )}

              <FormDUPAPage
                report={data}
                item={renderedItem}
                pageNumber="DUPA-Preview"
                formatCurrency={formatCurrency}
                formatNumber={formatNumber}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
