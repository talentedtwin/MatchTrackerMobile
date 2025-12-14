import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// In-memory cache with TTL
const cache = new Map(); // { key: { data, timestamp, expiresAt } }
const pendingRequests = new Map(); // Prevent duplicate concurrent requests

// Cache configuration
const CACHE_CONFIG = {
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
  STALE_TIME: 2 * 60 * 1000, // 2 minutes - when to start background refetch
  MAX_CACHE_SIZE: 100, // Maximum number of cached items
  PERSISTENT_CACHE_PREFIX: "@api_cache_",
};

/**
 * Generate cache key from function and arguments
 */
const generateCacheKey = (apiFunc, args = []) => {
  const funcName = apiFunc.name || "anonymous";
  const argsKey = JSON.stringify(args);
  return `${funcName}-${argsKey}`;
};

/**
 * Check if cached data is stale (but not expired)
 */
const isStale = (cacheEntry) => {
  if (!cacheEntry) return false;
  const now = Date.now();
  const staleThreshold = cacheEntry.timestamp + CACHE_CONFIG.STALE_TIME;
  return now >= staleThreshold && now < cacheEntry.expiresAt;
};

/**
 * Check if cached data is expired
 */
const isExpired = (cacheEntry) => {
  if (!cacheEntry) return true;
  return Date.now() >= cacheEntry.expiresAt;
};

/**
 * Get data from cache
 */
const getCachedData = (cacheKey) => {
  const cached = cache.get(cacheKey);
  if (cached && !isExpired(cached)) {
    return cached.data;
  }
  // Remove expired entry
  if (cached) {
    cache.delete(cacheKey);
  }
  return null;
};

/**
 * Set data in cache with TTL
 */
const setCachedData = (cacheKey, data, ttl = CACHE_CONFIG.DEFAULT_TTL) => {
  // Implement LRU eviction if cache is full
  if (cache.size >= CACHE_CONFIG.MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }

  cache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttl,
  });
};

/**
 * Invalidate cache entries by pattern
 */
export const invalidateCache = (pattern) => {
  if (pattern === "*") {
    cache.clear();
    return;
  }

  const keysToDelete = [];
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach((key) => cache.delete(key));
};

/**
 * Save critical data to AsyncStorage for offline support
 */
const saveToPersistentCache = async (cacheKey, data) => {
  try {
    const storageKey = CACHE_CONFIG.PERSISTENT_CACHE_PREFIX + cacheKey;
    await AsyncStorage.setItem(
      storageKey,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    console.warn("Failed to save to persistent cache:", error);
  }
};

/**
 * Load data from AsyncStorage
 */
const loadFromPersistentCache = async (cacheKey) => {
  try {
    const storageKey = CACHE_CONFIG.PERSISTENT_CACHE_PREFIX + cacheKey;
    const cached = await AsyncStorage.getItem(storageKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Return cached data if less than 24 hours old
      if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
        return data;
      }
    }
  } catch (error) {
    console.warn("Failed to load from persistent cache:", error);
  }
  return null;
};

/**
 * Custom hook for API calls with caching
 * @param {Function} apiFunc - API function to call
 * @param {boolean} immediate - Whether to call immediately on mount
 * @param {Array} deps - Dependencies array for useEffect
 * @param {Object} options - Cache options { ttl, enableCache, persistCache, cacheKey }
 * @returns {Object} - { data, loading, error, execute, refetch, updateData, invalidate }
 */
