import { useCallback, useEffect, useState } from 'react';
import type { PowReportData } from '@/types/program-of-works';
import type { AbcReportData } from '@/types/abc';
import type { DupaReportData } from '@/types/dupa';
import { fetchReportData } from './fetchReportData';

interface PrescribedFormsDataMap {
  pow: PowReportData | null;
  abc: AbcReportData | null;
  dupa: DupaReportData | null;
}

interface PrescribedFormsLoadingState {
  pow: boolean;
  abc: boolean;
  dupa: boolean;
  any: boolean;
}

interface PrescribedFormsErrorState {
  pow: string;
  abc: string;
  dupa: string;
  any: string;
}

interface UsePrescribedFormsDataResult {
  data: PrescribedFormsDataMap;
  loading: PrescribedFormsLoadingState;
  error: PrescribedFormsErrorState;
  refetch: () => Promise<void>;
}

interface PrescribedFormsQueryContext {
  mode?: string;
  estimateId?: string;
}

const INITIAL_DATA: PrescribedFormsDataMap = {
  pow: null,
  abc: null,
  dupa: null,
};

const INITIAL_LOADING = {
  pow: true,
  abc: true,
  dupa: true,
};

const INITIAL_ERROR = {
  pow: '',
  abc: '',
  dupa: '',
};

export function usePrescribedFormsData(
  projectId: string,
  queryContext: PrescribedFormsQueryContext = {},
): UsePrescribedFormsDataResult {
  const mode = queryContext.mode;
  const estimateId = queryContext.estimateId;
  const [data, setData] = useState<PrescribedFormsDataMap>(INITIAL_DATA);
  const [loading, setLoading] = useState(INITIAL_LOADING);
  const [error, setError] = useState(INITIAL_ERROR);

  const refetchPow = useCallback(async () => {
    setLoading((prev) => ({ ...prev, pow: true }));
    setError((prev) => ({ ...prev, pow: '' }));

    const result = await fetchReportData<PowReportData>({
      projectId,
      endpoint: 'pow-report',
      fallbackError: 'Failed to load POW report data',
      logLabel: 'POW',
      query: { mode, estimateId },
    });

    setData((prev) => ({ ...prev, pow: result.data }));
    setError((prev) => ({ ...prev, pow: result.error }));
    setLoading((prev) => ({ ...prev, pow: false }));
  }, [projectId, mode, estimateId]);

  const refetchAbc = useCallback(async () => {
    setLoading((prev) => ({ ...prev, abc: true }));
    setError((prev) => ({ ...prev, abc: '' }));

    const result = await fetchReportData<AbcReportData>({
      projectId,
      endpoint: 'abc-report',
      fallbackError: 'Failed to load ABC report data',
      logLabel: 'ABC',
      query: { mode, estimateId },
    });

    setData((prev) => ({ ...prev, abc: result.data }));
    setError((prev) => ({ ...prev, abc: result.error }));
    setLoading((prev) => ({ ...prev, abc: false }));
  }, [projectId, mode, estimateId]);

  const refetchDupa = useCallback(async () => {
    setLoading((prev) => ({ ...prev, dupa: true }));
    setError((prev) => ({ ...prev, dupa: '' }));

    const result = await fetchReportData<DupaReportData>({
      projectId,
      endpoint: 'dupa-report',
      fallbackError: 'Failed to load DUPA report data',
      logLabel: 'DUPA',
      query: { mode, estimateId },
    });

    setData((prev) => ({ ...prev, dupa: result.data }));
    setError((prev) => ({ ...prev, dupa: result.error }));
    setLoading((prev) => ({ ...prev, dupa: false }));
  }, [projectId, mode, estimateId]);

  const refetch = useCallback(async () => {
    await Promise.all([refetchPow(), refetchAbc(), refetchDupa()]);
  }, [refetchPow, refetchAbc, refetchDupa]);

  useEffect(() => {
    if (!projectId) {
      setData(INITIAL_DATA);
      setLoading({ pow: false, abc: false, dupa: false });
      setError({
        pow: 'Missing project id',
        abc: 'Missing project id',
        dupa: 'Missing project id',
      });
      return;
    }

    void refetch();
  }, [projectId, refetch]);

  const loadingAny = loading.pow || loading.abc || loading.dupa;
  const errorAny = error.pow || error.abc || error.dupa;

  return {
    data,
    loading: {
      ...loading,
      any: loadingAny,
    },
    error: {
      ...error,
      any: errorAny,
    },
    refetch,
  };
}
