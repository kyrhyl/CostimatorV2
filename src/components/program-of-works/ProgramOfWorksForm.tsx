'use client';

import PrescribedFormsWorkspace from './PrescribedFormsWorkspace';

interface ProgramOfWorksFormProps {
  projectId: string;
}

export default function ProgramOfWorksForm({ projectId }: ProgramOfWorksFormProps) {
  return <PrescribedFormsWorkspace projectId={projectId} />;
}
