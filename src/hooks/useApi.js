import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for API calls
 * @param {Function} apiFunc - API function to call
 * @param {boolean} immediate - Whether to call immediately on mount
 * @param {Array} deps - Dependencies array for useEffect
 * @returns {Object} - { data, loading, error, execute, refetch }
 */
const useApi = (apiFunc, immediate = true, deps = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFunc(...args);
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunc]);

  const refetch = useCallback(() => {
    return execute();
  }, [execute]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, deps);

  return { data, loading, error, execute, refetch };
};

/**
 * Hook for managing paginated data
 * @param {Function} apiFunc - API function that accepts page parameter
 * @param {number} pageSize - Number of items per page
 * @returns {Object} - Pagination state and controls
 */
export const usePaginatedApi = (apiFunc, pageSize = 20) => {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPage = useCallback(async (pageNum) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFunc({ page: pageNum, limit: pageSize });
      const newData = pageNum === 1 ? result : [...data, ...result];
      setData(newData);
      setHasMore(result.length === pageSize);
      setPage(pageNum);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [apiFunc, pageSize, data]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchPage(page + 1);
    }
  }, [loading, hasMore, page, fetchPage]);

  const refresh = useCallback(() => {
    fetchPage(1);
  }, [fetchPage]);

  useEffect(() => {
    fetchPage(1);
  }, []);

  return { data, loading, error, loadMore, refresh, hasMore };
};

export default useApi;

