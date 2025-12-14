import { useState, useCallback } from "react";
import { playerApi, teamApi, matchApi, statsApi } from "../services/api";
import useApi from "./useApi";
import { CacheInvalidationStrategies } from "../utils/cacheManager";

/**
 * Hook for managing players with optimistic updates and cache invalidation
 */
export const usePlayers = (teamId = null, options = {}) => {
  const { data, loading, error, refetch, updateData, invalidate } = useApi(
    () => playerApi.getAll(teamId),
    true,
    [teamId],
    {
      enableCache: true,
      ttl: 5 * 60 * 1000, // 5 minutes
      persistCache: true, // Enable offline support
      cacheKey: `players-${teamId || "all"}`,
      ...options,
    }
  );
  const players = data?.players || [];

  const addPlayer = useCallback(
    async (playerData) => {
      // Generate temporary ID for optimistic update
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const optimisticPlayer = {
        id: tempId,
        ...playerData,
        goals: 0,
        assists: 0,
        createdAt: new Date().toISOString(),
      };

      // Optimistic update: Add player immediately to UI
      updateData((prev) => ({
        ...prev,
        players: [...(prev?.players || []), optimisticPlayer],
      }));

      try {
        const newPlayer = await playerApi.create(playerData);

        // Replace temporary player with real data
        updateData((prev) => ({
          ...prev,
          players: (prev?.players || []).map((p) =>
            p.id === tempId ? newPlayer.player : p
          ),
        }));

        // Invalidate cache after successful creation
        CacheInvalidationStrategies.onCreate("players");
        invalidate();

        return newPlayer;
      } catch (err) {
        // Rollback on error: Remove optimistic player
        updateData((prev) => ({
          ...prev,
          players: (prev?.players || []).filter((p) => p.id !== tempId),
        }));
        throw err;
      }
    },
    [updateData, invalidate]
  );

  const updatePlayer = useCallback(
    async (id, playerData) => {
      // Store original player for rollback
      const originalPlayers = players;

      // Optimistic update: Update player immediately in UI
      updateData((prev) => ({
        ...prev,
        players: (prev?.players || []).map((p) =>
          p.id === id ? { ...p, ...playerData } : p
        ),
      }));

      try {
        const updatedPlayer = await playerApi.update(id, playerData);

        // Update with server response
        updateData((prev) => ({
          ...prev,
          players: (prev?.players || []).map((p) =>
            p.id === id ? updatedPlayer.player : p
          ),
        }));

        // Invalidate cache after successful update
        CacheInvalidationStrategies.onUpdate("players", id);
        invalidate();

        return updatedPlayer;
      } catch (err) {
        // Rollback on error: Restore original data
        updateData((prev) => ({
          ...prev,
          players: originalPlayers,
        }));
        throw err;
      }
    },
    [updateData, players, invalidate]
  );

  const removePlayer = useCallback(
    async (id) => {
      // Store original player for rollback
      const originalPlayers = players;

      // Optimistic update: Remove player immediately from UI
      updateData((prev) => ({
        ...prev,
        players: (prev?.players || []).filter((p) => p.id !== id),
      }));

      try {
        await playerApi.delete(id);

        // Invalidate cache after successful deletion
        CacheInvalidationStrategies.onDelete("players", id);
        invalidate();
      } catch (err) {
        // Rollback on error: Restore removed player
        updateData((prev) => ({
          ...prev,
          players: originalPlayers,
        }));
        throw err;
      }
    },
    [updateData, players, invalidate]
  );

  return {
    players,
    loading,
    error,
    addPlayer,
    updatePlayer,
    removePlayer,
    refetch,
  };
};

/**
 * Hook for managing teams with optimistic updates and cache invalidation
 */
