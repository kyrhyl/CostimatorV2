import type { AbcReportData } from '@/types/abc';
import { FormABCSummaryPage } from '../forms/FormABCSummaryPage';
import { FormABCItemsPage } from '../forms/FormABCItemsPage';

interface AbcPrintBundleProps {
  data: AbcReportData;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
}

export function AbcPrintBundle({ data, formatCurrency, formatNumber }: AbcPrintBundleProps) {
  return (
    <>
      <FormABCSummaryPage data={data} formatCurrency={formatCurrency} />
      <FormABCItemsPage data={data} formatCurrency={formatCurrency} formatNumber={formatNumber} />
    </>
  );
}
