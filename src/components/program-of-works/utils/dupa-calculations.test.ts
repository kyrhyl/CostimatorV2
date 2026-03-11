import { computeDupaTotals, safeDivide, sumAmounts } from './dupa-calculations';

describe('dupa-calculations', () => {
  it('sums amount fields and treats missing values as zero', () => {
    expect(sumAmounts([{ amount: 10 }, { amount: 15 }, {}])).toBe(25);
  });

  it('safeDivide returns 0 for invalid denominator', () => {
    expect(safeDivide(10, 2)).toBe(5);
    expect(safeDivide(10, 0)).toBe(0);
    expect(safeDivide(10, -3)).toBe(0);
  });

  it('computes DUPA totals correctly', () => {
    const totals = computeDupaTotals({
      laborTotal: 100,
      equipmentTotal: 50,
      materialTotal: 20,
      outputPerHour: 5,
      ocmPercent: 10,
      cpPercent: 5,
      vatPercent: 12,
    });

    expect(totals.directCostSubmitted).toBe(150);
    expect(totals.directUnitCostSubmitted).toBe(30);
    expect(totals.directUnitPlusMaterialsSubmitted).toBe(50);
    expect(totals.ocmValue).toBe(5);
    expect(totals.cpValue).toBe(2.5);
    expect(totals.vatValue).toBe(6);
    expect(totals.totalUnitCostSubmitted).toBe(63.5);
  });
});
