import type { ProjectBoqItem } from './types';

interface ManualPowItemsTableProps {
  manualItems: ProjectBoqItem[];
  loading: boolean;
  readOnly?: boolean;
  pendingQuantities: Record<string, number>;
  updatingRowId: string | null;
  deletingRowId: string | null;
  totalManualAmount: number;
  onPendingQuantityChange: (itemId: string, quantity: number) => void;
  onQuantityBlur: (itemId: string, originalQuantity: number) => void;
  onDelete: (itemId: string) => void;
}

export default function ManualPowItemsTable({
  manualItems,
  loading,
  readOnly = false,
  pendingQuantities,
  updatingRowId,
  deletingRowId,
  totalManualAmount,
  onPendingQuantityChange,
  onQuantityBlur,
  onDelete,
}: ManualPowItemsTableProps) {
  const initialLoading = loading && manualItems.length === 0;

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
              <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                Loading manual BOQ lines...
              </td>
            </tr>
          ) : manualItems.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                No manual BOQ lines yet. Click "Add BOQ Item" to get started.
              </td>
            </tr>
          ) : (
            manualItems.map((item) => {
              const quantityValue = pendingQuantities[item._id] ?? item.quantity;
              return (
                <tr key={item._id}>
                  <td className="px-3 py-1.5 whitespace-nowrap font-semibold text-gray-900">
                    {item.payItemNumber}
                  </td>
                  <td className="px-3 py-1.5">
                    <p className="text-gray-900">{item.payItemDescription}</p>
                    {item.part && <p className="text-xs text-gray-500">{item.part}</p>}
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
              );
            })
          )}
        </tbody>
        {manualItems.length > 0 && (
          <tfoot>
            <tr className="bg-gray-50">
              <td colSpan={5} className="px-3 py-2.5 text-right font-semibold text-gray-700">
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
