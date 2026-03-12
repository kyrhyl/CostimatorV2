import ProgramOfWorksForm from '@/components/program-of-works/ProgramOfWorksForm';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string; estimateId?: string }>;
}

export default async function PowReportPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  return <ProgramOfWorksForm projectId={id} mode={query?.mode} estimateId={query?.estimateId} />;
}
