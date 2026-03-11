interface ReportApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
}

interface FetchReportDataParams {
  projectId: string;
  endpoint: string;
  fallbackError: string;
  logLabel: string;
}

interface FetchReportDataResult<T> {
  data: T | null;
  error: string;
}

export async function fetchReportData<T>({
  projectId,
  endpoint,
  fallbackError,
  logLabel,
}: FetchReportDataParams): Promise<FetchReportDataResult<T>> {
  try {
    const response = await fetch(`/api/projects/${projectId}/${endpoint}`);
    const json = (await response.json()) as ReportApiResponse<T>;

    if (json.success) {
      return { data: (json.data ?? null) as T | null, error: '' };
    }

    return { data: null, error: json.error || fallbackError };
  } catch (err) {
    console.error(`Failed to load ${logLabel} report:`, err);
    return { data: null, error: fallbackError };
  }
}
