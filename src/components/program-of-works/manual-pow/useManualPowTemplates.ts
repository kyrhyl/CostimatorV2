import { useEffect, useState } from 'react';
import type { TemplateSummary } from './types';

interface UseManualPowTemplatesOptions {
  enabled: boolean;
  templateSearch: string;
  partFilter: string;
  loadCommon: boolean;
}

export function useManualPowTemplates({ enabled, templateSearch, partFilter, loadCommon }: UseManualPowTemplatesOptions) {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const hasSearch = Boolean(templateSearch.trim());
    if (!hasSearch && !loadCommon) {
      setTemplates([]);
      setLoadingTemplates(false);
      setTemplateError(null);
      return;
    }

    const controller = new AbortController();
    const debounceTimer = setTimeout(() => {
      loadTemplates();
    }, 300);

    async function loadTemplates() {
      setLoadingTemplates(true);
      setTemplateError(null);

      try {
        const params = new URLSearchParams();
        if (hasSearch) {
          params.set('search', templateSearch.trim());
        } else {
          params.set('view', 'common');
        }
        if (partFilter !== 'all') {
          params.set('part', partFilter);
        }
        params.set('isActive', 'true');
        params.set('limit', '50');
        const query = params.toString() ? `?${params.toString()}` : '';
        const res = await fetch(`/api/dupa-templates${query}`, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Server responded with ${res.status}`);
        }
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to load DUPA templates');
        }
        setTemplates(data.data || []);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          console.error('Failed to load DUPA templates', err);
          setTemplateError(err instanceof Error ? err.message : 'Failed to load DUPA templates');
        }
      } finally {
        setLoadingTemplates(false);
      }
    }

    return () => {
      clearTimeout(debounceTimer);
      controller.abort();
    };
  }, [enabled, templateSearch, partFilter, loadCommon]);

  const resetTemplateState = () => {
    setTemplateError(null);
  };

  return {
    templates,
    loadingTemplates,
    templateError,
    resetTemplateState,
  };
}
