export function sumAmounts<T extends { amount?: number }>(rows: T[]): number {
  return rows.reduce((sum, row) => sum + (row.amount || 0), 0);
}

export function safeDivide(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0;
  return numerator / denominator;
}

export function computeDupaTotals(input: {
  laborTotal: number;
  equipmentTotal: number;
  materialTotal: number;
  outputPerHour: number;
  ocmPercent: number;
  cpPercent: number;
  vatPercent: number;
}) {
  const directCostSubmitted = (input.laborTotal || 0) + (input.equipmentTotal || 0);
  const directUnitCostSubmitted = safeDivide(directCostSubmitted, input.outputPerHour || 1);
  const directUnitPlusMaterialsSubmitted = directUnitCostSubmitted + (input.materialTotal || 0);
  const ocmValue = directUnitPlusMaterialsSubmitted * ((input.ocmPercent || 0) / 100);
  const cpValue = directUnitPlusMaterialsSubmitted * ((input.cpPercent || 0) / 100);
  const vatValue = directUnitPlusMaterialsSubmitted * ((input.vatPercent || 0) / 100);
  const totalUnitCostSubmitted = directUnitPlusMaterialsSubmitted + ocmValue + cpValue + vatValue;

  return {
    directCostSubmitted,
    directUnitCostSubmitted,
    directUnitPlusMaterialsSubmitted,
    ocmValue,
    cpValue,
    vatValue,
    totalUnitCostSubmitted,
  };
}
