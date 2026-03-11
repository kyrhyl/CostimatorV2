import type { AbcReportData } from '@/types/abc';
import { AbcPrintBundle } from '../print/AbcPrintBundle';

interface AbcTabProps {
  data: AbcReportData;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
}

export function AbcTab({ data, formatCurrency, formatNumber }: AbcTabProps) {
  return <AbcPrintBundle data={data} formatCurrency={formatCurrency} formatNumber={formatNumber} />;
}
