import { render, screen } from '@testing-library/react';
import ProgramOfWorksItemizedTable from './ProgramOfWorksItemizedTable';

describe('ProgramOfWorksItemizedTable percentages', () => {
  it('uses total project cost as denominator for part and item percentages', () => {
    render(
      <ProgramOfWorksItemizedTable
        grandTotal={1000}
        groups={[
          {
            part: 'PART A',
            description: 'General',
            totalAmount: 600,
            items: [
              {
                id: '1',
                part: 'PART A',
                itemNo: '100',
                description: 'Item A',
                quantity: 1,
                unit: 'LOT',
                unitCost: 600,
                directCost: 500,
                totalAmount: 600,
              },
            ],
          },
          {
            part: 'PART B',
            description: 'Other',
            totalAmount: 400,
            items: [
              {
                id: '2',
                part: 'PART B',
                itemNo: '200',
                description: 'Item B',
                quantity: 1,
                unit: 'LOT',
                unitCost: 400,
                directCost: 300,
                totalAmount: 400,
              },
            ],
          },
        ]}
      />,
    );

    expect(screen.getAllByText('60.00%').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('40.00%').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('100.00%')).toBeInTheDocument();
  });
});
