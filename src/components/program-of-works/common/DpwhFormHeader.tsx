import Image from 'next/image';
import { FORM_VERSIONS, FORM_TITLES } from '@/lib/utils/dpwh-constants';

interface DpwhFormHeaderProps {
  formNumber: '13-10' | '13-11' | '13-13' | '13-14' | '13-15' | '13-16';
  compact?: boolean;
}

export function DpwhFormHeader({ formNumber, compact = false }: DpwhFormHeaderProps) {
  const version = FORM_VERSIONS[formNumber];
  const title = FORM_TITLES[formNumber];
  
  const titleClasses = {
    '13-10': 'text-[0.9rem] font-bold mt-0.5 text-[#0038A8]',
    '13-11': 'text-[0.9rem] font-bold mt-0.5 text-[#0038A8]',
    '13-13': 'text-[0.9rem] font-bold uppercase tracking-[0.2em] mt-2 text-[#0038A8]',
    '13-14': 'text-[0.9rem] font-bold mt-2 text-[#0038A8]',
    '13-15': 'text-[0.9rem] font-bold mt-2 text-[#0038A8]',
    '13-16': 'text-[0.9rem] font-bold mt-2 text-[#0038A8]',
  };

  const subtitleClasses = {
    '13-10': 'text-[0.6rem] font-bold uppercase tracking-widest',
    '13-11': 'text-[0.6rem] font-bold uppercase tracking-widest',
    '13-13': 'text-[0.6rem] font-normal',
    '13-14': 'text-[0.6rem] font-normal',
    '13-15': 'text-[0.6rem] font-normal',
    '13-16': 'text-[0.6rem] font-normal',
  };

  const departmentClasses = {
    '13-10': 'text-[0.7rem] font-bold uppercase',
    '13-11': 'text-[0.7rem] font-bold uppercase',
    '13-13': 'text-[0.7rem] font-bold uppercase tracking-wide',
    '13-14': 'text-[0.7rem] font-bold uppercase',
    '13-15': 'text-[0.7rem] font-bold uppercase',
    '13-16': 'text-[0.7rem] font-bold uppercase',
  };

  if (compact) {
    return (
      <div className="flex items-start justify-between mb-4">
        <div className="w-20">
          <div className="w-16 h-16 bg-slate-100 flex items-center justify-center rounded border border-slate-300 overflow-hidden">
            <Image
              src="/dpwh_logo.png"
              alt="DPWH Logo"
              width={64}
              height={64}
              className="object-contain"
            />
          </div>
        </div>

        <div className="flex-1 text-center pt-2">
          <div className="flex justify-end">
            <div className="text-[0.55rem] font-semibold">{version}</div>
          </div>
          <div className={subtitleClasses[formNumber]}>Republic of the Philippines</div>
          <div className={departmentClasses[formNumber]}>Department of Public Works and Highways</div>
          <div className={titleClasses[formNumber]}>{title}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[70px_1fr] gap-0 mb-2">
      <div className="flex items-center justify-center">
        <div className="w-[60px] h-[60px] bg-slate-100 flex items-center justify-center rounded border border-slate-300 overflow-hidden">
          <Image
            src="/dpwh_logo.png"
            alt="DPWH Logo"
            width={60}
            height={60}
            className="object-contain"
          />
        </div>
      </div>

      <div className="text-center">
        <div className="flex justify-end">
          <div className="text-[0.55rem] font-semibold">{version}</div>
        </div>
        <div className={subtitleClasses[formNumber]}>
          Republic of the Philippines
        </div>
        <div className="text-[0.7rem] font-bold uppercase">
          Department of Public Works and Highways
        </div>
        <div className={titleClasses[formNumber]}>{title}</div>
      </div>
    </div>
  );
}
