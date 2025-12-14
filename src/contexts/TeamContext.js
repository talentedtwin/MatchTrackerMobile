import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TeamContext = createContext(null);

const SELECTED_TEAM_KEY = '@selected_team_id';

export const TeamProvider = ({ children }) => {
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load selected team from storage on mount
  useEffect(() => {
    loadSelectedTeam();
  }, []);

  const loadSelectedTeam = async () => {
    try {
      const teamId = await AsyncStorage.getItem(SELECTED_TEAM_KEY);
      if (teamId) {
        setSelectedTeamId(teamId);
      }
    } catch (error) {
      console.error('Error loading selected team:', error);
    } finally {
      setLoading(false);
      setIsInitialized(true);
    }
  };

  const selectTeam = async (teamId) => {
    try {
      if (teamId) {
        await AsyncStorage.setItem(SELECTED_TEAM_KEY, teamId);
      } else {
        await AsyncStorage.removeItem(SELECTED_TEAM_KEY);
      }
      setSelectedTeamId(teamId);
    } catch (error) {
      console.error('Error saving selected team:', error);
      throw error;
    }
  };

  const clearTeam = async () => {
    try {
      await AsyncStorage.removeItem(SELECTED_TEAM_KEY);
      setSelectedTeamId(null);
    } catch (error) {
      console.error('Error clearing selected team:', error);
      throw error;
    }
  };

  const value = {
    selectedTeamId,
    selectTeam,
    clearTeam,
    loading,
    isInitialized,
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeamContext = () => {
  const context = useContext(TeamContext);
  if (!context) {
    // Return a safe default instead of throwing during initial render
    console.warn('useTeamContext called outside TeamProvider');
    return {
      selectedTeamId: null,
      selectTeam: () => Promise.resolve(),
      clearTeam: () => Promise.resolve(),
      loading: false,
      isInitialized: false,
    };
  }
  return context;
};
