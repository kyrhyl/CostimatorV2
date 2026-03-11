'use client';

import React from 'react';

interface MetricCardProps {
  label: string;
  value: number | string;
  unit?: string;
  icon: React.ReactNode;
  color: 'blue' | 'red' | 'purple' | 'green' | 'amber' | 'gray';
  subtitle?: string;
}

function MetricCard({ label, value, unit, icon, color, subtitle }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    red: 'bg-red-50 border-red-200 text-red-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    amber: 'bg-amber-50 border-amber-200 text-amber-600',
    gray: 'bg-gray-50 border-gray-200 text-gray-600',
  };

  const formatValue = (val: number | string): string => {
    if (typeof val === 'number') {
      return val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
    return val;
  };

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-4 transition-shadow hover:shadow-md`}>
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-lg ${colorClasses[color].split(' ')[0]}`}>
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-gray-900">
            {formatValue(value)}
          </span>
          {unit && <span className="text-sm font-medium text-gray-600">{unit}</span>}
        </div>
        <p className="text-sm font-medium text-gray-700 mt-1">{label}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

interface CalcRunSummary {
  totalConcrete: number;
  totalRebar: number;
  totalFormwork: number;
  totalFloorArea?: number;
  totalWallArea?: number;
  totalCeilingArea?: number;
  totalRoofArea?: number;
  elementCount?: number;
  beamCount?: number;
  columnCount?: number;
  slabCount?: number;
  foundationCount?: number;
  takeoffLineCount: number;
  boqLineCount: number;
}

interface TakeoffSummaryCardsProps {
  summary: CalcRunSummary;
  earthworkVolume?: number;
}

export default function TakeoffSummaryCards({ summary, earthworkVolume }: TakeoffSummaryCardsProps) {
  // Access extended summary fields (may need type casting)
  const extendedSummary = summary as any;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h3>
      </div>

      {/* Row 1: Part D - Structural */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Concrete"
          value={summary.totalConcrete || 0}
          unit="m³"
          color="blue"
          subtitle="Part D"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        
        <MetricCard
          label="Rebar"
          value={summary.totalRebar || 0}
          unit="kg"
          color="red"
          subtitle="Part D"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          }
        />
        
        <MetricCard
          label="Formwork"
          value={summary.totalFormwork || 0}
          unit="m²"
          color="purple"
          subtitle="Part D"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
            </svg>
          }
        />
        
        <MetricCard
          label="Earthwork"
          value={earthworkVolume || 0}
          unit="m³"
          color="amber"
          subtitle="Part C"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
      </div>

      {/* Row 2: Part E - Finishes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Floor Finishes"
          value={extendedSummary.totalFloorArea || 0}
          unit="m²"
          color="green"
          subtitle="Part E"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          }
        />
        
        <MetricCard
          label="Wall Finishes"
          value={extendedSummary.totalWallArea || 0}
          unit="m²"
          color="green"
          subtitle="Part E"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
            </svg>
          }
        />
        
        <MetricCard
          label="Ceiling Finishes"
          value={extendedSummary.totalCeilingArea || 0}
          unit="m²"
          color="green"
          subtitle="Part E"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          }
        />
        
        <MetricCard
          label="Roof Area"
          value={extendedSummary.totalRoofArea || 0}
          unit="m²"
          color="green"
          subtitle="Part E"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10" />
            </svg>
          }
        />
      </div>

      {/* Row 3: Element Counts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Beams"
          value={extendedSummary.beamCount || 0}
          color="gray"
          subtitle="Element count"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          }
        />
        
        <MetricCard
          label="Columns"
          value={extendedSummary.columnCount || 0}
          color="gray"
          subtitle="Element count"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h2M4 12h2M4 18h2M6 6v12M18 6v12M18 6h2M18 12h2M18 18h2" />
            </svg>
          }
        />
        
        <MetricCard
          label="Slabs"
          value={extendedSummary.slabCount || 0}
          color="gray"
          subtitle="Element count"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18" />
            </svg>
          }
        />
        
        <MetricCard
          label="BOQ Items"
          value={summary.boqLineCount || 0}
          color="blue"
          subtitle="Total items"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
      </div>
    </div>
  );
}
