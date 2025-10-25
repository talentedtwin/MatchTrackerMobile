import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMatches } from '../hooks/useResources';
import { COLORS, MATCH_TYPES, VENUE_TYPES } from '../config/constants';
import { formatDate, getMatchResult, getResultColor } from '../utils/helpers';

const HistoryScreen = ({ navigation }) => {
  const { matches, loading, refetch } = useMatches();
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all', 'league', 'cup'
  const [filterResult, setFilterResult] = useState('all'); // 'all', 'win', 'draw', 'loss'

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Filter and sort matches
  const filteredMatches = useMemo(() => {
    let filtered = matches
      .filter(match => match.isFinished) // Only show finished matches
      .sort((a, b) => new Date(b.date) - new Date(a.date)); // Most recent first

    // Filter by match type
    if (filterType !== 'all') {
      filtered = filtered.filter(match => match.matchType === filterType);
    }

    // Filter by result
    if (filterResult !== 'all') {
      filtered = filtered.filter(match => {
        const result = getMatchResult(match.goalsFor, match.goalsAgainst);
        return result === filterResult;
      });
    }

    return filtered;
  }, [matches, filterType, filterResult]);

  // Calculate stats
  const stats = useMemo(() => {
    const completed = matches.filter(m => m.isFinished);
    const wins = completed.filter(m => getMatchResult(m.goalsFor, m.goalsAgainst) === 'win').length;
    const draws = completed.filter(m => getMatchResult(m.goalsFor, m.goalsAgainst) === 'draw').length;
    const losses = completed.filter(m => getMatchResult(m.goalsFor, m.goalsAgainst) === 'loss').length;
    const totalGoalsFor = completed.reduce((sum, m) => sum + m.goalsFor, 0);
    const totalGoalsAgainst = completed.reduce((sum, m) => sum + m.goalsAgainst, 0);

    return {
      total: completed.length,
      wins,
      draws,
      losses,
      goalsFor: totalGoalsFor,
      goalsAgainst: totalGoalsAgainst,
    };
  }, [matches]);

  const handleMatchPress = (match) => {
    navigation.navigate('MatchDetails', { matchId: match.id });
  };

  if (loading && matches.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading matches...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Matches</Text>
        </View>
        <View style={[styles.statBox, styles.statBoxBorder]}>
          <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.wins}</Text>
          <Text style={styles.statLabel}>Wins</Text>
        </View>
        <View style={[styles.statBox, styles.statBoxBorder]}>
          <Text style={[styles.statValue, { color: COLORS.warning }]}>{stats.draws}</Text>
          <Text style={styles.statLabel}>Draws</Text>
        </View>
        <View style={[styles.statBox, styles.statBoxBorder]}>
          <Text style={[styles.statValue, { color: COLORS.error }]}>{stats.losses}</Text>
          <Text style={styles.statLabel}>Losses</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {/* Match Type Filters */}
          <TouchableOpacity
            style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
            onPress={() => setFilterType('all')}
          >
            <Text style={[styles.filterText, filterType === 'all' && styles.filterTextActive]}>
              All Matches
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterType === MATCH_TYPES.LEAGUE && styles.filterChipActive]}
            onPress={() => setFilterType(MATCH_TYPES.LEAGUE)}
          >
            <Text style={[styles.filterText, filterType === MATCH_TYPES.LEAGUE && styles.filterTextActive]}>
              League
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterType === MATCH_TYPES.CUP && styles.filterChipActive]}
            onPress={() => setFilterType(MATCH_TYPES.CUP)}
          >
            <Text style={[styles.filterText, filterType === MATCH_TYPES.CUP && styles.filterTextActive]}>
              Cup
            </Text>
          </TouchableOpacity>

          <View style={styles.filterSeparator} />

          {/* Result Filters */}
          <TouchableOpacity
            style={[styles.filterChip, filterResult === 'all' && styles.filterChipActive]}
            onPress={() => setFilterResult('all')}
          >
            <Text style={[styles.filterText, filterResult === 'all' && styles.filterTextActive]}>
              All Results
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterResult === 'win' && styles.filterChipActive]}
            onPress={() => setFilterResult('win')}
          >
            <Text style={[styles.filterText, filterResult === 'win' && styles.filterTextActive]}>
              Wins
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterResult === 'draw' && styles.filterChipActive]}
            onPress={() => setFilterResult('draw')}
          >
            <Text style={[styles.filterText, filterResult === 'draw' && styles.filterTextActive]}>
              Draws
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterResult === 'loss' && styles.filterChipActive]}
            onPress={() => setFilterResult('loss')}
          >
            <Text style={[styles.filterText, filterResult === 'loss' && styles.filterTextActive]}>
              Losses
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Matches List */}
      <ScrollView
        style={styles.matchesList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredMatches.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No matches found</Text>
            <Text style={styles.emptySubtext}>
              {filterType !== 'all' || filterResult !== 'all'
                ? 'Try adjusting your filters'
                : 'Your match history will appear here'}
            </Text>
          </View>
        ) : (
          filteredMatches.map((match) => {
            const result = getMatchResult(match.goalsFor, match.goalsAgainst);
            const resultColor = getResultColor(result);

            return (
              <TouchableOpacity
                key={match.id}
                style={styles.matchCard}
                onPress={() => handleMatchPress(match)}
              >
                <View style={styles.matchHeader}>
                  <Text style={styles.matchDate}>{formatDate(match.date)}</Text>
                  <View style={styles.matchTypeBadge}>
                    {match.matchType === MATCH_TYPES.CUP ? (
                      <View style={styles.badgeContent}>
                        <Ionicons name="trophy" size={14} color="#FFD700" />
                        <Text style={styles.matchTypeText}>Cup</Text>
                      </View>
                    ) : (
                      <View style={styles.badgeContent}>
                        <Ionicons name="football" size={14} color={COLORS.primary} />
                        <Text style={styles.matchTypeText}>League</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.matchContent}>
                  <View style={styles.matchInfo}>
                    <Text style={styles.opponent}>{match.opponent}</Text>
                    <View style={styles.venueRow}>
                      <Ionicons 
                        name={match.venue === VENUE_TYPES.HOME ? "home" : "airplane"} 
                        size={14} 
                        color={COLORS.textSecondary} 
                      />
                      <Text style={styles.venue}>
                        {match.venue === VENUE_TYPES.HOME ? 'Home' : 'Away'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.scoreContainer}>
                    <View style={[styles.resultBadge, { backgroundColor: resultColor }]}>
                      <Text style={styles.resultText}>{result.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.score}>
                      {match.goalsFor} - {match.goalsAgainst}
                    </Text>
                  </View>
                </View>

                {match.team && (
                  <Text style={styles.teamName}>Team: {match.team.name}</Text>
                )}

                {/* Player Stats */}
                {match.playerStats && match.playerStats.length > 0 && (
                  <View style={styles.playerStatsContainer}>
                    {match.playerStats
                      .filter(stat => stat.goals > 0 || stat.assists > 0)
                      .map(stat => (
                        <View key={stat.id} style={styles.playerStatRow}>
                          <Text style={styles.playerStatName}>{stat.player.name}</Text>
                          <View style={styles.playerStatNumbers}>
                            {stat.goals > 0 && (
                              <View style={styles.statBadge}>
                                <Ionicons name="football" size={12} color={COLORS.primary} />
                                <Text style={styles.playerStatItem}>{stat.goals}</Text>
                              </View>
                            )}
                            {stat.assists > 0 && (
                              <View style={styles.statBadge}>
                                <Ionicons name="flash" size={12} color="#FFA500" />
                                <Text style={styles.playerStatItem}>{stat.assists}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
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
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statBoxBorder: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.gray[200],
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
  filtersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.gray[100],
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  filterSeparator: {
    width: 1,
    backgroundColor: COLORS.gray[300],
    marginHorizontal: 10,
  },
  matchesList: {
    flex: 1,
    padding: 15,
  },
  matchCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  matchDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  matchTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  matchContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchInfo: {
    flex: 1,
  },
  opponent: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  venue: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 5,
  },
  resultText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  score: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  teamName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  playerStatsContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  playerStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  playerStatName: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
  },
  playerStatNumbers: {
    flexDirection: 'row',
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  playerStatItem: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default HistoryScreen;
