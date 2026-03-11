import type { DupaReportData } from '@/types/dupa';
import { FormDUPAPage } from '../forms/FormDUPAPage';

interface DupaPrintBundleProps {
  data: DupaReportData;
  selectedItemKey?: string;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
}

export function DupaPrintBundle({ data, selectedItemKey, formatCurrency, formatNumber }: DupaPrintBundleProps) {
  const getItemKey = (item: DupaReportData['items'][number], index: number) =>
    `${item.part}-${item.payItemNumber}-${item.payItemDescription}::${index}`;

  const selectedIndex = selectedItemKey
    ? data.items.findIndex((item, index) => getItemKey(item, index) === selectedItemKey)
    : -1;
  const itemsToPrint =
    selectedIndex >= 0
      ? [{ item: data.items[selectedIndex], index: selectedIndex }]
      : data.items.length > 0
        ? [{ item: data.items[0], index: 0 }]
        : [];

  return (
    <>
      {itemsToPrint.map(({ item, index }, renderIndex) => (
        <FormDUPAPage
          key={getItemKey(item, index)}
          report={data}
          item={item}
          pageNumber={`DUPA-${renderIndex + 1}`}
          formatCurrency={formatCurrency}
          formatNumber={formatNumber}
        />
      ))}
    </>
  );
}
