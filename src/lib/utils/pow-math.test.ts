import { clampPercent, computePercentOfProjectCost } from './pow-math';

describe('pow-math', () => {
  it('computes item percent against total project cost', () => {
    expect(computePercentOfProjectCost(250000, 1000000)).toBe(25);
    expect(computePercentOfProjectCost(125000, 1000000)).toBe(12.5);
  });

  it('returns 0 for invalid project totals', () => {
    expect(computePercentOfProjectCost(100, 0)).toBe(0);
    expect(computePercentOfProjectCost(100, -10)).toBe(0);
    expect(computePercentOfProjectCost(100, Number.NaN)).toBe(0);
  });

  it('keeps percent values bounded when clamped', () => {
    expect(clampPercent(-5)).toBe(0);
    expect(clampPercent(35.45)).toBe(35.45);
    expect(clampPercent(150)).toBe(100);
  });

  it('has additive consistency for item percentages', () => {
    const totalProjectCost = 500000;
    const items = [150000, 100000, 250000];
    const sumPercent = items
      .map((itemCost) => computePercentOfProjectCost(itemCost, totalProjectCost))
      .reduce((sum, value) => sum + value, 0);

    expect(sumPercent).toBeCloseTo(100, 10);
  });
});
