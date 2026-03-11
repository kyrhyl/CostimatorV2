'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface IBOQLine {
  itemNo: string;
  description: string;
  unit: string;
  quantity: number;
  part?: string;
  partDescription?: string;
  division?: string;
  payItemNumber?: string;
  unitPrice?: number;
  totalAmount?: number;
  materialCost?: number;
  laborCost?: number;
  equipmentCost?: number;
  materialPercent?: number;
  laborPercent?: number;
  equipmentPercent?: number;
  breakdown?: {
    directCostSubmitted: number;
    directCostEvaluated: number;
    ocmSubmitted: number;
    ocmEvaluated: number;
    cpSubmitted: number;
    cpEvaluated: number;
    vatSubmitted: number;
    vatEvaluated: number;
    totalSubmitted: number;
    totalEvaluated: number;
  };
}

interface IEstimate {
  _id: string;
  projectName: string;
  projectLocation: string;
  implementingOffice: string;
  boqLines: IBOQLine[];
  totalDirectCostSubmitted: number;
  totalDirectCostEvaluated: number;
  totalOCMSubmitted: number;
  totalOCMEvaluated: number;
  totalCPSubmitted: number;
  totalCPEvaluated: number;
  totalVATSubmitted: number;
  totalVATEvaluated: number;
  grandTotalSubmitted: number;
  grandTotalEvaluated: number;
  createdAt: string;
  updatedAt: string;
}

export default function EstimateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [estimate, setEstimate] = useState<IEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'submitted' | 'evaluated'>('submitted');

  const fetchEstimate = useCallback(async () => {
    try {
      const response = await fetch(`/api/estimates/${id}`);
      const data = await response.json();

      if (data.success) {
        setEstimate(data.data);
      } else {
        setError(data.error || 'Failed to load estimate');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchEstimate();
    }
  }, [id, fetchEstimate]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this estimate? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/estimates/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        router.push('/estimate');
      } else {
        setError(data.error || 'Failed to delete estimate');
        setDeleting(false);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setDeleting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading estimate...</p>
        </div>
      </div>
    );
  }

  if (error && !estimate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Estimate</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/estimate"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Back to Estimates
          </Link>
        </div>
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Estimate Not Found</h2>
          <p className="text-gray-600 mb-6">The estimate you are looking for does not exist.</p>
          <Link
            href="/estimate"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Back to Estimates
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Link href="/estimate" className="hover:text-blue-600">Estimates</Link>
            <span>/</span>
            <span className="text-gray-900">{estimate.projectName}</span>
          </div>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{estimate.projectName}</h1>
              <div className="space-y-1 text-gray-600">
                <p><span className="font-medium">Location:</span> {estimate.projectLocation}</p>
                <p><span className="font-medium">Implementing Office:</span> {estimate.implementingOffice}</p>
                <p className="text-sm"><span className="font-medium">Last Updated:</span> {formatDate(estimate.updatedAt)}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                href={`/estimate/${id}/reports`}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Reports
              </Link>
              <Link
                href={`/estimate/${id}/edit`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Submitted Costs */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-green-600">As Submitted</span>
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Direct Cost:</span>
                <span className="font-medium">{formatCurrency(estimate.totalDirectCostSubmitted)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">OCM:</span>
                <span className="font-medium">{formatCurrency(estimate.totalOCMSubmitted)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Contractor&apos;s Profit:</span>
                <span className="font-medium">{formatCurrency(estimate.totalCPSubmitted)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">VAT:</span>
                <span className="font-medium">{formatCurrency(estimate.totalVATSubmitted)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t-2 border-gray-200">
                <span className="font-bold text-gray-800">Grand Total:</span>
                <span className="font-bold text-green-700 text-xl">{formatCurrency(estimate.grandTotalSubmitted)}</span>
              </div>
            </div>
          </div>

          {/* Evaluated Costs */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-blue-600">As Evaluated</span>
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Direct Cost:</span>
                <span className="font-medium">{formatCurrency(estimate.totalDirectCostEvaluated)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">OCM:</span>
                <span className="font-medium">{formatCurrency(estimate.totalOCMEvaluated)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Contractor&apos;s Profit:</span>
                <span className="font-medium">{formatCurrency(estimate.totalCPEvaluated)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">VAT:</span>
                <span className="font-medium">{formatCurrency(estimate.totalVATEvaluated)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t-2 border-gray-200">
                <span className="font-bold text-gray-800">Grand Total:</span>
                <span className="font-bold text-blue-700 text-xl">{formatCurrency(estimate.grandTotalEvaluated)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* BOQ Lines */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gray-700 text-white flex justify-between items-center">
            <h2 className="text-xl font-semibold">Bill of Quantities</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('submitted')}
                className={`px-4 py-2 rounded font-medium transition-colors ${
                  viewMode === 'submitted'
                    ? 'bg-green-600 text-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                As Submitted
              </button>
              <button
                onClick={() => setViewMode('evaluated')}
                className={`px-4 py-2 rounded font-medium transition-colors ${
                  viewMode === 'evaluated'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                As Evaluated
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Item No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Pay Item</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Unit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Unit Price</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {estimate.boqLines.map((line, index) => {
                  const unitPrice = viewMode === 'submitted' 
                    ? line.breakdown?.totalSubmitted || line.unitPrice || 0
                    : line.breakdown?.totalEvaluated || line.unitPrice || 0;
                  const amount = unitPrice * line.quantity;

                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{line.itemNo}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {line.description}
                        {line.part && (
                          <div className="text-xs text-gray-500 mt-1">
                            {line.part} {line.partDescription && `- ${line.partDescription}`}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{line.payItemNumber || '-'}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-700">{line.unit}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">{line.quantity.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(unitPrice)}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">{formatCurrency(amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-right font-bold text-gray-800">Grand Total:</td>
                  <td className="px-4 py-4 text-right font-bold text-xl text-gray-900">
                    {viewMode === 'submitted' 
                      ? formatCurrency(estimate.grandTotalSubmitted)
                      : formatCurrency(estimate.grandTotalEvaluated)
                    }
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Statistics */}
        {estimate.boqLines.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 mb-1">Total Line Items</div>
              <div className="text-2xl font-bold text-gray-800">{estimate.boqLines.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 mb-1">Items with Rates</div>
              <div className="text-2xl font-bold text-gray-800">
                {estimate.boqLines.filter(line => line.payItemNumber).length}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 mb-1">Price Difference</div>
              <div className="text-xl font-bold text-gray-800">
                {formatCurrency(Math.abs(estimate.grandTotalSubmitted - estimate.grandTotalEvaluated))}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 mb-1">Variance</div>
              <div className="text-xl font-bold text-gray-800">
                {estimate.grandTotalSubmitted > 0
                  ? ((estimate.grandTotalEvaluated / estimate.grandTotalSubmitted - 1) * 100).toFixed(2)
                  : '0.00'}%
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
