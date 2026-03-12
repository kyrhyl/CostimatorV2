
'use client';

import { Fragment, useMemo, useState } from 'react';
import { computePercentOfProjectCost } from '@/lib/utils/pow-math';

interface ItemLine {
  id: string;
  lineKey: string;
  part: string;
  itemNo: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  directCost: number;
  totalAmount: number;
  adjusted?: boolean;
  adjustmentReason?: string;
}

interface PartGroup {
  part: string;
  description: string;
  items: ItemLine[];
  totalAmount: number;
}

interface ProgramOfWorksItemizedTableProps {
  groups: PartGroup[];
  grandTotal: number;
  editable?: boolean;
  compact?: boolean;
  onSaveAdjustment?: (input: { lineKey: string; payItemNumber: string; quantity: number; unitCost: number; reason: string }) => Promise<void>;
  onClearAdjustment?: (lineKey: string) => Promise<void>;
}

export default function ProgramOfWorksItemizedTable({
  groups,
  grandTotal,
  editable = false,
  compact = false,
  onSaveAdjustment,
  onClearAdjustment,
}: ProgramOfWorksItemizedTableProps) {
  const [editingLineKey, setEditingLineKey] = useState<string | null>(null);
  const [draftQuantity, setDraftQuantity] = useState<number>(0);
  const [draftUnitCost, setDraftUnitCost] = useState<number>(0);
  const [draftReason, setDraftReason] = useState('');
  const [saving, setSaving] = useState(false);

  const formatCurrency = (value: number) => {
    return '₱' + value.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatPercent = (value: number) => {
    if (!Number.isFinite(value)) return '0.00%';
    return `${value.toFixed(2)}%`;
  };

  const hasAdjustments = useMemo(
    () => groups.some((group) => group.items.some((item) => item.adjusted)),
    [groups],
  );

  const openEditor = (item: ItemLine) => {
    setEditingLineKey(item.lineKey);
    setDraftQuantity(item.quantity);
    setDraftUnitCost(item.unitCost);
    setDraftReason(item.adjustmentReason || '');
  };

  const resetEditor = () => {
    setEditingLineKey(null);
    setDraftQuantity(0);
    setDraftUnitCost(0);
    setDraftReason('');
  };

  const saveEditor = async (item: ItemLine) => {
    if (!onSaveAdjustment) return;
    setSaving(true);
    try {
      await onSaveAdjustment({
        lineKey: item.lineKey,
        payItemNumber: item.itemNo,
        quantity: draftQuantity,
        unitCost: draftUnitCost,
        reason: draftReason,
      });
      resetEditor();
    } finally {
      setSaving(false);
    }
  };

  const clearRowAdjustment = async (item: ItemLine) => {
    if (!onClearAdjustment) return;
    setSaving(true);
    try {
      await onClearAdjustment(item.lineKey);
      if (editingLineKey === item.lineKey) {
        resetEditor();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Project Breakdown Structure</h3>
            <p className="text-sm text-gray-500 mt-1">
              {editable
                ? 'Adjust quantity and unit cost directly in workspace.'
                : 'Submitted cost summary by part and item.'}
            </p>
          </div>
          {hasAdjustments && <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded">Adjusted View</span>}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            <tr>
              <th className={`px-4 ${compact ? 'py-2' : 'py-3'} text-left text-xs font-semibold text-gray-500 uppercase`}>Item No.</th>
              <th className={`px-4 ${compact ? 'py-2' : 'py-3'} text-left text-xs font-semibold text-gray-500 uppercase`}>Description</th>
              <th className={`px-4 ${compact ? 'py-2' : 'py-3'} text-right text-xs font-semibold text-gray-500 uppercase`}>Quantity</th>
              <th className={`px-4 ${compact ? 'py-2' : 'py-3'} text-left text-xs font-semibold text-gray-500 uppercase`}>Unit</th>
              <th className={`px-4 ${compact ? 'py-2' : 'py-3'} text-right text-xs font-semibold text-gray-500 uppercase`}>Unit Cost</th>
              <th className={`px-4 ${compact ? 'py-2' : 'py-3'} text-right text-xs font-semibold text-gray-500 uppercase`}>Direct Cost</th>
              <th className={`px-4 ${compact ? 'py-2' : 'py-3'} text-right text-xs font-semibold text-gray-500 uppercase`}>% Cost</th>
              {editable && <th className={`px-4 ${compact ? 'py-2' : 'py-3'} text-right text-xs font-semibold text-gray-500 uppercase`}>Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {groups.map((group) => {
              const partPercent = computePercentOfProjectCost(group.totalAmount, grandTotal);
              return (
                <Fragment key={group.part}>
                  <tr key={`${group.part}-header`} className="bg-gray-50">
                    <td className={`px-4 ${compact ? 'py-2' : 'py-3'} text-sm font-semibold text-gray-800`}>
                      {group.part}
                    </td>
                    <td className={`px-4 ${compact ? 'py-2' : 'py-3'} text-sm font-semibold text-gray-700`} colSpan={4}>
                      {group.description}
                    </td>
                    <td className={`px-4 ${compact ? 'py-2' : 'py-3'} text-right text-sm font-semibold text-gray-900`}>
                      {formatCurrency(group.totalAmount)}
                    </td>
                    <td className={`px-4 ${compact ? 'py-2' : 'py-3'} text-right text-sm font-semibold text-gray-900`}>
                      {formatPercent(partPercent)}
                    </td>
                  </tr>
                  {group.items.map((item) => {
                    const itemPercent = computePercentOfProjectCost(item.totalAmount, grandTotal);
                    const isEditing = editingLineKey === item.lineKey;
                    return (
                      <tr key={item.id} className={item.adjusted ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-gray-50'}>
                        <td className={`px-4 ${compact ? 'py-2' : 'py-3'} text-sm text-gray-700 whitespace-nowrap`}>{item.itemNo}</td>
                        <td className={`px-4 ${compact ? 'py-2' : 'py-3'} text-sm text-gray-900`}>
                          <div className="flex items-center gap-2">
                            <span className={compact ? 'line-clamp-1' : ''}>{item.description}</span>
                            {item.adjusted && <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">ADJUSTED</span>}
                          </div>
                        </td>
                        <td className={`px-4 ${compact ? 'py-2' : 'py-3'} text-sm text-right text-gray-700`}>
                          {isEditing ? (
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={draftQuantity}
                              onChange={(e) => setDraftQuantity(Number(e.target.value || 0))}
                              className="w-28 border border-gray-300 rounded px-2 py-1 text-right"
                            />
                          ) : (
                            item.quantity.toLocaleString('en-PH', { maximumFractionDigits: 2 })
                          )}
                        </td>
                        <td className={`px-4 ${compact ? 'py-2' : 'py-3'} text-sm text-gray-700 uppercase`}>{item.unit}</td>
                        <td className={`px-4 ${compact ? 'py-2' : 'py-3'} text-sm text-right text-gray-900`}>
                          {isEditing ? (
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={draftUnitCost}
                              onChange={(e) => setDraftUnitCost(Number(e.target.value || 0))}
                              className="w-32 border border-gray-300 rounded px-2 py-1 text-right"
                            />
                          ) : (
                            formatCurrency(item.unitCost)
                          )}
                        </td>
                        <td className={`px-4 ${compact ? 'py-2' : 'py-3'} text-sm text-right text-gray-900`}>
                          {formatCurrency(item.directCost)}
                        </td>
                        <td className={`px-4 ${compact ? 'py-2' : 'py-3'} text-sm text-right text-gray-600`}>
                          {formatPercent(itemPercent)}
                        </td>
                        {editable && (
                          <td className={`px-4 ${compact ? 'py-2' : 'py-3'} text-right`}>
                            <div className="flex items-center justify-end gap-2">
                              {isEditing ? (
                                <>
                                  <input
                                    type="text"
                                    value={draftReason}
                                    onChange={(e) => setDraftReason(e.target.value)}
                                    placeholder="Reason"
                                    className="w-44 border border-gray-300 rounded px-2 py-1 text-xs"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => saveEditor(item)}
                                    disabled={saving}
                                    className="text-xs bg-dpwh-blue-600 text-white px-2 py-1 rounded hover:bg-dpwh-blue-700 disabled:opacity-60"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={resetEditor}
                                    className="text-xs border border-gray-300 px-2 py-1 rounded hover:bg-gray-50"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openEditor(item)}
                                    className="text-xs border border-dpwh-blue-300 text-dpwh-blue-700 px-2 py-1 rounded hover:bg-blue-50"
                                  >
                                    Edit
                                  </button>
                                  {item.adjusted && (
                                    <button
                                      type="button"
                                      onClick={() => clearRowAdjustment(item)}
                                      disabled={saving}
                                      className="text-xs border border-amber-300 text-amber-700 px-2 py-1 rounded hover:bg-amber-50 disabled:opacity-60"
                                    >
                                      Reset
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-900">
            <tr>
              <td className={`px-4 ${compact ? 'py-3' : 'py-4'} text-sm font-semibold text-white`} colSpan={5}>
                GRAND TOTAL
              </td>
              <td className={`px-4 ${compact ? 'py-3' : 'py-4'} text-right text-sm font-semibold text-white`}>
                {formatCurrency(grandTotal)}
              </td>
              <td className={`px-4 ${compact ? 'py-3' : 'py-4'} text-right text-sm font-semibold text-white`}>100.00%</td>
              {editable && <td className={`px-4 ${compact ? 'py-3' : 'py-4'}`} />}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
