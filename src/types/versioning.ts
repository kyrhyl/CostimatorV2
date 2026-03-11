/**
 * Multi-Version Architecture Type Exports
 * 
 * Re-exports interfaces from models for use in components and API routes.
 * This provides a clean, centralized location for type imports.
 */

// TakeoffVersion types
export type { 
  ITakeoffVersion,
  IChangeSummary
} from '@/models/TakeoffVersion';

// CostEstimate types
export type { 
  ICostEstimate,
  ICostSummary,
  IPriceDelta
} from '@/models/CostEstimate';

// EstimateRateItem types
export type {
  IEstimateRateItem,
  IEstimateLaborItem,
  IEstimateEquipmentItem,
  IEstimateMaterialItem,
  IEstimateCostBreakdown
} from '@/models/EstimateRateItem';

// Project types (for version references)
export type { IProject } from '@/models/Project';

// Common enums for frontend use
export const TAKEOFF_VERSION_TYPES = [
  'Preliminary',
  'Detailed',
  'Revised',
  'Final',
  'As-Built'
] as const;

export const TAKEOFF_VERSION_STATUSES = [
  'Draft',
  'Submitted',
  'Approved',
  'Rejected',
  'Superseded'
] as const;

export const COST_ESTIMATE_STATUSES = [
  'Draft',
  'Submitted',
  'Approved'
] as const;

// Helper type guards
export function isTakeoffVersionApproved(status: string): boolean {
  return status === 'Approved';
}

export function isTakeoffVersionEditable(status: string): boolean {
  return status === 'Draft' || status === 'Rejected';
}

export function isCostEstimateEditable(status: string): boolean {
  return status === 'Draft';
}
