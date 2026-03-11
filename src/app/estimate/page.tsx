'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface EstimateSummary {
  _id: string;
  projectName: string;
  projectLocation: string;
  implementingOffice: string;
  grandTotalSubmitted: number;
  grandTotalEvaluated: number;
  createdAt: string;
}

export default function EstimatesPage() {
  const [estimates, setEstimates] = useState<EstimateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEstimates();
  }, []);

  const fetchEstimates = async () => {
    try {
      const response = await fetch('/api/estimates');
      const data = await response.json();

      if (data.success) {
        setEstimates(data.data);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading estimates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 max-w-7xl mx-auto px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Estimates</h1>
          <p className="text-gray-600">Manage your project cost estimates</p>
        </div>
        <Link
          href="/estimate/new"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
        >
          + New Estimate
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-6">
          {error}
        </div>
      )}

      {/* Estimates List */}
      {estimates.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">No estimates yet</h2>
          <p className="text-gray-600 mb-6">Create your first cost estimate to get started</p>
          <Link
            href="/estimate/new"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Create Estimate
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700 text-white">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Project Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Location</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Office</th>
                <th className="px-6 py-3 text-right text-sm font-semibold">Total (Submitted)</th>
                <th className="px-6 py-3 text-right text-sm font-semibold">Total (Evaluated)</th>
                <th className="px-6 py-3 text-center text-sm font-semibold">Date Created</th>
                <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {estimates.map((estimate) => (
                <tr key={estimate._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link 
                      href={`/estimate/${estimate._id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {estimate.projectName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {estimate.projectLocation}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {estimate.implementingOffice}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-medium text-green-700">
                    {formatCurrency(estimate.grandTotalSubmitted)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-medium text-blue-700">
                    {formatCurrency(estimate.grandTotalEvaluated)}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {formatDate(estimate.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <Link
                        href={`/estimate/${estimate._id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded hover:bg-blue-50"
                        title="View Details"
                      >
                        👁️ View
                      </Link>
                      <Link
                        href={`/estimate/${estimate._id}/edit`}
                        className="text-green-600 hover:text-green-800 text-sm px-2 py-1 rounded hover:bg-green-50"
                        title="Edit Estimate"
                      >
                        ✏️ Edit
                      </Link>
                      <Link
                        href={`/estimate/${estimate._id}/reports`}
                        className="text-purple-600 hover:text-purple-800 text-sm px-2 py-1 rounded hover:bg-purple-50"
                        title="View Reports"
                      >
                        📊 Reports
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Stats */}
      {estimates.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Estimates</div>
            <div className="text-3xl font-bold text-gray-800">{estimates.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Value (Submitted)</div>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(estimates.reduce((sum, est) => sum + est.grandTotalSubmitted, 0))}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Value (Evaluated)</div>
            <div className="text-2xl font-bold text-blue-700">
              {formatCurrency(estimates.reduce((sum, est) => sum + est.grandTotalEvaluated, 0))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
