import type { PowReportData } from '@/types/program-of-works';
import { PowPrintBundle } from '../print/PowPrintBundle';

interface PowTabProps {
  data: PowReportData;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
}

export function PowTab({ data, formatCurrency, formatNumber }: PowTabProps) {
  return <PowPrintBundle data={data} formatCurrency={formatCurrency} formatNumber={formatNumber} />;
}
