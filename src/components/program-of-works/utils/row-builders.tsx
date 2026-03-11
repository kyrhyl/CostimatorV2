import type { JSX } from 'react';
import type {
  ComponentBreakdownPart,
  ItemizedPart,
  WorksPart,
} from '@/types/program-of-works';
import { getDivisionName } from '@/lib/utils/dpwh-constants';

type CurrencyFormatter = (value: number) => string;
type NumberFormatter = (value: number) => string;

export function buildWorksRows(
  worksItems: WorksPart[],
  formatCurrency: CurrencyFormatter,
): JSX.Element[] {
  let currentDivision = '';
  const rows: JSX.Element[] = [];

  worksItems.forEach((worksPart) => {
    if (worksPart.division && worksPart.division !== currentDivision) {
      currentDivision = worksPart.division;
      rows.push(
        <tr key={`div-${currentDivision}`} className="bg-gray-200 font-semibold">
          <td className="border border-black px-1 py-0 text-[0.55rem]" colSpan={7}>
            {currentDivision}
          </td>
        </tr>,
      );
    }

    rows.push(
      <tr key={`${worksPart.part}-header`}>
        <td className="border border-black px-1 py-0 text-[0.55rem]">
          {worksPart.part} - {worksPart.partDescription}
        </td>
        <td className="border border-black px-1 py-0 text-[0.55rem]"></td>
        <td className="border border-black px-1 py-0 text-[0.55rem]"></td>
        <td className="border border-black px-1 py-0 text-[0.55rem]">{worksPart.percent.toFixed(0)}%</td>
        <td className="border border-black px-1 py-0 text-[0.55rem] text-right">
          {formatCurrency(worksPart.asSubmitted)}
        </td>
        <td className="border border-black px-1 py-0 text-[0.55rem]"></td>
        <td className="border border-black px-1 py-0 text-[0.55rem]"></td>
      </tr>,
    );
  });

  return rows;
}

export function buildItemizedRows(
  parts: ItemizedPart[],
  formatCurrency: CurrencyFormatter,
  formatNumber: NumberFormatter,
): JSX.Element[] {
  let currentDivision = '';
  let divisionTotal = 0;
  let grandTotal = 0;
  const rows: JSX.Element[] = [];

  parts.forEach((part) => {
    grandTotal += part.partTotal;
  });

  parts.forEach((part, partIndex) => {
    if (part.division && part.division !== currentDivision && currentDivision !== '') {
      const divisionPercent = grandTotal > 0 ? (divisionTotal / grandTotal) * 100 : 0;
      rows.push(
        <tr key={`div-total-${currentDivision}`} className="bg-[#696969] text-white font-bold uppercase">
          <td className="px-1 py-[3px]" colSpan={5} style={{ border: '1px solid #000' }}>
            TOTAL OF {currentDivision}
          </td>
          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(divisionTotal)}</td>
          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(divisionTotal)}</td>
          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{divisionPercent.toFixed(2)}%</td>
        </tr>,
      );
      divisionTotal = 0;
    }

    if (part.division && part.division !== currentDivision) {
      currentDivision = part.division;
      rows.push(
        <tr key={`div-${currentDivision}-${partIndex}`} className="bg-[#808080] font-semibold uppercase">
          <td className="px-1 py-1" style={{ border: '1px solid #000' }}>{part.division}</td>
          <td className="px-1 py-1" colSpan={11} style={{ border: '1px solid #000' }}>
            {getDivisionName(part.division)}
          </td>
        </tr>,
      );
    }

    divisionTotal += part.partTotal;

    rows.push(
      <tr key={`part-${part.part}-${partIndex}`} className="bg-[#a9a9a9] font-semibold uppercase">
        <td className="px-1 py-1" style={{ border: '1px solid #000' }}>{part.part}</td>
        <td className="px-1 py-1" colSpan={11} style={{ border: '1px solid #000' }}>{part.partDescription}</td>
      </tr>,
    );

    part.items.forEach((item, itemIndex) => {
      rows.push(
        <tr key={`${part.part}-item-${itemIndex}`}>
          <td className="px-1 py-[3px] text-center" style={{ border: '1px solid #000' }}>{item.payItemNumber}</td>
          <td className="px-1 py-[3px]" style={{ border: '1px solid #000' }}>{item.payItemDescription}</td>
          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatNumber(item.quantity)}</td>
          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatNumber(item.quantityEvaluated)}</td>
          <td className="px-1 py-[3px] text-center" style={{ border: '1px solid #000' }}>{item.unitOfMeasurement}</td>
          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.directCostTotal)}</td>
          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.directCostTotalEvaluated)}</td>
          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.directCostUnit)}</td>
          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.directCostUnitEvaluated)}</td>
          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.totalUnitCost)}</td>
          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.totalUnitCostEvaluated)}</td>
          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{item.percentDirectCost.toFixed(2)}%</td>
        </tr>,
      );
    });

    rows.push(
      <tr key={`${part.part}-total-${partIndex}`} className="bg-[#d3d3d3] font-semibold">
        <td className="px-1 py-[3px]" colSpan={5} style={{ border: '1px solid #000' }}>Total of {part.part}</td>
        <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(part.partTotal)}</td>
        <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(part.partTotal)}</td>
        <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
        <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
        <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
        <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
        <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{part.partPercent.toFixed(2)}%</td>
      </tr>,
    );
  });

  if (currentDivision !== '') {
    const divisionPercent = grandTotal > 0 ? (divisionTotal / grandTotal) * 100 : 0;
    rows.push(
      <tr key={`div-total-${currentDivision}-final`} className="bg-[#696969] text-white font-bold uppercase">
        <td className="px-1 py-[3px]" colSpan={5} style={{ border: '1px solid #000' }}>TOTAL OF {currentDivision}</td>
        <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(divisionTotal)}</td>
        <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(divisionTotal)}</td>
        <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
        <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
        <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
        <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
        <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{divisionPercent.toFixed(2)}%</td>
      </tr>,
    );
  }

  rows.push(
    <tr key="grand-total" className="bg-[#4a4a4a] text-white font-bold uppercase">
      <td className="px-1 py-[3px]" colSpan={5} style={{ border: '1px solid #000' }}>GRAND TOTAL (ALL DIVISIONS)</td>
      <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(grandTotal)}</td>
      <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(grandTotal)}</td>
      <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
      <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
      <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
      <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
      <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>100.00%</td>
    </tr>,
  );

  return rows;
}

