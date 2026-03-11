import { A4PageWrapper } from '../common/A4PageWrapper';

interface SectionSeparatorPageProps {
  pageNumber: string;
  title: string;
  subtitle?: string;
}

export function SectionSeparatorPage({ pageNumber, title, subtitle }: SectionSeparatorPageProps) {
  return (
    <A4PageWrapper pageNumber={pageNumber}>
      <div className="h-full min-h-[180mm] flex flex-col items-center justify-center text-center">
        <div className="text-[0.75rem] uppercase tracking-[0.25em] text-slate-500 mb-4">Prescribed Forms</div>
        <h2 className="text-3xl font-bold text-slate-900 uppercase tracking-wide max-w-[70ch]">{title}</h2>
        {subtitle && <p className="mt-4 text-lg text-slate-600">{subtitle}</p>}
      </div>
    </A4PageWrapper>
  );
}
