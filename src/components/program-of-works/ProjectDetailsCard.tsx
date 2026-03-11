'use client';

import { useState } from 'react';

interface ProjectDetailsCardProps {
  projectName: string;
  implementingOffice: string;
  location: string;
  district?: string;
  fundSource?: {
    projectId?: string;
    fundingAgreement?: string;
    fundingOrganization?: string;
  };
  workableDays?: number;
  unworkableDays?: number;
  totalDuration?: number;
  startDate?: string;
  endDate?: string;
}

type Tab = 'overview' | 'timeline';

export default function ProjectDetailsCard({
  projectName,
  implementingOffice,
  location,
  district,
  fundSource,
  workableDays,
  unworkableDays,
  totalDuration,
  startDate,
  endDate,
}: ProjectDetailsCardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const formatDate = (date: string | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'timeline', label: 'Timeline' },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Project Information</h3>

      <div className="border-b border-gray-200 mb-4">
        <nav className="flex space-x-6" aria-label="Project tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-4">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Project Name</label>
              <p className="text-base font-bold text-gray-900 leading-tight">{projectName || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Implementing Office</label>
              <p className="text-sm font-medium text-gray-900">{implementingOffice || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Project Location</label>
              <p className="text-sm font-medium text-gray-900">{location || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">District</label>
              <p className="text-sm font-medium text-gray-900">{district || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Funding Project ID</label>
              <p className="text-sm font-medium text-gray-900">{fundSource?.projectId || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Funding Agreement</label>
              <p className="text-sm font-medium text-gray-900">{fundSource?.fundingAgreement || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Funding Organization</label>
              <p className="text-sm font-medium text-gray-900">{fundSource?.fundingOrganization || 'N/A'}</p>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start Date</label>
              <p className="text-sm font-medium text-gray-900">{formatDate(startDate)}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End Date</label>
              <p className="text-sm font-medium text-gray-900">{formatDate(endDate)}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Total Duration</label>
              <p className="text-sm font-medium text-gray-900">
                {totalDuration ? `${totalDuration} days` : 'N/A'}
              </p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Workable Days</label>
              <p className="text-sm font-medium text-gray-900">{workableDays ? `${workableDays} days` : 'N/A'}</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Unworkable Days</label>
              <p className="text-sm font-medium text-gray-900">
                {unworkableDays ? `${unworkableDays} days` : 'N/A'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
