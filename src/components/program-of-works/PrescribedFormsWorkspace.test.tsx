import { fireEvent, render, screen } from '@testing-library/react';
import type { Mock } from 'vitest';
import PrescribedFormsWorkspace from './PrescribedFormsWorkspace';
import { usePrescribedFormsData } from './hooks/usePrescribedFormsData';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: any }) => <a href={href}>{children}</a>,
}));

vi.mock('./hooks/usePrescribedFormsData', () => ({
  usePrescribedFormsData: vi.fn(),
}));

vi.mock('./tabs/PowTab', () => ({
  PowTab: () => <div>POW TAB CONTENT</div>,
}));

vi.mock('./tabs/AbcTab', () => ({
  AbcTab: () => <div>ABC TAB CONTENT</div>,
}));

vi.mock('./tabs/DupaTab', () => ({
  DupaTab: () => <div>DUPA TAB CONTENT</div>,
}));

describe('PrescribedFormsWorkspace', () => {
  const mockUsePrescribedFormsData = usePrescribedFormsData as Mock;

  it('renders loading state', () => {
    mockUsePrescribedFormsData.mockReturnValue({
      data: { pow: null, abc: null, dupa: null },
      loading: { pow: true, abc: true, dupa: true, any: true },
      error: { pow: '', abc: '', dupa: '', any: '' },
      refetch: vi.fn(),
    });

    render(<PrescribedFormsWorkspace projectId="project-1" />);
    expect(screen.getByText('Loading prescribed forms...')).toBeInTheDocument();
  });

  it('renders error state and retry action', () => {
    const refetch = vi.fn();
    mockUsePrescribedFormsData.mockReturnValue({
      data: { pow: null, abc: null, dupa: null },
      loading: { pow: false, abc: false, dupa: false, any: false },
      error: { pow: 'Failed', abc: '', dupa: '', any: 'Failed to load' },
      refetch,
    });

    render(<PrescribedFormsWorkspace projectId="project-1" />);
    expect(screen.getByText('Unable to load prescribed forms')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('switches tabs between POW and ABC', () => {
    mockUsePrescribedFormsData.mockReturnValue({
      data: { pow: {} as any, abc: {} as any, dupa: {} as any },
      loading: { pow: false, abc: false, dupa: false, any: false },
      error: { pow: '', abc: '', dupa: '', any: '' },
      refetch: vi.fn(),
    });

    render(<PrescribedFormsWorkspace projectId="project-1" />);
    expect(screen.getByText('POW TAB CONTENT')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'ABC' }));
    expect(screen.getByText('ABC TAB CONTENT')).toBeInTheDocument();
  });
});
