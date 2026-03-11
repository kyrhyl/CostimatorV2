'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CostEstimate {
  _id: string;
  name: string;
  location: string;
  district: string;
  costSummary: {
    grandTotal: number;
    rateItemsCount: number;
  };
  createdAt: string;
}

interface EstimateListProps {
  projectId: string;
}

export default function EstimateList({ projectId }: EstimateListProps) {
  const [estimates, setEstimates] = useState<CostEstimate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEstimates();
  }, [projectId]);

  const loadEstimates = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/cost-estimates`);
      const data = await res.json();
      setEstimates(data.estimates || []);
    } catch (err) {
      console.error('Failed to load estimates:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading estimates...</div>;

  if (estimates.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        No cost estimates yet. Create one from a takeoff version.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {estimates.map((est) => (
        <Link
          key={est._id}
          href={`/projects/${projectId}/program-of-works?estimateId=${est._id}&view=takeoff&section=overview`}
          className="block border rounded-lg p-4 hover:bg-gray-50 transition"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg">{est.name}</h3>
              <p className="text-sm text-gray-600">
                {est.location} - {est.district}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {est.costSummary.rateItemsCount} items
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">
                ₱{est.costSummary.grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(est.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
