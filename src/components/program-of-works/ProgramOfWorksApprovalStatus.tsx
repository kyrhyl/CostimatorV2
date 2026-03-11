'use client';

interface ProgramOfWorksApprovalStatusProps {
  status?: 'draft' | 'submitted' | 'approved' | 'rejected';
  preparedBy?: string;
  preparedDate?: string;
  approvedBy?: string;
  approvedDate?: string;
}

export default function ProgramOfWorksApprovalStatus({
  status = 'draft',
  preparedBy,
  preparedDate,
  approvedBy,
  approvedDate
}: ProgramOfWorksApprovalStatusProps) {
  const formatDate = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center">
          <span className="text-blue-700 text-lg">✓</span>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Approval Status</h3>
          <p className="text-xs text-gray-500">Submitted-only workflow</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className={`h-7 w-7 rounded-full flex items-center justify-center ${status !== 'draft' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            1
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Preparation & Submission</p>
            <p className="text-xs text-gray-500">
              {preparedBy ? `Prepared by ${preparedBy}` : 'Prepared by system'}
              {preparedDate ? ` • ${formatDate(preparedDate)}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className={`h-7 w-7 rounded-full flex items-center justify-center ${status === 'approved' ? 'bg-green-100 text-green-700' : status === 'submitted' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
            2
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Technical Evaluation</p>
            <p className="text-xs text-gray-500">
              {status === 'approved' ? 'Completed' : status === 'submitted' ? 'In progress' : 'Not started'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className={`h-7 w-7 rounded-full flex items-center justify-center ${status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            3
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Final Approval</p>
            <p className="text-xs text-gray-500">
              {status === 'approved' ? `Approved by ${approvedBy || 'system'}${approvedDate ? ` • ${formatDate(approvedDate)}` : ''}` : 'Locked'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
