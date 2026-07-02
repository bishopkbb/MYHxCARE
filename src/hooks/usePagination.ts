import { useCallback, useState } from 'react';

type Options = {
  initialPage?: number;
  initialPageSize?: number;
};

export function usePagination({ initialPage = 1, initialPageSize = 20 }: Options = {}) {
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const setPage = useCallback((n: number) => {
    setPageState(Math.max(1, n));
  }, []);

  const nextPage = useCallback(() => {
    setPageState((p) => p + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPageState((p) => Math.max(1, p - 1));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1);
  }, []);

  // Call when the search query changes so results restart from page 1.
  const reset = useCallback(() => {
    setPageState(1);
  }, []);

  return {
    page,
    pageSize,
    // Spread `params` directly into query params — matches backend field names.
    params: { page, page_size: pageSize } as const,
    setPage,
    nextPage,
    prevPage,
    setPageSize,
    reset,
  };
}
