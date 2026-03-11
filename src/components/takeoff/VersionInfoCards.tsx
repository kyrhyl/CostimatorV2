'use client';

import React from 'react';
import Link from 'next/link';

interface VersionInfoCardsProps {
  projectId: string;
  latestCalcRun?: {
    runId: string;
    timestamp: string;
    versionLabel?: string;
    elementCount: number;
    takeoffLineCount: number;
  };
  latestBOQ?: {
    boqId: string;
    itemCount: number;
    tradeCount: number;
    lastUpdated: string;
  };
}

export default function VersionInfoCards({ projectId, latestCalcRun, latestBOQ }: VersionInfoCardsProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Latest Takeoff Version Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Latest Takeoff Version</h3>
        </div>
        
        {latestCalcRun ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Version</p>
              <p className="text-lg font-semibold text-gray-900">
                {latestCalcRun.versionLabel || 'Latest Run'}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                ✓ Active
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-xs text-gray-600">Elements</p>
                <p className="text-lg font-bold text-blue-600">{latestCalcRun.elementCount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Takeoff Lines</p>
                <p className="text-lg font-bold text-blue-600">{latestCalcRun.takeoffLineCount}</p>
              </div>
            </div>
            
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Generated {formatDate(latestCalcRun.timestamp)}
              </p>
            </div>
            
            <Link
              href={`/takeoff/${projectId}`}
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium mt-2"
            >
              View in Workspace
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600 mb-4">No takeoff generated yet</p>
            <Link
              href={`/takeoff/${projectId}`}
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Generate Takeoff
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}
      </div>

      {/* Latest BOQ Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Latest Bill of Quantities</h3>
        </div>
        
        {latestBOQ ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-lg font-semibold text-gray-900">
                Generated from latest takeoff
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                Active
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-xs text-gray-600">BOQ Items</p>
                <p className="text-lg font-bold text-green-600">{latestBOQ.itemCount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Trades</p>
                <p className="text-lg font-bold text-green-600">{latestBOQ.tradeCount}</p>
              </div>
            </div>
            
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Last updated {formatDate(latestBOQ.lastUpdated)}
              </p>
            </div>
            
            <Link
              href={`/takeoff/${projectId}#boq`}
              className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-800 font-medium mt-2"
            >
              View BOQ Details
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm text-gray-600 mb-2">No BOQ generated yet</p>
            <p className="text-xs text-gray-500 mb-4">Generate a takeoff first</p>
            {latestCalcRun && (
              <Link
                href={`/takeoff/${projectId}#boq`}
                className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-800 font-medium"
              >
                Generate BOQ
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
