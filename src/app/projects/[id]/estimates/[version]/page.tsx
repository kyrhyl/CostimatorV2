'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';

interface EstimateDetails {
  _id: string;
  projectId: {
    projectName: string;
    projectLocation: string;
    implementingOffice: string;
  };
  version: number;
  estimateType: string;
  status: string;
  totalDirectCost: number;
  totalOCM: number;
  totalCP: number;
  totalVAT: number;
  grandTotal: number;
  ocmPercentage: number;
  cpPercentage: number;
  vatPercentage: number;
  totalItems: number;
  preparedBy?: string;
  preparedDate?: string;
  approvedBy?: string;
  approvedDate?: string;
  notes?: string;
  boqSnapshot: Array<{
    payItemNumber: string;
    description: string;
    quantity: number;
    unitCost: number;
    totalAmount: number;
    category?: string;
  }>;
  createdAt: string;
}

export default function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string; version: string }>;
}) {
  const { id, version } = use(params);
  const [estimate, setEstimate] = useState<EstimateDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEstimate();
  }, [id, version]);

  const fetchEstimate = async () => {
    try {
      const response = await fetch(`/api/projects/${id}/estimates/${version}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setEstimate(result.data);
      } else {
        console.error('Failed to fetch estimate:', result.error);
      }
    } catch (error) {
      console.error('Failed to fetch estimate:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading estimate...</div>
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Estimate not found</div>
      </div>
    );
  }

  const project = estimate.projectId;

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/projects/${id}`}
          className="text-blue-600 hover:text-blue-800 mb-2 inline-block"
        >
          ← Back to Project
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Cost Estimate - Version {estimate.version}
            </h1>
            <p className="text-gray-600">{project.projectName}</p>
            <p className="text-sm text-gray-500">{project.projectLocation}</p>
          </div>
          <div className="flex gap-2">
            <span
              className={`px-4 py-2 rounded-lg font-medium ${
                estimate.status === 'approved'
                  ? 'bg-green-100 text-green-800'
                  : estimate.status === 'submitted'
                  ? 'bg-blue-100 text-blue-800'
                  : estimate.status === 'rejected'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Estimate Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6 border border-blue-100">
        <h2 className="text-xl font-semibold mb-4">Cost Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-600">Direct Cost</p>
            <p className="text-xl font-bold">
              ₱{estimate.totalDirectCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">OCM ({estimate.ocmPercentage}%)</p>
            <p className="text-xl font-bold">
              ₱{estimate.totalOCM.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">CP ({estimate.cpPercentage}%)</p>
            <p className="text-xl font-bold">
              ₱{estimate.totalCP.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">VAT ({estimate.vatPercentage}%)</p>
            <p className="text-xl font-bold">
              ₱{estimate.totalVAT.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-blue-200">
          <div className="flex justify-between items-center">
            <p className="text-lg font-semibold">Grand Total</p>
            <p className="text-3xl font-bold text-blue-600">
              ₱{estimate.grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-sm text-gray-600">Estimate Type</p>
          <p className="font-semibold capitalize">{estimate.estimateType}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-sm text-gray-600">Total BOQ Items</p>
          <p className="font-semibold">{estimate.totalItems}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-sm text-gray-600">Created</p>
          <p className="font-semibold">{new Date(estimate.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Approval Info */}
      {estimate.preparedBy && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-3">Approval Chain</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Prepared By:</span>
              <span className="font-medium">{estimate.preparedBy}</span>
            </div>
            {estimate.preparedDate && (
              <div className="flex justify-between">
                <span className="text-gray-600">Prepared Date:</span>
                <span className="font-medium">
                  {new Date(estimate.preparedDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {estimate.approvedBy && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Approved By:</span>
                  <span className="font-medium">{estimate.approvedBy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Approved Date:</span>
                  <span className="font-medium">
                    {estimate.approvedDate
                      ? new Date(estimate.approvedDate).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {estimate.notes && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-3">Notes</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{estimate.notes}</p>
        </div>
      )}

      {/* BOQ Snapshot */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Bill of Quantities Snapshot</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Pay Item
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Quantity
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Unit Cost
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Total Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {estimate.boqSnapshot.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {item.payItemNumber}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.description}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.category || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">
                    {item.quantity.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">
                    ₱{item.unitCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                    ₱{item.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-right">
                  Total:
                </td>
                <td className="px-4 py-3 text-sm font-bold text-right">
                  ₱
                  {estimate.boqSnapshot
                    .reduce((sum, item) => sum + item.totalAmount, 0)
                    .toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
