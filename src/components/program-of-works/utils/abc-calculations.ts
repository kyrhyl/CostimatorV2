export function computeMarkupPercent(directCost: number, markupValue: number): number {
  if (!directCost || directCost <= 0) return 0;
  return (markupValue / directCost) * 100;
}

export function computeTotalIndirectCost(markupValue: number, vat: number): number {
  return (markupValue || 0) + (vat || 0);
}

export function computeTotalCost(directCost: number, markupValue: number, vat: number): number {
  return (directCost || 0) + computeTotalIndirectCost(markupValue, vat);
}

export function computeUnitCost(totalCost: number, quantity: number): number {
  if (!quantity || quantity <= 0) return 0;
  return totalCost / quantity;
}