export const useTeams = (options = {}) => {
  const { data, loading, error, refetch, updateData, invalidate } = useApi(
    () => teamApi.getAll(options),
    true,
    [JSON.stringify(options)],
    {
      enableCache: true,
      ttl: 5 * 60 * 1000, // 5 minutes
      persistCache: true,
      cacheKey: `teams-${JSON.stringify(options)}`,
    }
  );
  const teams = data?.teams || [];

  const addTeam = useCallback(
    async (teamData) => {
      // Generate temporary ID for optimistic update
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const optimisticTeam = {
        id: tempId,
        ...teamData,
        _count: { players: 0, matches: 0 },
        createdAt: new Date().toISOString(),
      };

      // Optimistic update: Add team immediately to UI
      updateData((prev) => ({
        ...prev,
        teams: [...(prev?.teams || []), optimisticTeam],
      }));

      try {
        const newTeam = await teamApi.create(teamData);

        // Replace temporary team with real data
        updateData((prev) => ({
          ...prev,
          teams: (prev?.teams || []).map((t) =>
            t.id === tempId ? newTeam.team : t
          ),
        }));

        // Invalidate cache and related resources
        CacheInvalidationStrategies.onRelatedUpdate(["teams", "players"]);
        invalidate();

        return newTeam;
      } catch (err) {
        // Rollback on error: Remove optimistic team
        updateData((prev) => ({
          ...prev,
          teams: (prev?.teams || []).filter((t) => t.id !== tempId),
        }));
        throw err;
      }
    },
    [updateData, invalidate]
  );

  const updateTeam = useCallback(
    async (id, teamData) => {
      // Store original teams for rollback
      const originalTeams = teams;

      // Optimistic update: Update team immediately in UI
      updateData((prev) => ({
        ...prev,
        teams: (prev?.teams || []).map((t) =>
          t.id === id ? { ...t, ...teamData } : t
        ),
      }));

      try {
        const updatedTeam = await teamApi.update(id, teamData);

        // Update with server response
        updateData((prev) => ({
          ...prev,
          teams: (prev?.teams || []).map((t) =>
            t.id === id ? updatedTeam.team : t
          ),
        }));

        return updatedTeam;
      } catch (err) {
        // Rollback on error: Restore original data
        updateData((prev) => ({
          ...prev,
          teams: originalTeams,
        }));
        throw err;
      }
    },
    [updateData, teams]
  );

  const removeTeam = useCallback(
    async (id) => {
      // Store original teams for rollback
      const originalTeams = teams;

      // Optimistic update: Remove team immediately from UI
      updateData((prev) => ({
        ...prev,
        teams: (prev?.teams || []).filter((t) => t.id !== id),
      }));

      try {
        await teamApi.delete(id);
      } catch (err) {
        // Rollback on error: Restore removed team
        updateData((prev) => ({
          ...prev,
          teams: originalTeams,
        }));
        throw err;
      }
    },
    [updateData, teams]
  );

  return {
    teams,
    loading,
    error,
    addTeam,
    updateTeam,
    removeTeam,
    refetch,
  };
};

/**
 * Hook for managing matches with optimistic updates
 */
export const useMatches = (teamId = null, options = {}) => {
  // Create a unique cache key that includes all filter options
  const optionsString = JSON.stringify(options);
  const cacheKey = `matches-${teamId || "all"}-${optionsString}`;

  const { data, loading, error, refetch, updateData, invalidate } = useApi(
    () => matchApi.getAll(teamId, options),
    true,
    [teamId, optionsString],
    {
      enableCache: true,
      ttl: 2 * 60 * 1000, // 2 minutes
      cacheKey,
    }
  );
  const matches = data?.matches || [];

  const addMatch = useCallback(
    async (matchData) => {
      // Generate temporary ID for optimistic update
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const optimisticMatch = {
        id: tempId,
        ...matchData,
        isFinished: false,
        notificationSent: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Optimistic update: Add match immediately to UI
      updateData((prev) => ({
        ...prev,
        matches: [...(prev?.matches || []), optimisticMatch],
      }));

      try {
        const newMatch = await matchApi.create(matchData);

        // Replace temporary match with real data
        updateData((prev) => ({
          ...prev,
          matches: (prev?.matches || []).map((m) =>
            m.id === tempId ? newMatch.match : m
          ),
        }));

        return newMatch;
      } catch (err) {
        // Rollback on error: Remove optimistic match
        updateData((prev) => ({
          ...prev,
          matches: (prev?.matches || []).filter((m) => m.id !== tempId),
        }));
        throw err;
      }
    },
    [updateData]
  );

  const updateMatch = useCallback(
    async (id, matchData) => {
      // Store original matches for rollback
      const originalMatches = matches;

      // Optimistic update: Update match immediately in UI
      updateData((prev) => ({
        ...prev,
        matches: (prev?.matches || []).map((m) =>
          m.id === id
            ? { ...m, ...matchData, updatedAt: new Date().toISOString() }
            : m
        ),
      }));

      try {
        const updatedMatch = await matchApi.update(id, matchData);

        // Update with server response
        updateData((prev) => ({
          ...prev,
          matches: (prev?.matches || []).map((m) =>
            m.id === id ? updatedMatch.match : m
          ),
        }));

        return updatedMatch;
      } catch (err) {
        // Rollback on error: Restore original data
        updateData((prev) => ({
          ...prev,
          matches: originalMatches,
        }));
        throw err;
      }
    },
    [updateData, matches]
  );

  const removeMatch = useCallback(
    async (id) => {
      // Store original matches for rollback
      const originalMatches = matches;

      // Optimistic update: Remove match immediately from UI
      updateData((prev) => ({
        ...prev,
        matches: (prev?.matches || []).filter((m) => m.id !== id),
      }));

      try {
        await matchApi.delete(id);
      } catch (err) {
        // Rollback on error: Restore removed match
        updateData((prev) => ({
          ...prev,
          matches: originalMatches,
        }));
        throw err;
      }
    },
    [updateData, matches]
  );

  return {
    matches,
    loading,
    error,
    addMatch,
    updateMatch,
    removeMatch,
    refetch,
    invalidate,
  };
};

/**
 * Hook for getting user statistics
 */
export const useStats = (userId) => {
  const {
    data: stats,
    loading,
    error,
    refetch,
  } = useApi(() => statsApi.getUserStats(userId), !!userId, [userId]);

  return {
    stats,
    loading,
    error,
    refetch,
  };
};
