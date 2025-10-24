import { useState, useCallback } from 'react';
import { playerApi, teamApi, matchApi, statsApi } from '../services/api';
import useApi from './useApi';

/**
 * Hook for managing players
 */
export const usePlayers = () => {
  const { data: players = [], loading, error, refetch } = useApi(playerApi.getAll);

  const addPlayer = useCallback(async (playerData) => {
    try {
      const newPlayer = await playerApi.create(playerData);
      await refetch();
      return newPlayer;
    } catch (err) {
      throw err;
    }
  }, [refetch]);

  const updatePlayer = useCallback(async (id, playerData) => {
    try {
      const updatedPlayer = await playerApi.update(id, playerData);
      await refetch();
      return updatedPlayer;
    } catch (err) {
      throw err;
    }
  }, [refetch]);

  const removePlayer = useCallback(async (id) => {
    try {
      await playerApi.delete(id);
      await refetch();
    } catch (err) {
      throw err;
    }
  }, [refetch]);

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
 * Hook for managing teams
 */
export const useTeams = () => {
  const { data: teams = [], loading, error, refetch } = useApi(teamApi.getAll);

  const addTeam = useCallback(async (teamData) => {
    try {
      const newTeam = await teamApi.create(teamData);
      await refetch();
      return newTeam;
    } catch (err) {
      throw err;
    }
  }, [refetch]);

  const updateTeam = useCallback(async (id, teamData) => {
    try {
      const updatedTeam = await teamApi.update(id, teamData);
      await refetch();
      return updatedTeam;
    } catch (err) {
      throw err;
    }
  }, [refetch]);

  const removeTeam = useCallback(async (id) => {
    try {
      await teamApi.delete(id);
      await refetch();
    } catch (err) {
      throw err;
    }
  }, [refetch]);

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
 * Hook for managing matches
 */
export const useMatches = () => {
  const { data: matches = [], loading, error, refetch } = useApi(matchApi.getAll);

  const addMatch = useCallback(async (matchData) => {
    try {
      const newMatch = await matchApi.create(matchData);
      await refetch();
      return newMatch;
    } catch (err) {
      throw err;
    }
  }, [refetch]);

  const updateMatch = useCallback(async (id, matchData) => {
    try {
      const updatedMatch = await matchApi.update(id, matchData);
      await refetch();
      return updatedMatch;
    } catch (err) {
      throw err;
    }
  }, [refetch]);

  const removeMatch = useCallback(async (id) => {
    try {
      await matchApi.delete(id);
      await refetch();
    } catch (err) {
      throw err;
    }
  }, [refetch]);

  return {
    matches,
    loading,
    error,
    addMatch,
    updateMatch,
    removeMatch,
    refetch,
  };
};

/**
 * Hook for getting user statistics
 */
export const useStats = (userId) => {
  const { data: stats, loading, error, refetch } = useApi(
    () => statsApi.getUserStats(userId),
    !!userId,
    [userId]
  );

  return {
    stats,
    loading,
    error,
    refetch,
  };
};
