export function formatPowCurrency(value: number): string {
  if (!value || value === 0) return '-';
  return '₱' + value.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPowNumber(value: number): string {
  if (!value || value === 0) return '-';
  return value.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
