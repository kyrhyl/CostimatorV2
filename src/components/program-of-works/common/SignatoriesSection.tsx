import { Signatories } from '@/types/program-of-works';

interface SignatoriesSectionProps {
  signatories: Signatories;
}

export function SignatoriesSection({ signatories }: SignatoriesSectionProps) {
  return (
    <div className="grid grid-cols-4 gap-2 mt-1 text-[0.6rem]">
      <div className="text-center">
        <div className="text-left font-bold h-8">Prepared by:</div>
        <div className="h-0"></div>
        <div className="font-bold border-t border-black">
          {signatories.preparedBy.name || 'Signature Name'}
        </div>
        <div>
          {signatories.preparedBy.position || 'Position'}
          <br />
          {signatories.preparedBy.section || 'Section'}
        </div>
      </div>

      <div className="text-center">
        <div className="text-left font-bold h-8">Checked/Submitted by:</div>
        <div className="h-0"></div>
        <div className="font-bold border-t border-black">
          {signatories.checkedBy.name || 'Signature Name'}
        </div>
        <div>
          {signatories.checkedBy.position || 'Position'}
          <br />
          {signatories.checkedBy.section || 'Section'}
        </div>
      </div>

      <div className="text-center">
        <div className="text-left font-bold h-8">Recommending Approval:</div>
        <div className="h-0"></div>
        <div className="font-bold border-t border-black">
          {signatories.recommendingApproval.name || 'Signature Name'}
        </div>
        <div>
          {signatories.recommendingApproval.position || 'Position'}
          <br />
          {signatories.recommendingApproval.section || 'Section/Office'}
        </div>
      </div>

      <div className="text-center">
        <div className="text-left font-bold h-8">Approval:</div>
        <div className="h-0"></div>
        <div className="font-bold border-t border-black">
          {signatories.approvedBy.name || 'Signature Name'}
        </div>
        <div>
          {signatories.approvedBy.position || 'Position'}
          <br />
          {signatories.approvedBy.section || 'Office'}
        </div>
      </div>
    </div>
  );
}
