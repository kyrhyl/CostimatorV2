'use client';

import PrescribedFormsWorkspace from './PrescribedFormsWorkspace';

interface ProgramOfWorksFormProps {
  projectId: string;
  mode?: string;
  estimateId?: string;
}

export default function ProgramOfWorksForm({ projectId, mode, estimateId }: ProgramOfWorksFormProps) {
  return <PrescribedFormsWorkspace projectId={projectId} mode={mode} estimateId={estimateId} />;
}
