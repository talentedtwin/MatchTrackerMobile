import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Image, ImageBackground } from 'react-native';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMatches, usePlayers } from '../hooks/useResources';
import { formatDateTime } from '../utils/helpers';
import { COLORS, FONTS } from '../config/constants';

const HomeScreen = ({ navigation }) => {
  const { user } = useUser();
  const { signOut } = useAuth();
  const { matches, loading: matchesLoading, refetch: refetchMatches } = useMatches();
  const { players, loading: playersLoading } = usePlayers();
  const [refreshing, setRefreshing] = useState(false);

  // Refetch matches when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetchMatches();
    }, [refetchMatches])
  );

  // Get scheduled matches (not yet started - in the future or no scores yet)
  const scheduledMatches = matches?.filter(m => !m.isFinished) || [];
  // Sort scheduled matches by date (soonest first)
  const upcomingMatches = scheduledMatches
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);
  
  const recentMatches = matches?.filter(m => m.isFinished).slice(0, 3) || [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchMatches();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
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
        <ImageBackground
          source={require('../../assets/header-bg.png')}
          style={styles.headerBackground}
          resizeMode="cover"
        >
          <View style={styles.headerOverlay}>
            <View style={styles.headerContent}>
              <View style={styles.titleContainer}>
                <View style={styles.titleRow}>
                  <Image 
                    source={require('../../assets/logo.png')} 
                    style={styles.logo}
                    resizeMode="contain"
                  />
                  <Text style={styles.title}>MatchTracker</Text>
                </View>
                <Text style={styles.subtitle}>
                  Welcome back, {user?.firstName || user?.emailAddresses?.[0]?.emailAddress || 'Player'}!
                </Text>
              </View>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{matches?.length || 0}</Text>
          <Text style={styles.statLabel}>Total Matches</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{players?.length || 0}</Text>
          <Text style={styles.statLabel}>Players</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {matches?.filter(m => m.isFinished && m.goalsFor > m.goalsAgainst).length || 0}
          </Text>
          <Text style={styles.statLabel}>Wins</Text>
        </View>
      </View>

      {/* Scheduled Matches */}
      {upcomingMatches.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="calendar" size={24} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Scheduled Matches</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {upcomingMatches.map((match) => (
            <View
              key={match.id}
              style={[styles.matchCard, styles.scheduledMatchCard]}
            >
              <View style={styles.matchHeader}>
                <Text style={styles.matchOpponent}>{match.opponent}</Text>
                <View style={styles.matchHeaderActions}>
                  <View style={styles.matchTypeBadge}>
                    <Text style={styles.matchTypeText}>{match.matchType.toUpperCase()}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => navigation.navigate('EditMatch', { matchId: match.id, match })}
                  >
                    <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.matchInfoRow}>
                <Ionicons name="location" size={14} color={COLORS.textSecondary} />
                <Text style={styles.matchDate}>
                  {match.venue === 'home' ? 'Home' : 'Away'} • {formatDateTime(match.date)}
                </Text>
              </View>
              {match.selectedPlayerIds && match.selectedPlayerIds.length > 0 && (
                <View style={styles.matchInfoRow}>
                  <Ionicons name="people" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.playerCount}>
                    {match.selectedPlayerIds.length} player{match.selectedPlayerIds.length !== 1 ? 's' : ''} selected
                  </Text>
                </View>
              )}
              {match.notes && (
                <View style={styles.matchInfoRow}>
                  <Ionicons name="document-text" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.matchNotes} numberOfLines={2}>
                    {match.notes}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.startMatchButton}
                onPress={() => navigation.navigate('MatchDetails', { matchId: match.id })}
              >
                <Ionicons name="play-circle" size={20} color="#fff" />
                <Text style={styles.startMatchButtonText}>Start Match</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>No Scheduled Matches</Text>
          <TouchableOpacity
            style={styles.addMatchButton}
            onPress={() => navigation.navigate('AddMatch')}
          >
            <Text style={styles.addMatchButtonText}>+ Schedule New Match</Text>
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
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={() => navigation.navigate('AddMatch')}
          >
            <View style={styles.actionButtonContent}>
              <Ionicons name="add-circle" size={24} color="#fff" />
              <Text style={[styles.actionButtonText, styles.actionButtonPrimaryText]}>Add Match</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Players')}
          >
            <View style={styles.actionButtonContent}>
              <Ionicons name="people" size={24} color={COLORS.primary} />
              <Text style={styles.actionButtonText}>Manage Players</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Stats')}
          >
            <View style={styles.actionButtonContent}>
              <Ionicons name="stats-chart" size={24} color={COLORS.primary} />
              <Text style={styles.actionButtonText}>View Statistics</Text>
            </View>
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
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  header: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  headerBackground: {
    width: '100%',
  },
  headerOverlay: {
    backgroundColor: 'rgba(37, 99, 235, 0.55)',
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: 10,
  },
  title: {
    fontSize: 32,
    fontFamily: FONTS.heading,
    color: '#fff',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FONTS.body,
    color: '#fff',
    opacity: 0.9,
  },
  logoutButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fff',
  },
  logoutButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
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
    fontSize: 28,
    fontFamily: FONTS.heading,
    color: COLORS.primary,
    marginBottom: 5,
    letterSpacing: 1,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: FONTS.body,
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: FONTS.heading,
    color: COLORS.text,
    letterSpacing: 1,
  },
  seeAllText: {
    color: COLORS.primary,
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
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
  scheduledMatchCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  matchHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matchOpponent: {
    fontSize: 18,
    fontFamily: FONTS.bodyBold,
    color: COLORS.text,
    flex: 1,
    marginRight: 10,
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
    fontFamily: FONTS.bodyBold,
    textTransform: 'uppercase',
  },
  editButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  editButtonText: {
    fontSize: 14,
  },
  matchDate: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  matchInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  playerCount: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  matchNotes: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  scoreContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  score: {
    fontSize: 36,
    fontFamily: FONTS.heading,
    color: COLORS.text,
    letterSpacing: 2,
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
    fontFamily: FONTS.bodyBold,
  },
  startMatchButton: {
    backgroundColor: COLORS.success,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  startMatchButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
  },
  addMatchButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  addMatchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
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
    fontFamily: FONTS.bodyBold,
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
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButtonPrimary: {
    backgroundColor: COLORS.primary,
    flexBasis: '100%',
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  actionButtonPrimaryText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default HomeScreen;

