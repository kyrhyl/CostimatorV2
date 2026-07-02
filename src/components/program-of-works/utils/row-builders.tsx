import type { JSX } from 'react';
import type {
  ComponentBreakdownPart,
  ItemizedPart,
  WorksPart,
} from '@/types/program-of-works';
import { getDivisionName } from '@/lib/utils/dpwh-constants';
import { formatUnit } from '@/lib/utils/format';

type CurrencyFormatter = (value: number) => string;
type NumberFormatter = (value: number) => string;

export function buildWorksRows(
  worksItems: WorksPart[],
  formatCurrency: CurrencyFormatter,
): JSX.Element[] {
  let currentDivision = '';
  const rows: JSX.Element[] = [];

  worksItems.forEach((worksPart) => {
    const partLabel = worksPart.part.includes(':')
      ? worksPart.part
      : `${worksPart.part} - ${worksPart.partDescription}`;

    if (worksPart.division && worksPart.division !== currentDivision) {
      currentDivision = worksPart.division;
      rows.push(
        <tr key={`div-${currentDivision}`} className="bg-gray-200 font-semibold">
          <td className="border border-black px-1 py-[0.5px] text-[0.5rem]" colSpan={7}>
            {currentDivision}
          </td>
        </tr>,
      );
    }

    rows.push(
      <tr key={`${worksPart.part}-header`}>
        <td className="border border-black px-1 py-[0.5px] text-[0.5rem]">
          {partLabel}
        </td>
        <td className="border border-black px-1 py-[0.5px] text-[0.5rem]"></td>
        <td className="border border-black px-1 py-[0.5px] text-[0.5rem]"></td>
        <td className="border border-black px-1 py-[0.5px] text-[0.5rem]">{worksPart.percent.toFixed(0)}%</td>
        <td className="border border-black px-1 py-[0.5px] text-[0.5rem] text-right">
          {formatCurrency(worksPart.asSubmitted)}
        </td>
        <td className="border border-black px-1 py-[0.5px] text-[0.5rem]"></td>
        <td className="border border-black px-1 py-[0.5px] text-[0.5rem]"></td>
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
        <td className="px-1 py-[0.5px]" style={{ border: '1px solid #000' }} colSpan={12}>{part.part}</td>
      </tr>,
    );

    const itemsWithSubGroup = part.items as (typeof part.items[0] & { subGroup?: string })[];
    const hasSubGroups = !part.part.startsWith('PART B') && !part.part.startsWith('PART C') && !part.part.startsWith('PART D') && itemsWithSubGroup.some((item) => item.subGroup);

    const minPayItemByGroup = new Map<string, string>();
    if (hasSubGroups) {
      for (const item of itemsWithSubGroup) {
        const sub = String(item.subGroup || '').trim();
        if (sub) {
          const existing = minPayItemByGroup.get(sub);
          if (!existing || item.payItemNumber.localeCompare(existing, undefined, { numeric: true }) < 0) {
            minPayItemByGroup.set(sub, item.payItemNumber);
          }
        }
      }
    }

    const orderedItems = hasSubGroups
      ? [...itemsWithSubGroup].sort((left, right) => {
          const leftGroup = String(left.subGroup || '').trim();
          const rightGroup = String(right.subGroup || '').trim();
          if (leftGroup !== rightGroup) {
            if (!leftGroup) return 1;
            if (!rightGroup) return -1;
            const byGroup = (minPayItemByGroup.get(leftGroup) || '').localeCompare(
              minPayItemByGroup.get(rightGroup) || '',
              undefined,
              { numeric: true }
            );
            if (byGroup !== 0) return byGroup;
          }
          return left.payItemNumber.localeCompare(right.payItemNumber, undefined, { numeric: true, sensitivity: 'base' });
        })
      : itemsWithSubGroup;

    let currentSubGroup = '';
    const isPartBCOrD = part.part.startsWith('PART B') || part.part.startsWith('PART C') || part.part.startsWith('PART D');
    orderedItems.forEach((item, itemIndex) => {
      const nextSubGroup = !isPartBCOrD && item.subGroup ? item.subGroup.trim().toUpperCase() : '';
      if (nextSubGroup && nextSubGroup !== currentSubGroup) {
        currentSubGroup = nextSubGroup;
        rows.push(
          <tr key={`${part.part}-sub-${currentSubGroup}`} className="bg-[#c0c0c0] font-semibold uppercase">
            <td className="px-1 py-[0.5px]" style={{ border: '1px solid #000' }}></td>
            <td className="px-1 py-[0.5px]" style={{ border: '1px solid #000' }} colSpan={11}>{currentSubGroup}</td>
          </tr>,
        );
      }

      rows.push(
        <tr key={`${part.part}-item-${itemIndex}`}>
          <td className="px-1 py-[3px] text-center" style={{ border: '1px solid #000' }}>{item.payItemNumber}</td>
          <td className="px-1 py-[3px]" style={{ border: '1px solid #000' }}>{item.payItemDescription}</td>
          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatNumber(item.quantity)}</td>
          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
          <td className="px-1 py-[3px] text-center" style={{ border: '1px solid #000' }}>{formatUnit(item.unitOfMeasurement)}</td>
          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.directCostTotal)}</td>
          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.directCostUnit)}</td>
          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.totalUnitCost)}</td>
          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
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
        <td className="px-1 py-[0.5px]" style={{ border: '1px solid #000' }} colSpan={14}>{part.part}</td>
      </tr>,
    );

    const componentItemsWithSubGroup = part.items as (typeof part.items[0] & { subGroup?: string })[];
    const showComponentSubGroup = part.part.startsWith('PART E');

    const orderedComponentItems = showComponentSubGroup && componentItemsWithSubGroup.some(i => i.subGroup)
      ? [...componentItemsWithSubGroup].sort((left, right) => {
          const lg = String(left.subGroup || '').trim();
          const rg = String(right.subGroup || '').trim();
          if (lg !== rg) {
            if (!lg) return 1;
            if (!rg) return -1;
            return lg.localeCompare(rg, undefined, { sensitivity: 'base' });
          }
          return left.itemNumber.localeCompare(right.itemNumber, undefined, { numeric: true });
        })
      : componentItemsWithSubGroup;

    let currentComponentSubGroup = '';
    orderedComponentItems.forEach((item, itemIndex) => {
      const nextSubGroup = showComponentSubGroup && item.subGroup ? item.subGroup.trim().toUpperCase() : '';
      if (nextSubGroup && nextSubGroup !== currentComponentSubGroup) {
        currentComponentSubGroup = nextSubGroup;
        rows.push(
          <tr key={`${part.part}-csub-${currentComponentSubGroup}`} className="bg-[#c0c0c0] font-semibold uppercase">
            <td className="px-1 py-[0.5px]" style={{ border: '1px solid #000' }}></td>
            <td className="px-1 py-[0.5px]" style={{ border: '1px solid #000' }} colSpan={13}>{currentComponentSubGroup}</td>
          </tr>,
        );
      }

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
          <td className="px-1 py-[2px] text-center" style={{ border: '1px solid #000' }}>{formatUnit(item.asSubmitted.unit)}</td>
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
