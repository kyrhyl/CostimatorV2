import type { AbcReportData } from '@/types/abc';
import type { JSX } from 'react';
import { useMemo } from 'react';
import { A4PageWrapper } from '../common/A4PageWrapper';
import { DpwhFormHeader } from '../common/DpwhFormHeader';
import { SignatoriesSection } from '../common/SignatoriesSection';

interface FormABCSummaryPageProps {
  data: AbcReportData;
  formatCurrency: (value: number) => string;
}

export function FormABCSummaryPage({ data, formatCurrency }: FormABCSummaryPageProps) {
  const summaryRows = useMemo(() => {
    let currentDivision = '';

    return data.parts.flatMap((part) => {
      const rows: JSX.Element[] = [];

      if (part.division && part.division !== currentDivision) {
        currentDivision = part.division;
        rows.push(
          <tr key={`abc-div-${part.division}`} className="bg-[#a6a6a6] font-semibold uppercase">
            <td className="px-1 py-1" style={{ border: '1px solid #000' }}>{part.division}</td>
            <td className="px-1 py-1" colSpan={8} style={{ border: '1px solid #000' }}></td>
          </tr>,
        );
      }

      rows.push(
        <tr key={`abc-part-${part.part}`}>
          <td rowSpan={2} className="px-1 py-[2px] font-semibold align-middle" style={{ border: '1px solid #000' }}>{part.part}</td>
          <td rowSpan={2} className="px-1 py-[2px] font-semibold align-middle" style={{ border: '1px solid #000' }}>{part.partDescription}</td>
          <td className="px-1 py-[2px] text-center text-[0.55rem]" style={{ border: '1px solid #000' }}>AS EVALUATED</td>
          <td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td>
          <td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td>
          <td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td>
          <td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td>
          <td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td>
          <td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td>
        </tr>,
      );

      const percent = part.totals.directCost > 0 ? (part.totals.markupValue / part.totals.directCost) * 100 : 0;
      rows.push(
        <tr key={`abc-part-sub-${part.part}`}>
          <td className="px-1 py-[2px] text-center text-[0.55rem]" style={{ border: '1px solid #000' }}>AS SUBMITTED</td>
          <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(part.totals.directCost)}</td>
          <td className="px-1 py-[2px] text-center" style={{ border: '1px solid #000' }}>{percent.toFixed(0)}%</td>
          <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(part.totals.markupValue)}</td>
          <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(part.totals.vat)}</td>
          <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(part.totals.totalIndirectCost)}</td>
          <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(part.totals.totalCost)}</td>
        </tr>,
      );

      return rows;
    });
  }, [data.parts, formatCurrency]);

  return (
    <A4PageWrapper pageNumber="ABC-1">
      <DpwhFormHeader formNumber="13-14" />

      <div className="grid grid-cols-[1fr_300px] gap-2 text-[0.65rem] mb-2">
        <div>
          <div className="flex"><span className="w-36 font-semibold">Implementing Office:</span><span className="flex-1">{data.header.implementingOffice}</span></div>
          <div className="flex"><span className="w-36 font-semibold">Address:</span><span className="flex-1">{data.header.address}</span></div>
          <div className="flex"><span className="w-36 font-semibold">Project Name:</span><span className="flex-1">{data.header.projectName}</span></div>
          <div className="flex"><span className="w-36 font-semibold">Project Location:</span><span className="flex-1">{data.header.projectLocation}</span></div>
        </div>
        <div>
          <div className="flex"><span className="w-36 font-semibold">Date Prepared:</span><span className="flex-1">{data.header.datePrepared}</span></div>
          <div className="flex"><span className="w-36 font-semibold">Contract Duration:</span><span className="flex-1">{data.header.contractDurationCD.toFixed(0)}</span></div>
        </div>
      </div>

      <table className="w-full border-collapse text-[0.65rem]">
        <thead>
          <tr className="bg-[#333] text-white">
            <th className="px-1 py-1" style={{ border: '1px solid #000', width: '9%' }}>ITEM NO.</th>
            <th className="px-1 py-1" style={{ border: '1px solid #000', width: '29%' }}>DESCRIPTION</th>
            <th className="px-1 py-1" style={{ border: '1px solid #000', width: '8%' }}></th>
            <th className="px-1 py-1" style={{ border: '1px solid #000', width: '12%' }}>ESTIMATED DIRECT COST</th>
            <th className="px-1 py-1" style={{ border: '1px solid #000', width: '4%' }}>%</th>
            <th className="px-1 py-1" style={{ border: '1px solid #000', width: '12%' }}>TOTAL MARK-UP VALUE</th>
            <th className="px-1 py-1" style={{ border: '1px solid #000', width: '12%' }}>VAT</th>
            <th className="px-1 py-1" style={{ border: '1px solid #000', width: '12%' }}>TOTAL INDIRECT COST</th>
            <th className="px-1 py-1" style={{ border: '1px solid #000', width: '12%' }}>TOTAL COST</th>
          </tr>
        </thead>
        <tbody>
          {summaryRows}

          <tr className="bg-[#bfbfbf] font-semibold uppercase">
            <td className="px-1 py-1 text-center align-middle" style={{ border: '1px solid #000' }} colSpan={2} rowSpan={2}>GRAND TOTAL</td>
            <td className="px-1 py-1 text-center text-[0.55rem]" style={{ border: '1px solid #000' }}>AS EVALUATED</td>
            <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
            <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
            <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
            <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
            <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
            <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
          </tr>
          <tr className="bg-[#bfbfbf] font-semibold uppercase">
            <td className="px-1 py-1 text-center text-[0.55rem]" style={{ border: '1px solid #000' }}>AS SUBMITTED</td>
            <td className="px-1 py-1 text-right" style={{ border: '1px solid #000' }}>{formatCurrency(data.totals.directCost)}</td>
            <td className="px-1 py-1"></td>
            <td className="px-1 py-1 text-right" style={{ border: '1px solid #000' }}>{formatCurrency(data.totals.markupValue)}</td>
            <td className="px-1 py-1 text-right" style={{ border: '1px solid #000' }}>{formatCurrency(data.totals.vat)}</td>
            <td className="px-1 py-1 text-right" style={{ border: '1px solid #000' }}>{formatCurrency(data.totals.totalIndirectCost)}</td>
            <td className="px-1 py-1 text-right" style={{ border: '1px solid #000' }}>{formatCurrency(data.totals.totalCost)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-4">
        <SignatoriesSection signatories={data.signatories} />
      </div>
    </A4PageWrapper>
  );
}
