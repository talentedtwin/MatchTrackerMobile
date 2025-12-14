import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config/constants';
import { usePlayers, useMatches } from '../hooks/useResources';
import { useTeamContext } from '../contexts/TeamContext';

const PlayerStatsScreen = ({ route, navigation }) => {
  const { playerId } = route.params;
  const { selectedTeamId } = useTeamContext();
  const { players, loading: playersLoading } = usePlayers(selectedTeamId);
  const { matches, loading: matchesLoading } = useMatches(selectedTeamId);

  const loading = playersLoading || matchesLoading;

  // Calculate player statistics
  const playerStats = useMemo(() => {
    if (!players.length || !matches.length) return null;

    const player = players.find(p => p.id === playerId);
    if (!player) return null;

    // Get all finished matches where this player participated
    const playerMatches = matches.filter(match => 
      match.isFinished && 
      match.selectedPlayerIds && 
      match.selectedPlayerIds.includes(playerId)
    );

    const totalMatches = playerMatches.length;

    // Calculate totals from player_match_stats
    let totalGoals = 0;
    let totalAssists = 0;
    let totalMinutes = 0;
    let totalYellowCards = 0;
    let totalRedCards = 0;

    playerMatches.forEach(match => {
      if (match.playerStats) {
        const stat = match.playerStats.find(s => s.playerId === playerId);
        if (stat) {
          totalGoals += stat.goals || 0;
          totalAssists += stat.assists || 0;
          totalMinutes += stat.minutesPlayed || 0;
          totalYellowCards += stat.yellowCards || 0;
          if (stat.redCard) totalRedCards += 1;
        }
      }
    });

    const avgGoalsPerGame = totalMatches > 0 ? (totalGoals / totalMatches).toFixed(2) : '0.00';
    const avgAssistsPerGame = totalMatches > 0 ? (totalAssists / totalMatches).toFixed(2) : '0.00';
    const avgMinutesPerMatch = totalMatches > 0 ? Math.round(totalMinutes / totalMatches) : 0;

    return {
      player,
      totalMatches,
      totalGoals,
      totalAssists,
      totalMinutes,
      totalYellowCards,
      totalRedCards,
      avgGoalsPerGame,
      avgAssistsPerGame,
      avgMinutesPerMatch,
    };
  }, [players, matches, playerId]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading player stats...</Text>
      </View>
    );
  }

  if (!playerStats || !playerStats.player) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Player not found</Text>
      </View>
    );
  }

  const { player } = playerStats;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Player Header */}
        <View style={styles.header}>
          <Text style={styles.playerName}>{player.name}</Text>
          {player.team && (
            <Text style={styles.teamName}>{player.team.name}</Text>
          )}
        </View>

        {/* Career Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Career Overview</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="trophy" size={32} color={COLORS.primary} />
              <Text style={styles.statValue}>{playerStats.totalMatches}</Text>
              <Text style={styles.statLabel}>Matches Played</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="time-outline" size={32} color={COLORS.primary} />
              <Text style={styles.statValue}>{playerStats.totalMinutes}'</Text>
              <Text style={styles.statLabel}>Total Minutes</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="timer-outline" size={32} color={COLORS.primary} />
              <Text style={styles.statValue}>{playerStats.avgMinutesPerMatch}'</Text>
              <Text style={styles.statLabel}>Avg Minutes/Game</Text>
            </View>
          </View>
        </View>

        {/* Scoring Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scoring Statistics</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="football" size={32} color="#4CAF50" />
              <Text style={styles.statValue}>{playerStats.totalGoals}</Text>
              <Text style={styles.statLabel}>Total Goals</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="flash" size={32} color="#FFA500" />
              <Text style={styles.statValue}>{playerStats.totalAssists}</Text>
              <Text style={styles.statLabel}>Total Assists</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="stats-chart" size={32} color={COLORS.primary} />
              <Text style={styles.statValue}>
                {playerStats.totalGoals + playerStats.totalAssists}
              </Text>
              <Text style={styles.statLabel}>Goal Contributions</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="analytics" size={32} color="#4CAF50" />
              <Text style={styles.statValue}>{playerStats.avgGoalsPerGame}</Text>
              <Text style={styles.statLabel}>Avg Goals/Game</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="trending-up" size={32} color="#FFA500" />
              <Text style={styles.statValue}>{playerStats.avgAssistsPerGame}</Text>
              <Text style={styles.statLabel}>Avg Assists/Game</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="pulse" size={32} color={COLORS.primary} />
              <Text style={styles.statValue}>
                {(parseFloat(playerStats.avgGoalsPerGame) + parseFloat(playerStats.avgAssistsPerGame)).toFixed(2)}
              </Text>
              <Text style={styles.statLabel}>Avg Contributions</Text>
            </View>
          </View>
        </View>

        {/* Discipline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discipline</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.yellowCardIcon} />
              <Text style={styles.statValue}>{playerStats.totalYellowCards}</Text>
              <Text style={styles.statLabel}>Yellow Cards</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.redCardIcon} />
              <Text style={styles.statValue}>{playerStats.totalRedCards}</Text>
              <Text style={styles.statLabel}>Red Cards</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="shield-checkmark" size={32} color={COLORS.success} />
              <Text style={styles.statValue}>
                {playerStats.totalMatches - playerStats.totalYellowCards - playerStats.totalRedCards}
              </Text>
              <Text style={styles.statLabel}>Clean Matches</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 25,
    alignItems: 'center',
  },
  playerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  teamName: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  section: {
    marginTop: 15,
    marginHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  yellowCardIcon: {
    width: 20,
    height: 28,
    backgroundColor: '#FFD700',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#000',
  },
  redCardIcon: {
    width: 20,
    height: 28,
    backgroundColor: '#DC143C',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#8B0000',
  },
});

export default PlayerStatsScreen;