export function buildComponentBreakdownRows(
  parts: ComponentBreakdownPart[],
  formatCurrency: CurrencyFormatter,
  formatNumber: NumberFormatter,
): JSX.Element[] {
  let currentDivision = '';
  const rows: JSX.Element[] = [];

  parts.forEach((part, partIndex) => {
    if (part.division && part.division !== currentDivision) {
      currentDivision = part.division;
      rows.push(
        <tr key={`annexc-div-${currentDivision}-${partIndex}`} className="bg-[#808080] font-semibold uppercase">
          <td className="px-1 py-1" style={{ border: '1px solid #000' }}>{part.division}</td>
          <td className="px-1 py-1" colSpan={13} style={{ border: '1px solid #000' }}>
            {getDivisionName(part.division)}
          </td>
        </tr>,
      );
    }

    rows.push(
      <tr key={`annexc-part-${part.part}-${partIndex}`} className="bg-[#d3d3d3] font-semibold uppercase">
        <td className="px-1 py-1" style={{ border: '1px solid #000' }}>{part.part}</td>
        <td className="px-1 py-1" colSpan={13} style={{ border: '1px solid #000' }}>{part.partDescription}</td>
      </tr>,
    );

    part.items.forEach((item, itemIndex) => {
      rows.push(
        <tr key={`${part.part}-item-${itemIndex}-evaluated`}>
          <td className="px-1 py-[2px] text-center" rowSpan={2} style={{ border: '1px solid #000' }}>{item.itemNumber}</td>
          <td className="px-1 py-[2px]" rowSpan={2} style={{ border: '1px solid #000' }}>{item.description}</td>
          <td className="px-1 py-[2px] text-center text-[7px]" style={{ border: '1px solid #000' }}>AS EVALUATED</td>
          <td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td>
          <td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td>
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
        <tr key={`${part.part}-item-${itemIndex}-submitted`}>
          <td className="px-1 py-[2px] text-center text-[7px]" style={{ border: '1px solid #000' }}>AS SUBMITTED</td>
          <td className="px-1 py-[2px] text-right text-[7px]" style={{ border: '1px solid #000' }}>{item.asSubmitted.percent.toFixed(2)}%</td>
          <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatNumber(item.asSubmitted.quantity)}</td>
          <td className="px-1 py-[2px] text-center" style={{ border: '1px solid #000' }}>{item.asSubmitted.unit}</td>
          <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.asSubmitted.material)}</td>
          <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.asSubmitted.labor)}</td>
          <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.asSubmitted.equipment)}</td>
          <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.asSubmitted.totalDirectCost)}</td>
          <td className="px-1 py-[2px] text-center" style={{ border: '1px solid #000' }}>{item.asSubmitted.markupPercent.toFixed(0)}%</td>
          <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.asSubmitted.markupValue)}</td>
          <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.asSubmitted.vat)}</td>
          <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.asSubmitted.totalCost)}</td>
        </tr>,
      );
    });

    rows.push(
      <tr key={`${part.part}-total-evaluated-${partIndex}`} className="bg-[#d3d3d3] font-semibold">
        <td className="px-1 py-[2px]" colSpan={2} rowSpan={2} style={{ border: '1px solid #000' }}>TOTAL OF {part.part}</td>
        <td className="px-1 py-[2px] text-center text-[7px]" style={{ border: '1px solid #000' }}>AS EVALUATED</td>
        <td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td>
        <td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td>
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
      <tr key={`${part.part}-total-submitted-${partIndex}`} className="bg-[#d3d3d3] font-semibold">
        <td className="px-1 py-[2px] text-center text-[7px]" style={{ border: '1px solid #000' }}>AS SUBMITTED</td>
        <td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td>
        <td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td>
        <td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td>
        <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(part.totals.material)}</td>
        <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(part.totals.labor)}</td>
        <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(part.totals.equipment)}</td>
        <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(part.totals.totalDirectCost)}</td>
        <td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td>
        <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(part.totals.markupValue)}</td>
        <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(part.totals.vat)}</td>
        <td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(part.totals.totalCost)}</td>
      </tr>,
    );
  });

  return rows;
}
