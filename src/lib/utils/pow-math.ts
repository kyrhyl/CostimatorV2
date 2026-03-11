export function computePercentOfProjectCost(amount: number, totalProjectCost: number): number {
  if (!Number.isFinite(amount) || !Number.isFinite(totalProjectCost) || totalProjectCost <= 0) {
    return 0;
  }
  return (amount / totalProjectCost) * 100;
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > 100) return 100;
  return value;
}
