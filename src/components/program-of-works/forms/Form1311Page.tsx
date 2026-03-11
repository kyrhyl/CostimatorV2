import type { PowHeader, ItemizedPart } from '@/types/program-of-works';
import { useMemo } from 'react';
import { A4PageWrapper } from '../common/A4PageWrapper';
import { DpwhFormHeader } from '../common/DpwhFormHeader';
import { ProjectInfoSection } from '../common/ProjectInfoSection';
import { buildItemizedRows } from '../utils/row-builders';

interface Form1311PageProps {
  header: PowHeader;
  itemizedParts: ItemizedPart[];
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
}

export function Form1311Page({ header, itemizedParts, formatCurrency, formatNumber }: Form1311PageProps) {
  const itemizedRows = useMemo(
    () => buildItemizedRows(itemizedParts, formatCurrency, formatNumber),
    [itemizedParts, formatCurrency, formatNumber],
  );

  return (
    <A4PageWrapper pageNumber={2}>
      <DpwhFormHeader formNumber="13-11" compact />
      <ProjectInfoSection header={header} variant="minimal" />

      <table className="itemized-table text-[8.5px] w-full">
        <colgroup>
          <col style={{ width: '6%' }} />
          <col style={{ width: '28%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '5%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '5%' }} />
        </colgroup>
        <thead>
          <tr className="bg-[#4a4a4a] text-white">
            <th rowSpan={2} className="px-1 py-2 text-left font-normal" style={{ border: '1px solid #000' }}>ITEM NO.</th>
            <th rowSpan={2} className="px-1 py-2 text-left font-normal" style={{ border: '1px solid #000' }}>DESCRIPTION</th>
            <th colSpan={2} className="px-1 py-2 text-center font-normal" style={{ border: '1px solid #000' }}>QUANTITY</th>
            <th rowSpan={2} className="px-1 py-2 text-center font-normal" style={{ border: '1px solid #000' }}>UNIT</th>
            <th colSpan={2} className="px-1 py-2 text-center font-normal" style={{ border: '1px solid #000' }}>DIRECT COST TOTAL</th>
            <th colSpan={2} className="px-1 py-2 text-center font-normal" style={{ border: '1px solid #000' }}>DIRECT COST UNIT COST</th>
            <th colSpan={2} className="px-1 py-2 text-center font-normal" style={{ border: '1px solid #000' }}>TOTAL UNIT COST DIRECT + INDIRECT</th>
            <th rowSpan={2} className="px-1 py-2 text-center font-normal" style={{ border: '1px solid #000' }}>% PROJECT COST</th>
          </tr>
          <tr className="bg-[#4a4a4a] text-white">
            <th className="px-1 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>AS SUBMITTED</th>
            <th className="px-1 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>AS EVALUATED</th>
            <th className="px-1 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>AS SUBMITTED</th>
            <th className="px-1 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>AS EVALUATED</th>
            <th className="px-1 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>AS SUBMITTED</th>
            <th className="px-1 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>AS EVALUATED</th>
            <th className="px-1 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>AS SUBMITTED</th>
            <th className="px-1 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>AS EVALUATED</th>
          </tr>
        </thead>
        <tbody>{itemizedRows}</tbody>
      </table>
    </A4PageWrapper>
  );
}
