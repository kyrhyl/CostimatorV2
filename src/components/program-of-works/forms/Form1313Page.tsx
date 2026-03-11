import type { ComponentBreakdownPart, PowHeader } from '@/types/program-of-works';
import { useMemo } from 'react';
import { A4PageWrapper } from '../common/A4PageWrapper';
import { DpwhFormHeader } from '../common/DpwhFormHeader';
import { ProjectInfoSection } from '../common/ProjectInfoSection';
import { buildComponentBreakdownRows } from '../utils/row-builders';

interface Form1313PageProps {
  header: PowHeader;
  componentBreakdown: ComponentBreakdownPart[];
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
}

export function Form1313Page({ header, componentBreakdown, formatCurrency, formatNumber }: Form1313PageProps) {
  const componentRows = useMemo(
    () => buildComponentBreakdownRows(componentBreakdown, formatCurrency, formatNumber),
    [componentBreakdown, formatCurrency, formatNumber],
  );

  return (
    <A4PageWrapper pageNumber={3}>
      <DpwhFormHeader formNumber="13-13" compact />
      <ProjectInfoSection header={header} variant="minimal" />

      <table className="itemized-table text-[8px] w-full">
        <colgroup>
          <col style={{ width: '6%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '5%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '5%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '5%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '8%' }} />
        </colgroup>
        <thead>
          <tr className="bg-[#4a4a4a] text-white">
            <th rowSpan={2} className="px-1 py-2 text-left font-normal" style={{ border: '1px solid #000' }}>ITEM NO.</th>
            <th rowSpan={2} className="px-1 py-2 text-left font-normal" style={{ border: '1px solid #000' }}>DESCRIPTION</th>
            <th rowSpan={2} className="px-1 py-2 text-center font-normal" style={{ border: '1px solid #000' }}></th>
            <th rowSpan={2} className="px-1 py-2 text-center font-normal" style={{ border: '1px solid #000' }}>%</th>
            <th rowSpan={2} className="px-1 py-2 text-center font-normal" style={{ border: '1px solid #000' }}>QUANTITY</th>
            <th rowSpan={2} className="px-1 py-2 text-center font-normal" style={{ border: '1px solid #000' }}>UNIT</th>
            <th colSpan={3} className="px-1 py-2 text-center font-normal" style={{ border: '1px solid #000' }}>DIRECT COST</th>
            <th rowSpan={2} className="px-1 py-2 text-center font-normal" style={{ border: '1px solid #000' }}>TOTAL</th>
            <th colSpan={2} className="px-1 py-2 text-center font-normal" style={{ border: '1px solid #000' }}>TOTAL MARK-UP</th>
            <th rowSpan={2} className="px-1 py-2 text-center font-normal" style={{ border: '1px solid #000' }}>VAT</th>
            <th rowSpan={2} className="px-1 py-2 text-center font-normal" style={{ border: '1px solid #000' }}>TOTAL COST</th>
          </tr>
          <tr className="bg-[#4a4a4a] text-white">
            <th className="px-1 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>MATERIAL</th>
            <th className="px-1 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>LABOR</th>
            <th className="px-1 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>EQUIPMENT</th>
            <th className="px-1 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>%</th>
            <th className="px-1 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>VALUE</th>
          </tr>
        </thead>
        <tbody>{componentRows}</tbody>
      </table>
    </A4PageWrapper>
  );
}