const useApi = (apiFunc, immediate = true, deps = [], options = {}) => {
  const {
    ttl = CACHE_CONFIG.DEFAULT_TTL,
    enableCache = true,
    persistCache = false,
    cacheKey: customCacheKey,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isStaleData, setIsStaleData] = useState(false);

  const apiFuncRef = useRef(apiFunc);
  const abortControllerRef = useRef(null);
  const backgroundRefetchRef = useRef(null);
  const mountedRef = useRef(true);

  // Update ref when apiFunc changes
  useEffect(() => {
    apiFuncRef.current = apiFunc;
  }, [apiFunc]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      // Cancel pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Clear background refetch
      if (backgroundRefetchRef.current) {
        clearTimeout(backgroundRefetchRef.current);
      }
    };
  }, []);

  /**
   * Execute API call with caching and request deduplication
   */
  const execute = useCallback(
    async (...args) => {
      const cacheKey =
        customCacheKey || generateCacheKey(apiFuncRef.current, args);

      // Check cache first if enabled
      if (enableCache) {
        const cachedData = getCachedData(cacheKey);

        if (cachedData !== null) {
          setData(cachedData);
          setError(null);

          // Check if data is stale - if so, trigger background refetch
          const cacheEntry = cache.get(cacheKey);
          if (isStale(cacheEntry)) {
            setIsStaleData(true);
            // Background refetch without showing loading state
            backgroundRefetchRef.current = setTimeout(() => {
              executeRequest(args, cacheKey, true);
            }, 100);
          } else {
            setIsStaleData(false);
          }

          return cachedData;
        }

        // Try persistent cache if enabled and network request might fail
        if (persistCache) {
          const persistentData = await loadFromPersistentCache(cacheKey);
          if (persistentData) {
            setData(persistentData);
            setIsStaleData(true);
            // Continue to fetch fresh data in background
          }
        }
      }

      // Check for pending request with same cache key
      if (enableCache && pendingRequests.has(cacheKey)) {
        try {
          return await pendingRequests.get(cacheKey);
        } catch (err) {
          throw err;
        }
      }

      // Execute new request
      return executeRequest(args, cacheKey, false);
    },
    [enableCache, persistCache, customCacheKey]
  );

  /**
   * Internal function to execute the actual API request
   */
  const executeRequest = async (
    args,
    cacheKey,
    isBackgroundRefetch = false
  ) => {
    if (!isBackgroundRefetch) {
      setLoading(true);
    }
    setError(null);

    // Create abort controller for request cancellation
    abortControllerRef.current = new AbortController();

    const requestPromise = (async () => {
      try {
        const result = await apiFuncRef.current(...args);

        // Only update state if component is still mounted
        if (mountedRef.current) {
          setData(result);
          setIsStaleData(false);

          // Cache the result
          if (enableCache) {
            setCachedData(cacheKey, result, ttl);

            // Save to persistent storage if enabled
            if (persistCache) {
              saveToPersistentCache(cacheKey, result);
            }
          }
        }

        return result;
      } catch (err) {
        if (mountedRef.current) {
          const errorMessage =
            err.response?.data?.error || err.message || "An error occurred";
          setError(errorMessage);
        }
        throw err;
      } finally {
        if (mountedRef.current && !isBackgroundRefetch) {
          setLoading(false);
        }
        // Remove from pending requests
        if (enableCache) {
          pendingRequests.delete(cacheKey);
        }
      }
    })();

    // Store in pending requests to prevent duplicates
    if (enableCache) {
      pendingRequests.set(cacheKey, requestPromise);
    }

    return requestPromise;
  };

  const refetch = useCallback(() => {
    return execute();
  }, [execute]);

  // Expose setData for optimistic updates
  const updateData = useCallback((updater) => {
    setData((prev) =>
      typeof updater === "function" ? updater(prev) : updater
    );
  }, []);

  // Invalidate cache for this specific API call
  const invalidate = useCallback(() => {
    const cacheKey = customCacheKey || generateCacheKey(apiFuncRef.current, []);
    cache.delete(cacheKey);
  }, [customCacheKey]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    data,
    loading,
    error,
    execute,
    refetch,
    updateData,
    invalidate,
    isStaleData, // Indicates if showing stale data while refetching
  };
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

  const fetchPage = useCallback(
    async (pageNum) => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiFunc({ page: pageNum, limit: pageSize });
        const newData = pageNum === 1 ? result : [...data, ...result];
        setData(newData);
        setHasMore(result.length === pageSize);
        setPage(pageNum);
      } catch (err) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    [apiFunc, pageSize, data]
  );

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

// Export both as named and default for compatibility
export { useApi };
export default useApi;
