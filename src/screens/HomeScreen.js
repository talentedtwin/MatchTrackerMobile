import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useMatches, usePlayers } from '../hooks/useResources';
import { formatDateTime } from '../utils/helpers';
import { COLORS } from '../config/constants';

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { matches, loading: matchesLoading, refetch: refetchMatches } = useMatches();
  const { players, loading: playersLoading } = usePlayers();
  const [refreshing, setRefreshing] = useState(false);

  // Get current/upcoming match
  const currentMatch = matches.find(m => !m.isFinished);
  const recentMatches = matches.filter(m => m.isFinished).slice(0, 3);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchMatches();
    setRefreshing(false);
  };

  if (matchesLoading || playersLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>⚽ MatchTracker</Text>
        <Text style={styles.subtitle}>
          Welcome back, {user?.name || 'Player'}!
        </Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{matches.length}</Text>
          <Text style={styles.statLabel}>Total Matches</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{players.length}</Text>
          <Text style={styles.statLabel}>Players</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {matches.filter(m => m.isFinished && m.goalsFor > m.goalsAgainst).length}
          </Text>
          <Text style={styles.statLabel}>Wins</Text>
        </View>
      </View>

      {/* Current Match */}
      {currentMatch ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Match</Text>
          <TouchableOpacity
            style={[styles.matchCard, styles.currentMatchCard]}
            onPress={() => navigation.navigate('MatchDetails', { matchId: currentMatch.id })}
          >
            <View style={styles.matchHeader}>
              <Text style={styles.matchOpponent}>{currentMatch.opponent}</Text>
              <View style={styles.matchTypeBadge}>
                <Text style={styles.matchTypeText}>{currentMatch.matchType.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.matchDate}>{formatDateTime(currentMatch.date)}</Text>
            <View style={styles.scoreContainer}>
              <Text style={styles.score}>
                {currentMatch.goalsFor} - {currentMatch.goalsAgainst}
              </Text>
            </View>
            <TouchableOpacity style={styles.continueButton}>
              <Text style={styles.continueButtonText}>Continue Match →</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>No Active Match</Text>
          <TouchableOpacity
            style={styles.startMatchButton}
            onPress={() => navigation.navigate('NewMatch')}
          >
            <Text style={styles.startMatchButtonText}>+ Start New Match</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Recent Matches */}
      {recentMatches.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Matches</Text>
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {recentMatches.map((match) => (
            <TouchableOpacity
              key={match.id}
              style={styles.matchCard}
              onPress={() => navigation.navigate('MatchDetails', { matchId: match.id })}
            >
              <View style={styles.matchRow}>
                <View style={styles.matchInfo}>
                  <Text style={styles.matchOpponent}>{match.opponent}</Text>
                  <Text style={styles.matchDate}>{formatDateTime(match.date)}</Text>
                </View>
                <View style={styles.resultContainer}>
                  <Text style={[
                    styles.result,
                    match.goalsFor > match.goalsAgainst && styles.resultWin,
                    match.goalsFor < match.goalsAgainst && styles.resultLoss,
                  ]}>
                    {match.goalsFor} - {match.goalsAgainst}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Players')}
          >
            <Text style={styles.actionButtonText}>👥 Manage Players</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Stats')}
          >
            <Text style={styles.actionButtonText}>📊 View Statistics</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
  header: {
    padding: 20,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 5,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  section: {
    padding: 20,
    paddingTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  seeAllText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  matchCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  currentMatchCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  matchOpponent: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  matchTypeBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchTypeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  matchDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  scoreContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  score: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  continueButton: {
    backgroundColor: COLORS.success,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  startMatchButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  startMatchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  matchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchInfo: {
    flex: 1,
  },
  resultContainer: {
    padding: 10,
  },
  result: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  resultWin: {
    color: COLORS.success,
  },
  resultLoss: {
    color: COLORS.error,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 5,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
});

export default HomeScreen;

