import { useEffect, useState } from 'react';

interface UseManualPowMasterDataOptions {
  enabled: boolean;
}

export function useManualPowMasterData({ enabled }: UseManualPowMasterDataOptions) {
  const [laborLocations, setLaborLocations] = useState<string[]>([]);
  const [loadingLaborLocations, setLoadingLaborLocations] = useState(false);
  const [laborVersionOptions, setLaborVersionOptions] = useState<string[]>([]);
  const [loadingLaborVersions, setLoadingLaborVersions] = useState(false);
  const [cmpdOptions, setCmpdOptions] = useState<string[]>([]);
  const [loadingCmpdVersions, setLoadingCmpdVersions] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    async function fetchLaborLocations() {
      setLoadingLaborLocations(true);
      try {
        const response = await fetch('/api/master/labor');
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          const unique = Array.from(
            new Set(
              (data.data as Array<{ location?: string }>)
                .map((rate) => rate.location)
                .filter((loc): loc is string => Boolean(loc)),
            ),
          );
          setLaborLocations(unique);
        }
      } catch (err) {
        console.error('Failed to load labor locations', err);
      } finally {
        setLoadingLaborLocations(false);
      }
    }

    async function fetchCmpdVersions() {
      setLoadingCmpdVersions(true);
      try {
        const response = await fetch('/api/master/materials/prices/versions');
        const data = await response.json();
        if (data.success && Array.isArray(data.versions)) {
          setCmpdOptions(data.versions);
        }
      } catch (err) {
        console.error('Failed to load CMPD versions', err);
      } finally {
        setLoadingCmpdVersions(false);
      }
    }

    async function fetchLaborVersions() {
      setLoadingLaborVersions(true);
      try {
        const response = await fetch('/api/master/labor/versions');
        const data = await response.json();
        if (data.success && Array.isArray(data.versions)) {
          const versions = (data.versions as Array<{ laborVersion?: string; status?: string }>)
            .filter((entry) => entry.laborVersion && entry.laborVersion !== 'UNVERSIONED')
            .map((entry) => ({
              laborVersion: String(entry.laborVersion),
              status: String(entry.status || ''),
            }))
            .sort((a, b) => b.laborVersion.localeCompare(a.laborVersion));

          setLaborVersionOptions(versions.map((entry) => entry.laborVersion));
        }
      } catch (err) {
        console.error('Failed to load labor versions', err);
      } finally {
        setLoadingLaborVersions(false);
      }
    }

    fetchLaborLocations();
    fetchLaborVersions();
    fetchCmpdVersions();
  }, [enabled]);

  return {
    laborLocations,
    loadingLaborLocations,
    laborVersionOptions,
    loadingLaborVersions,
    cmpdOptions,
    loadingCmpdVersions,
  };
}
