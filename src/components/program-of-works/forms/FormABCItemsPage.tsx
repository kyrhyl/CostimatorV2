import type { AbcReportData } from '@/types/abc';
import type { JSX } from 'react';
import { useMemo } from 'react';
import { A4PageWrapper } from '../common/A4PageWrapper';
import { DpwhFormHeader } from '../common/DpwhFormHeader';
import { getDivisionName } from '@/lib/utils/dpwh-constants';

interface FormABCItemsPageProps {
  data: AbcReportData;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
}

export function FormABCItemsPage({ data, formatCurrency, formatNumber }: FormABCItemsPageProps) {
  const formatMarkupPercent = (value: number) => `${(value || 0).toFixed(0)}%`;
  const formatAmountOrDash = (value: number) => (value > 0 ? formatCurrency(value) : '-');
  const partRows = useMemo(() => {
    let currentDivision = '';

    return data.parts.flatMap((part, partIndex) => {
      const rows: JSX.Element[] = [];

      if (part.division && part.division !== currentDivision) {
        currentDivision = part.division;
        rows.push(
          <tr key={`abc-items-div-${part.division}-${partIndex}`} className="bg-[#a6a6a6] font-semibold uppercase">
            <td className="px-1 py-1" style={{ border: '1px solid #000' }}>{part.division}</td>
            <td className="px-1 py-1" colSpan={11} style={{ border: '1px solid #000' }}>{getDivisionName(part.division)}</td>
          </tr>,
        );
      }

      rows.push(
        <tr key={`abc-items-part-${part.part}-${partIndex}`} className="bg-[#d9d9d9] font-semibold uppercase">
          <td className="px-1 py-1" style={{ border: '1px solid #000' }}>{part.part}</td>
          <td className="px-1 py-1" colSpan={11} style={{ border: '1px solid #000' }}>{part.partDescription}</td>
        </tr>,
      );

      part.items.forEach((item, itemIndex) => {
        rows.push(
          <tr key={`abc-items-line-eval-${part.part}-${item.payItemNumber}-${itemIndex}`}>
            <td rowSpan={2} className="px-1 py-[2px] align-middle" style={{ border: '1px solid #000' }}>{item.payItemNumber}</td>
            <td rowSpan={2} className="px-1 py-[2px] align-middle" style={{ border: '1px solid #000' }}>{item.payItemDescription}</td>
            <td className="px-1 py-[2px] text-center text-[0.55rem]" style={{ border: '1px solid #000' }}>AS EVALUATED</td>
            <td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td>
            <td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td>
            <td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td>
            <td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td>
            <td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td>
            <td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td>
            <td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td>
            <td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td>
            <td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td>
          </tr>,
        );

        rows.push(
          <tr key={`abc-items-line-sub-${part.part}-${item.payItemNumber}-${itemIndex}`}>
            <td className="px-1 py-[2px] text-center text-[0.55rem]" style={{ border: '1px solid #000' }}>AS SUBMITTED</td>
            <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatNumber(item.quantity)}</td>
            <td className="px-1 py-[2px] text-center" style={{ border: '1px solid #000' }}>{item.unitOfMeasurement}</td>
            <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.directCost)}</td>
            <td className="px-1 py-[2px] text-center" style={{ border: '1px solid #000' }}>{formatMarkupPercent(item.markupPercent)}</td>
            <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.markupValue)}</td>
            <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.vat)}</td>
            <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.totalIndirectCost)}</td>
            <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.totalCost)}</td>
            <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.unitCost)}</td>
          </tr>,
        );
      });

      rows.push(
        <tr key={`abc-items-total-eval-${part.part}-${partIndex}`} className="bg-[#efefef] font-semibold uppercase">
          <td rowSpan={2} className="px-1 py-1 align-middle" colSpan={2} style={{ border: '1px solid #000' }}>TOTAL OF {part.part}</td>
          <td className="px-1 py-1 text-center text-[0.55rem]" style={{ border: '1px solid #000' }}>AS EVALUATED</td>
          <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
          <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
          <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
          <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
          <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
          <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
          <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
          <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
          <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
        </tr>,
      );

      const partMarkupPercent = part.totals.directCost > 0
        ? (part.totals.markupValue / part.totals.directCost) * 100
        : 0;

      rows.push(
        <tr key={`abc-items-total-sub-${part.part}-${partIndex}`} className="bg-[#efefef] font-semibold uppercase">
          <td className="px-1 py-1 text-center text-[0.55rem]" style={{ border: '1px solid #000' }}>AS SUBMITTED</td>
          <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
          <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
          <td className="px-1 py-1 text-right" style={{ border: '1px solid #000' }}>{formatCurrency(part.totals.directCost)}</td>
          <td className="px-1 py-1 text-center" style={{ border: '1px solid #000' }}>{formatMarkupPercent(partMarkupPercent)}</td>
          <td className="px-1 py-1 text-right" style={{ border: '1px solid #000' }}>{formatAmountOrDash(part.totals.markupValue)}</td>
          <td className="px-1 py-1 text-right" style={{ border: '1px solid #000' }}>{formatCurrency(part.totals.vat)}</td>
          <td className="px-1 py-1 text-right" style={{ border: '1px solid #000' }}>{formatCurrency(part.totals.totalIndirectCost)}</td>
          <td className="px-1 py-1 text-right" style={{ border: '1px solid #000' }}>{formatCurrency(part.totals.totalCost)}</td>
          <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
        </tr>,
      );

      return rows;
    });
  }, [data.parts, formatCurrency, formatNumber]);

  return (
    <A4PageWrapper pageNumber="ABC-2">
      <DpwhFormHeader formNumber="13-15" compact />

      <div className="mb-2 text-[0.65rem]">
        <div className="flex"><span className="w-36 font-semibold">Project Name:</span><span>{data.header.projectName}</span></div>
        <div className="flex"><span className="w-36 font-semibold">Project Location:</span><span>{data.header.projectLocation}</span></div>
      </div>

      <table className="itemized-table text-[8px] w-full">
        <colgroup>
          <col style={{ width: '7%' }} />
          <col style={{ width: '24%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '4%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '8%' }} />
        </colgroup>
        <thead>
          <tr className="bg-[#333] text-white">
            <th className="px-1 py-1" style={{ border: '1px solid #000' }}>ITEM NO.</th>
            <th className="px-1 py-1" style={{ border: '1px solid #000' }}>DESCRIPTION</th>
            <th className="px-1 py-1" style={{ border: '1px solid #000' }}></th>
            <th className="px-1 py-1" style={{ border: '1px solid #000' }}>QUANTITY</th>
            <th className="px-1 py-1" style={{ border: '1px solid #000' }}>UNIT</th>
            <th className="px-1 py-1" style={{ border: '1px solid #000' }}>ESTIMATED DIRECT COST</th>
            <th className="px-1 py-1" style={{ border: '1px solid #000' }}>%</th>
            <th className="px-1 py-1" style={{ border: '1px solid #000' }}>TOTAL MARK-UP VALUE</th>
            <th className="px-1 py-1" style={{ border: '1px solid #000' }}>VAT</th>
            <th className="px-1 py-1" style={{ border: '1px solid #000' }}>TOTAL INDIRECT COST</th>
            <th className="px-1 py-1" style={{ border: '1px solid #000' }}>TOTAL COST</th>
            <th className="px-1 py-1" style={{ border: '1px solid #000' }}>UNIT COST</th>
          </tr>
        </thead>
        <tbody>
          {partRows}

          <tr className="bg-[#bfbfbf] font-bold uppercase">
            <td rowSpan={2} className="px-1 py-1 align-middle" colSpan={2} style={{ border: '1px solid #000' }}>GRAND TOTAL</td>
            <td className="px-1 py-1 text-center text-[0.55rem]" style={{ border: '1px solid #000' }}>AS EVALUATED</td>
            <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
            <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
            <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
            <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
            <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
            <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
            <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
            <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
          </tr>

          <tr className="bg-[#bfbfbf] font-bold uppercase">
            <td className="px-1 py-1 text-center text-[0.55rem]" style={{ border: '1px solid #000' }}>AS SUBMITTED</td>
            <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
            <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
            <td className="px-1 py-1 text-right" style={{ border: '1px solid #000' }}>{formatCurrency(data.totals.directCost)}</td>
            <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
            <td className="px-1 py-1 text-right" style={{ border: '1px solid #000' }}>{formatAmountOrDash(data.totals.markupValue)}</td>
            <td className="px-1 py-1 text-right" style={{ border: '1px solid #000' }}>{formatCurrency(data.totals.vat)}</td>
            <td className="px-1 py-1 text-right" style={{ border: '1px solid #000' }}>{formatCurrency(data.totals.totalIndirectCost)}</td>
            <td className="px-1 py-1 text-right" style={{ border: '1px solid #000' }}>{formatCurrency(data.totals.totalCost)}</td>
            <td className="px-1 py-1" style={{ border: '1px solid #000' }}></td>
          </tr>
        </tbody>
      </table>
    </A4PageWrapper>
  );
}
