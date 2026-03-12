type DupaSourceType = 'projectBoq' | 'estimateLine';

export function makeLegacyDupaItemKey(input: {
  part: string;
  payItemNumber: string;
  payItemDescription: string;
  index: number;
}): string {
  return `${input.part}-${input.payItemNumber}-${input.payItemDescription}::${input.index}`;
}

export function makeDupaItemId(input: {
  sourceType: DupaSourceType;
  sourceId: string;
  payItemNumber: string;
}): string {
  const sourceId = String(input.sourceId || '').trim() || 'unknown';
  const payItemNumber = String(input.payItemNumber || '').trim() || 'unknown';
  return `${input.sourceType}:${sourceId}:${payItemNumber}`;
}

export function ensureEstimateLineId(line: Record<string, any>, index: number): string {
  const current = String(line?.lineId || '').trim();
  if (current) return current;
  const payItemNumber = String(line?.payItemNumber || '').trim() || 'line';
  return `${payItemNumber}::${index}`;
}

export function normalizePowMode(value: string | null | undefined): 'manual' | 'takeoff' {
  return value === 'takeoff' ? 'takeoff' : 'manual';
}
