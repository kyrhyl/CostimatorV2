/**
 * Version Status Badge Component
 * 
 * Displays status badges for TakeoffVersion and CostEstimate
 * with appropriate colors and icons
 */

import React from 'react';

export type TakeoffVersionStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'superseded';
export type CostEstimateStatus = 'draft' | 'submitted' | 'approved';

interface VersionStatusBadgeProps {
  status: TakeoffVersionStatus | CostEstimateStatus;
  className?: string;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: {
    label: 'Draft',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100 border-gray-300',
  },
  submitted: {
    label: 'Submitted',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100 border-blue-300',
  },
  approved: {
    label: 'Approved',
    color: 'text-green-700',
    bgColor: 'bg-green-100 border-green-300',
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-700',
    bgColor: 'bg-red-100 border-red-300',
  },
  superseded: {
    label: 'Superseded',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100 border-orange-300',
  },
};

export function VersionStatusBadge({ status, className = '' }: VersionStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;
  
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color} ${config.bgColor} ${className}`}
    >
      {config.label}
    </span>
  );
}

export default VersionStatusBadge;
