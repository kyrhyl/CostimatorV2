import { PowHeader } from '@/types/program-of-works';

interface ProjectInfoSectionProps {
  header: PowHeader;
  variant: 'full' | 'minimal';
}

export function ProjectInfoSection({ header, variant }: ProjectInfoSectionProps) {
  if (variant === 'minimal') {
    return (
      <div className="space-y-1 mb-4">
        <div className="flex items-baseline">
          <span className="text-[10px] font-semibold w-28">Implementing Office:</span>
          <span className="flex-1 border-b border-slate-900 text-[10px] px-1">
            {header.implementingOffice}
          </span>
        </div>
        <div className="flex items-baseline">
          <span className="text-[10px] font-semibold w-28">Address:</span>
          <span className="flex-1 border-b border-slate-900 text-[10px] px-1">
            {header.address}
          </span>
        </div>
        <div className="flex items-baseline">
          <span className="text-[10px] font-semibold w-28">Project Name:</span>
          <span className="flex-1 border-b border-slate-900 text-[10px] px-1">
            {header.projectName}
          </span>
        </div>
        <div className="flex items-baseline">
          <span className="text-[10px] font-semibold w-28">Project Location:</span>
          <span className="flex-1 border-b border-slate-900 text-[10px] px-1">
            {header.projectLocation}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[130mm_75mm_70mm] gap-0 text-[0.65rem] mb-1">
      <div className="p-0.5">
        <div className="flex">
          <span className="w-36 font-semibold">Implementing Office:</span>
          <span className="flex-1">{header.implementingOffice}</span>
        </div>
        <div className="flex">
          <span className="w-36 font-semibold">Address:</span>
          <span className="flex-1">{header.address}</span>
        </div>
        <div className="flex">
          <span className="w-36 font-semibold">Project Name:</span>
          <span className="flex-1">{header.projectName}</span>
        </div>
        <div className="flex">
          <span className="w-36 font-semibold">Project Location:</span>
          <span className="flex-1">{header.projectLocation}</span>
        </div>
      </div>
      <div className="ml-8 p-0.5">
        <div className="flex">
          <span className="w-36 font-semibold">Date Prepared:</span>
          <span className="flex-1">{header.datePrepared}</span>
        </div>
        <div className="flex">
          <span className="w-36 font-semibold">Target Start Date:</span>
          <span className="flex-1">{header.targetStartDate}</span>
        </div>
        <div className="flex">
          <span className="w-36 font-semibold">Target Completion Date:</span>
          <span className="flex-1">{header.targetCompletionDate}</span>
        </div>
      </div>
      <div className="ml-8 p-0.5">
        <div className="flex">
          <span className="w-40 font-semibold">Contract Duration:</span>
          <span className="flex-1">{header.contractDurationCD.toFixed(2)} CD</span>
        </div>
        <div className="flex">
          <span className="w-40 font-semibold">No. of Workable Days:</span>
          <span className="flex-1">{header.workingDays} CD</span>
        </div>
        <div className="flex">
          <span className="w-45 font-semibold">No. of Predetermined Unworkable Days:</span>
          <span className="flex-1"></span>
        </div>
        <div className="flex ml-20">
          <span className="w-20">a. Sundays:</span>
          <span className="flex-1">{header.unworkableDays.sundays} CD</span>
        </div>
        <div className="flex ml-20">
          <span className="w-20">b. Holidays:</span>
          <span className="flex-1">{header.unworkableDays.holidays} CD</span>
        </div>
        <div className="flex ml-20">
          <span className="w-20">c. Rainy Days:</span>
          <span className="flex-1">{header.unworkableDays.rainyDays} CD</span>
        </div>
      </div>
    </div>
  );
}
