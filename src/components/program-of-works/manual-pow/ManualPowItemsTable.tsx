import { Fragment } from 'react';
import { getPartKey, normalizePart } from '@/lib/utils/dpwh-constants';
import type { ProjectBoqItem } from './types';

const PART_ORDER = ['PART A', 'PART B', 'PART C', 'PART D', 'PART E', 'PART F', 'PART G', 'PART H', 'PART I'];

function tokenizePayItemNumber(value: string) {
  return String(value || '')
    .toUpperCase()
    .match(/\d+|[^\d]+/g)?.map((token) => {
      if (/^\d+$/.test(token)) {
        return { type: 'number' as const, value: Number(token) };
      }

      return { type: 'text' as const, value: token.trim() };
    }) || [];
}

function comparePayItemNumbers(left: string, right: string) {
  const leftTokens = tokenizePayItemNumber(left);
  const rightTokens = tokenizePayItemNumber(right);
  const maxLength = Math.max(leftTokens.length, rightTokens.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftToken = leftTokens[index];
    const rightToken = rightTokens[index];

    if (!leftToken) return -1;
    if (!rightToken) return 1;

    if (leftToken.type === rightToken.type) {
      if (leftToken.value < rightToken.value) return -1;
      if (leftToken.value > rightToken.value) return 1;
      continue;
    }

    if (leftToken.type === 'number') return -1;
    return 1;
  }

  return String(left || '').localeCompare(String(right || ''), undefined, { sensitivity: 'base' });
}

function compareParts(left?: string, right?: string) {
  const leftPart = getPartKey(left);
  const rightPart = getPartKey(right);
  const leftIndex = PART_ORDER.indexOf(leftPart);
  const rightIndex = PART_ORDER.indexOf(rightPart);

  const normalizedLeftIndex = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
  const normalizedRightIndex = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

  if (normalizedLeftIndex !== normalizedRightIndex) {
    return normalizedLeftIndex - normalizedRightIndex;
  }

  return leftPart.localeCompare(rightPart, undefined, { sensitivity: 'base' });
}

function normalizePartLabel(value?: string) {
  return normalizePart(value || '') || 'UNASSIGNED PART';
}

interface ManualPowItemsTableProps {
  manualItems: ProjectBoqItem[];
  loading: boolean;
  readOnly?: boolean;
  selectedItemIds: Record<string, boolean>;
  pendingQuantities: Record<string, number>;
  updatingRowId: string | null;
  deletingRowId: string | null;
  totalManualAmount: number;
  onToggleSelectAll: (checked: boolean) => void;
  onToggleSelectItem: (itemId: string, checked: boolean) => void;
  onPendingQuantityChange: (itemId: string, quantity: number) => void;
  onQuantityBlur: (itemId: string, originalQuantity: number) => void;
  onDelete: (itemId: string) => void;
}

