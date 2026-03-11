import ProgramOfWorksForm from '@/components/program-of-works/ProgramOfWorksForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PowReportPage({ params }: PageProps) {
  const { id } = await params;
  return <ProgramOfWorksForm projectId={id} />;
}
