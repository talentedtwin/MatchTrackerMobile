/**
 * Cache Management Utilities
 *
 * Provides utilities for managing API cache, including:
 * - Batch cache invalidation
 * - Cache statistics
 * - Cache cleanup
 * - Offline data management
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { invalidateCache } from "../hooks/useApi";

const CACHE_PREFIX = "@api_cache_";

/**
 * Clear all cached data (in-memory and persistent)
 */
export const clearAllCache = async () => {
  // Clear in-memory cache
  invalidateCache("*");

  // Clear persistent cache
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
    console.log(`Cleared ${cacheKeys.length} persistent cache entries`);
  } catch (error) {
    console.error("Failed to clear persistent cache:", error);
  }
};

/**
 * Clear cache for specific resources (e.g., "teams", "players", "matches")
 */
export const clearCacheByResource = async (resourceName) => {
  // Clear in-memory cache
  invalidateCache(resourceName);

  // Clear persistent cache
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(
      (key) => key.startsWith(CACHE_PREFIX) && key.includes(resourceName)
    );
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
    console.log(`Cleared ${cacheKeys.length} ${resourceName} cache entries`);
  } catch (error) {
    console.error(`Failed to clear ${resourceName} cache:`, error);
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));

    // Get sizes
    let totalSize = 0;
    for (const key of cacheKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        totalSize += value.length;
      }
    }

    return {
      totalEntries: cacheKeys.length,
      totalSizeBytes: totalSize,
      totalSizeKB: (totalSize / 1024).toFixed(2),
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
    };
  } catch (error) {
    console.error("Failed to get cache stats:", error);
    return null;
  }
};

/**
 * Remove expired cache entries from persistent storage
 */
export const cleanupExpiredCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));

    const now = Date.now();
    const expiredKeys = [];

    for (const key of cacheKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        try {
          const { timestamp } = JSON.parse(value);
          // Remove if older than 24 hours
          if (now - timestamp > 24 * 60 * 60 * 1000) {
            expiredKeys.push(key);
          }
        } catch (parseError) {
          // Invalid format, remove it
          expiredKeys.push(key);
        }
      }
    }

    if (expiredKeys.length > 0) {
      await AsyncStorage.multiRemove(expiredKeys);
      console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }

    return expiredKeys.length;
  } catch (error) {
    console.error("Failed to cleanup expired cache:", error);
    return 0;
  }
};

/**
 * Cache invalidation strategies for mutations
 */
export const CacheInvalidationStrategies = {
  /**
   * Invalidate cache after creating a resource
   */
  onCreate: (resourceType) => {
    invalidateCache(resourceType);
    clearCacheByResource(resourceType);
  },

  /**
   * Invalidate cache after updating a resource
   */
  onUpdate: (resourceType, resourceId) => {
    invalidateCache(resourceType);
    if (resourceId) {
      invalidateCache(`${resourceType}-${resourceId}`);
    }
    clearCacheByResource(resourceType);
  },

  /**
   * Invalidate cache after deleting a resource
   */
  onDelete: (resourceType, resourceId) => {
    invalidateCache(resourceType);
    if (resourceId) {
      invalidateCache(`${resourceType}-${resourceId}`);
    }
    clearCacheByResource(resourceType);
  },

  /**
   * Invalidate all related caches (e.g., when a match is updated, invalidate players and teams too)
   */
  onRelatedUpdate: (resourceTypes = []) => {
    resourceTypes.forEach((type) => {
      invalidateCache(type);
      clearCacheByResource(type);
    });
  },
};

/**
 * Preload critical data for offline support
 */
export const preloadCriticalData = async (dataLoaders) => {
  console.log("Preloading critical data for offline support...");

  const results = await Promise.allSettled(
    dataLoaders.map((loader) => loader())
  );

  const successful = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  console.log(`Preloaded ${successful} resources, ${failed} failed`);

  return { successful, failed };
};

/**
 * Check if device is online
 */
export const isOnline = async () => {
  try {
    const response = await fetch("https://www.google.com", {
      method: "HEAD",
      mode: "no-cors",
    });
    return true;
  } catch (error) {
    return false;
  }
};
