import { useEffect, useState } from 'react';

export function useSyPlcRecords<T>(enabled: boolean, filterQuery: string, pageSize = 10) {
  const [query, setQuery] = useState({ filters: filterQuery, page: 1, revision: 0 });
  const [records, setRecords] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isPending = filterQuery !== query.filters;

  useEffect(() => {
    if (!isPending) return;
    const timer = setTimeout(() => {
      setQuery(previous => ({ ...previous, filters: filterQuery, page: 1 }));
    }, filterQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [filterQuery, isPending]);

  useEffect(() => {
    if (!enabled || isPending) return;
    const controller = new AbortController();
    const params = new URLSearchParams(query.filters);
    params.set('page', String(query.page));
    params.set('limit', String(pageSize));
    setIsFetching(true);
    setError(null);
    void (async () => {
      try {
        const response = await fetch(`/api/sy-plc?${params}`, { signal: controller.signal });
        const result = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok || !result.success) throw new Error(result.error || '加载数据库记录失败');
        const lastPage = Math.max(1, result.totalPages);
        if (query.page > lastPage) {
          setQuery(previous => ({ ...previous, page: lastPage }));
          return;
        }
        setRecords(result.data);
        setTotalCount(result.totalCount);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setRecords([]);
          setTotalCount(0);
          setError(cause instanceof Error ? cause.message : '加载数据库记录失败，请重试');
        }
      } finally {
        if (!controller.signal.aborted) setIsFetching(false);
      }
    })();
    // 输入变化、翻页、离开标签页时，取消旧请求，避免旧结果覆盖新结果。
    return () => controller.abort();
  }, [enabled, isPending, query, pageSize]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  return {
    records, totalCount, totalPages, currentPage: query.page, error,
    isLoading: enabled && (isPending || isFetching),
    setCurrentPage: (page: number) => setQuery(previous => ({ ...previous, page })),
    refresh: () => setQuery(previous => ({ ...previous, revision: previous.revision + 1 }))
  };
}
