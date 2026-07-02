import { render, screen } from '@testing-library/react';
import { buildItemizedRows, buildWorksRows } from './row-builders';
import type { ItemizedPart, WorksPart } from '@/types/program-of-works';

const formatCurrency = (value: number) => `PHP ${value.toFixed(2)}`;
const formatNumber = (value: number) => value.toFixed(2);

describe('row-builders', () => {
  it('buildWorksRows renders division and part rows', () => {
    const worksItems: WorksPart[] = [
      {
        part: 'PART A',
        partDescription: 'GENERAL',
        division: 'DIVISION I',
        items: [],
        asSubmitted: 1000,
        percent: 100,
      },
    ];

    const rows = buildWorksRows(worksItems, formatCurrency);

    render(
      <table>
        <tbody>{rows}</tbody>
      </table>,
    );

    expect(screen.getByText('DIVISION I')).toBeInTheDocument();
    expect(screen.getByText('PART A - GENERAL')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('buildWorksRows avoids repeating normalized part descriptions', () => {
    const worksItems: WorksPart[] = [
      {
        part: 'PART C: EARTHWORK',
        partDescription: 'EARTHWORK',
        division: 'DIVISION I',
        items: [],
        asSubmitted: 1000,
        percent: 100,
      },
    ];

    const rows = buildWorksRows(worksItems, formatCurrency);

    render(
      <table>
        <tbody>{rows}</tbody>
      </table>,
    );

    expect(screen.getByText('PART C: EARTHWORK')).toBeInTheDocument();
    expect(screen.queryByText('PART C: EARTHWORK - EARTHWORK')).not.toBeInTheDocument();
  });

  it('buildItemizedRows renders grand total and division totals', () => {
    const parts: ItemizedPart[] = [
      {
        part: 'PART A',
        partDescription: 'GENERAL',
        division: 'DIVISION I',
        partTotal: 100,
        partPercent: 40,
        items: [
          {
            payItemNumber: '100',
            payItemDescription: 'Mobilization',
            quantity: 1,
            quantityEvaluated: 1,
            unitOfMeasurement: 'LOT',
            directCostTotal: 100,
            directCostTotalEvaluated: 100,
            directCostUnit: 100,
            directCostUnitEvaluated: 100,
            totalUnitCost: 112,
            totalUnitCostEvaluated: 112,
            percentDirectCost: 40,
          },
        ],
      },
      {
        part: 'PART E',
        partDescription: 'FINISHINGS',
        division: 'DIVISION II',
        partTotal: 150,
        partPercent: 60,
        items: [
          {
            payItemNumber: '500',
            payItemDescription: 'Paving',
            quantity: 2,
            quantityEvaluated: 2,
            unitOfMeasurement: 'SQM',
            directCostTotal: 150,
            directCostTotalEvaluated: 150,
            directCostUnit: 75,
            directCostUnitEvaluated: 75,
            totalUnitCost: 84,
            totalUnitCostEvaluated: 84,
            percentDirectCost: 60,
          },
        ],
      },
    ];

    const rows = buildItemizedRows(parts, formatCurrency, formatNumber);

    render(
      <table>
        <tbody>{rows}</tbody>
      </table>,
    );

    expect(screen.getByText('TOTAL OF DIVISION I')).toBeInTheDocument();
    expect(screen.getByText('TOTAL OF DIVISION II')).toBeInTheDocument();
    expect(screen.getByText('GRAND TOTAL (ALL DIVISIONS)')).toBeInTheDocument();
  });
});
