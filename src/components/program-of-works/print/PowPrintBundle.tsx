import type { PowReportData } from '@/types/program-of-works';
import { Form1310Page } from '../forms/Form1310Page';
import { Form1311Page } from '../forms/Form1311Page';
import { Form1313Page } from '../forms/Form1313Page';

interface PowPrintBundleProps {
  data: PowReportData;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
}

export function PowPrintBundle({ data, formatCurrency, formatNumber }: PowPrintBundleProps) {
  return (
    <>
      <Form1310Page data={data} totalDirectCost={data.breakdown.directCost} formatCurrency={formatCurrency} />
      {data.itemizedParts && data.itemizedParts.length > 0 && (
        <Form1311Page
          header={data.header}
          itemizedParts={data.itemizedParts}
          formatCurrency={formatCurrency}
          formatNumber={formatNumber}
        />
      )}
      {data.componentBreakdown && data.componentBreakdown.length > 0 && (
        <Form1313Page
          header={data.header}
          componentBreakdown={data.componentBreakdown}
          formatCurrency={formatCurrency}
          formatNumber={formatNumber}
        />
      )}
    </>
  );
}
