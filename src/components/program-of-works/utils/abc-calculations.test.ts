import {
  computeMarkupPercent,
  computeTotalCost,
  computeTotalIndirectCost,
  computeUnitCost,
} from './abc-calculations';

describe('abc-calculations', () => {
  it('computes markup percent from direct cost and markup value', () => {
    expect(computeMarkupPercent(200, 30)).toBe(15);
  });

  it('returns 0 markup percent when direct cost is zero or negative', () => {
    expect(computeMarkupPercent(0, 30)).toBe(0);
    expect(computeMarkupPercent(-100, 30)).toBe(0);
  });

  it('computes total indirect and total cost safely with falsy values', () => {
    expect(computeTotalIndirectCost(50, 10)).toBe(60);
    expect(computeTotalIndirectCost(0, 0)).toBe(0);
    expect(computeTotalCost(100, 50, 10)).toBe(160);
    expect(computeTotalCost(0, 0, 0)).toBe(0);
  });

  it('computes unit cost and guards zero quantity', () => {
    expect(computeUnitCost(1000, 4)).toBe(250);
    expect(computeUnitCost(1000, 0)).toBe(0);
  });
});