export default function ManualPowItemsTable({
  manualItems,
  loading,
  readOnly = false,
  selectedItemIds,
  pendingQuantities,
  updatingRowId,
  deletingRowId,
  totalManualAmount,
  onToggleSelectAll,
  onToggleSelectItem,
  onPendingQuantityChange,
  onQuantityBlur,
  onDelete,
}: ManualPowItemsTableProps) {
  const initialLoading = loading && manualItems.length === 0;
  const sortedItems = [...manualItems].sort((left, right) => {
    const byPart = compareParts(left.part, right.part);
    if (byPart !== 0) {
      return byPart;
    }

    const byPayItem = comparePayItemNumbers(left.payItemNumber, right.payItemNumber);
    if (byPayItem !== 0) {
      return byPayItem;
    }

    return String(left.payItemDescription || '').localeCompare(String(right.payItemDescription || ''), undefined, { sensitivity: 'base' });
  });
  const selectableItems = manualItems.filter((item) => item._id);
  const selectedCount = selectableItems.filter((item) => selectedItemIds[item._id]).length;
  const allSelected = selectableItems.length > 0 && selectedCount === selectableItems.length;

  return (
    <div className="mt-4 overflow-x-auto">
      {loading && manualItems.length > 0 && (
        <div className="mb-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs text-blue-700">
          Syncing latest BOQ changes...
        </div>
      )}
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th className="px-3 py-1.5 text-center font-medium text-gray-600">
              {readOnly ? null : (
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onToggleSelectAll(e.target.checked)}
                  aria-label="Select all pay items"
                />
              )}
            </th>
            <th className="px-3 py-1.5 text-left font-medium text-gray-600">Pay Item</th>
            <th className="px-3 py-1.5 text-left font-medium text-gray-600">Description</th>
            <th className="px-3 py-1.5 text-left font-medium text-gray-600">Unit</th>
            <th className="px-3 py-1.5 text-right font-medium text-gray-600">Quantity</th>
            <th className="px-3 py-1.5 text-right font-medium text-gray-600">Unit Cost</th>
            <th className="px-3 py-1.5 text-right font-medium text-gray-600">Total Amount</th>
             <th className="px-3 py-1.5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {initialLoading ? (
            <tr>
              <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                Loading manual BOQ lines...
              </td>
            </tr>
          ) : manualItems.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                No manual BOQ lines yet. Click "Add BOQ Item" to get started.
              </td>
            </tr>
          ) : (
            sortedItems.map((item, index) => {
              const quantityValue = pendingQuantities[item._id] ?? item.quantity;
              const currentPartLabel = normalizePartLabel(item.part);
              const previousPartLabel = index > 0 ? normalizePartLabel(sortedItems[index - 1]?.part) : '';
              const showPartHeader = index === 0 || previousPartLabel !== currentPartLabel;
              return (
                <Fragment key={item._id}>
                  {showPartHeader && (
                    <tr key={`${item.part || 'UNPARTED'}-header`} className="bg-slate-100">
                      <td colSpan={8} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
                        {currentPartLabel || 'Unassigned Part'}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="px-3 py-1.5 text-center">
                      {readOnly ? null : (
                        <input
                          type="checkbox"
                          checked={Boolean(selectedItemIds[item._id])}
                          onChange={(e) => onToggleSelectItem(item._id, e.target.checked)}
                          aria-label={`Select ${item.payItemNumber}`}
                        />
                      )}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap font-semibold text-gray-900">
                      {item.payItemNumber}
                    </td>
                    <td className="px-3 py-1.5">
                      <p className="text-gray-900">{item.payItemDescription}</p>
                    </td>
                    <td className="px-3 py-1.5 text-gray-700">{item.unitOfMeasurement}</td>
                    <td className="px-3 py-1.5 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-24 rounded-md border border-gray-300 px-2 py-1 text-right"
                        value={quantityValue}
                        onChange={(e) => onPendingQuantityChange(item._id, Number(e.target.value))}
                        onBlur={() => onQuantityBlur(item._id, item.quantity)}
                        disabled={readOnly || updatingRowId === item._id}
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right text-gray-900">
                      ₱{(item.unitCost || item.totalCost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-1.5 text-right font-semibold text-gray-900">
                      ₱{(item.totalAmount || (item.unitCost || 0) * item.quantity).toLocaleString('en-PH', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {readOnly ? (
                        <span className="text-xs text-gray-400">Read-only</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onDelete(item._id)}
                          className="text-sm text-red-600 hover:text-red-700"
                          disabled={deletingRowId === item._id}
                        >
                          {deletingRowId === item._id ? 'Deleting...' : 'Delete'}
                        </button>
                      )}
                    </td>
                  </tr>
                </Fragment>
              );
            })
          )}
        </tbody>
        {manualItems.length > 0 && (
          <tfoot>
            <tr className="bg-gray-50">
              <td colSpan={6} className="px-3 py-2.5 text-right font-semibold text-gray-700">
                Total
              </td>
              <td className="px-3 py-2.5 text-right font-bold text-gray-900">
                ₱{totalManualAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </td>
              <td></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
