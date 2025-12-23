import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMatches, usePlayers, useStats } from "../hooks/useResources";
import { useTeamContext } from "../contexts/TeamContext";
import { useTheme } from "../contexts/ThemeContext";
import { COLORS } from "../config/constants";
import {
  calculateWinRate,
  sortPlayersByGoals,
  sortPlayersByAssists,
  getMatchResult,
} from "../utils/helpers";

const StatsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { selectedTeamId } = useTeamContext();
  const { stats, loading: statsLoading, refetch: refetchStats } = useStats();
  const {
    matches,
    loading: matchesLoading,
    refetch: refetchMatches,
  } = useMatches(selectedTeamId);
  const {
    players,
    loading: playersLoading,
    refetch: refetchPlayers,
  } = usePlayers(selectedTeamId);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // 'overview', 'players'

  const loading = statsLoading || matchesLoading || playersLoading;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchMatches(), refetchPlayers()]);
    setRefreshing(false);
  };

  // Calculate additional stats
  const computedStats = useMemo(() => {
    const completedMatches = matches.filter((m) => m.isFinished);
    const totalMatches = completedMatches.length;

    const wins = completedMatches.filter(
      (m) => getMatchResult(m.goalsFor, m.goalsAgainst) === "win"
    ).length;

    const draws = completedMatches.filter(
      (m) => getMatchResult(m.goalsFor, m.goalsAgainst) === "draw"
    ).length;

    const losses = completedMatches.filter(
      (m) => getMatchResult(m.goalsFor, m.goalsAgainst) === "loss"
    ).length;

    const totalGoalsFor = completedMatches.reduce(
      (sum, m) => sum + m.goalsFor,
      0
    );
    const totalGoalsAgainst = completedMatches.reduce(
      (sum, m) => sum + m.goalsAgainst,
      0
    );

    const homeMatches = completedMatches.filter((m) => m.venue === "home");
    const awayMatches = completedMatches.filter((m) => m.venue === "away");

    const homeWins = homeMatches.filter(
      (m) => getMatchResult(m.goalsFor, m.goalsAgainst) === "win"
    ).length;

    const awayWins = awayMatches.filter(
      (m) => getMatchResult(m.goalsFor, m.goalsAgainst) === "win"
    ).length;

    const winRate = calculateWinRate(wins, totalMatches);
    const avgGoalsFor =
      totalMatches > 0 ? (totalGoalsFor / totalMatches).toFixed(2) : 0;
    const avgGoalsAgainst =
      totalMatches > 0 ? (totalGoalsAgainst / totalMatches).toFixed(2) : 0;
    const goalDifference = totalGoalsFor - totalGoalsAgainst;

    // Recent form (last 5 matches)
    const recentMatches = completedMatches
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    const recentForm = recentMatches.map((m) => {
      const result = getMatchResult(m.goalsFor, m.goalsAgainst);
      return result === "win" ? "W" : result === "draw" ? "D" : "L";
    });

    return {
      totalMatches,
      wins,
      draws,
      losses,
      totalGoalsFor,
      totalGoalsAgainst,
      winRate,
      avgGoalsFor,
      avgGoalsAgainst,
      goalDifference,
      homeMatches: homeMatches.length,
      awayMatches: awayMatches.length,
      homeWins,
      awayWins,
      recentForm,
    };
  }, [matches]);

  // Top scorers and assisters
  const topScorers = useMemo(() => {
    return sortPlayersByGoals(players).slice(0, 5);
  }, [players]);

  const topAssisters = useMemo(() => {
    return sortPlayersByAssists(players).slice(0, 5);
  }, [players]);

  if (loading && matches.length === 0 && players.length === 0) {
    return (
      <View
        style={[styles.centerContainer, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading statistics...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Tabs */}
      <View
        style={[
          styles.tabContainer,
          {
            backgroundColor: theme.cardBackground,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "overview" && [
              styles.activeTab,
              { borderBottomColor: theme.primary },
            ],
          ]}
          onPress={() => setActiveTab("overview")}
        >
          <Text
            style={[
              styles.tabText,
              { color: theme.textSecondary },
              activeTab === "overview" && [
                styles.activeTabText,
                { color: theme.primary },
              ],
            ]}
          >
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "players" && [
              styles.activeTab,
              { borderBottomColor: theme.primary },
            ],
          ]}
          onPress={() => setActiveTab("players")}
        >
          <Text
            style={[
              styles.tabText,
              { color: theme.textSecondary },
              activeTab === "players" && [
                styles.activeTabText,
                { color: theme.primary },
              ],
            ]}
          >
            Players
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {activeTab === "overview" ? (
          // Overview Tab
          <View style={styles.section}>
            {/* Recent Form */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.cardBackground,
                  shadowColor: theme.shadow,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                Recent Form
              </Text>
              <View style={styles.formContainer}>
                {computedStats.recentForm.length > 0 ? (
                  computedStats.recentForm.map((result, index) => (
                    <View
                      key={index}
                      style={[
                        styles.formBadge,
                        result === "W" && styles.formWin,
                        result === "D" && styles.formDraw,
                        result === "L" && styles.formLoss,
                      ]}
                    >
                      <Text style={styles.formText}>{result}</Text>
                    </View>
                  ))
                ) : (
                  <Text
                    style={[styles.noDataText, { color: theme.textSecondary }]}
                  >
                    No matches played yet
                  </Text>
                )}
              </View>
            </View>

            {/* Overall Statistics */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.cardBackground,
                  shadowColor: theme.shadow,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                Overall Statistics
              </Text>

              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {computedStats.totalMatches}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: theme.textSecondary }]}
                  >
                    Matches Played
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: COLORS.success }]}>
                    {computedStats.wins}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: theme.textSecondary }]}
                  >
                    Wins
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: COLORS.warning }]}>
                    {computedStats.draws}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: theme.textSecondary }]}
                  >
                    Draws
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: COLORS.error }]}>
                    {computedStats.losses}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: theme.textSecondary }]}
                  >
                    Losses
                  </Text>
                </View>
              </View>

              <View
                style={[styles.divider, { backgroundColor: theme.border }]}
              />

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {computedStats.winRate}%
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: theme.textSecondary }]}
                  >
                    Win Rate
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {computedStats.goalDifference > 0 ? "+" : ""}
                    {computedStats.goalDifference}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: theme.textSecondary }]}
                  >
                    Goal Difference
                  </Text>
                </View>
              </View>
            </View>

            {/* Goals Statistics */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.cardBackground,
                  shadowColor: theme.shadow,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                Goals
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: COLORS.success }]}>
                    {computedStats.totalGoalsFor}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: theme.textSecondary }]}
                  >
                    Goals Scored
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: COLORS.error }]}>
                    {computedStats.totalGoalsAgainst}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: theme.textSecondary }]}
                  >
                    Goals Conceded
                  </Text>
                </View>
              </View>

              <View
                style={[styles.divider, { backgroundColor: theme.border }]}
              />

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {computedStats.avgGoalsFor}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: theme.textSecondary }]}
                  >
                    Avg Goals For
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {computedStats.avgGoalsAgainst}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: theme.textSecondary }]}
                  >
                    Avg Goals Against
                  </Text>
                </View>
              </View>
            </View>

            {/* Home vs Away */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.cardBackground,
                  shadowColor: theme.shadow,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                Home vs Away
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {computedStats.homeMatches}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: theme.textSecondary }]}
                  >
                    Home Matches
                  </Text>
                  <Text
                    style={[styles.statSubvalue, { color: COLORS.success }]}
                  >
                    {computedStats.homeWins} wins
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {computedStats.awayMatches}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: theme.textSecondary }]}
                  >
                    Away Matches
                  </Text>
                  <Text
                    style={[styles.statSubvalue, { color: COLORS.success }]}
                  >
                    {computedStats.awayWins} wins
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          // Players Tab
          <View style={styles.section}>
            {/* Top Scorers */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.cardBackground,
                  shadowColor: theme.shadow,
                },
              ]}
            >
              <View style={styles.cardTitleRow}>
                <Ionicons name="football" size={20} color={theme.primary} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  Top Scorers
                </Text>
              </View>

              {topScorers.length > 0 ? (
                topScorers.map((player, index) => (
                  <View
                    key={player.id}
                    style={[
                      styles.playerRow,
                      { borderBottomColor: theme.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.rankBadge,
                        { backgroundColor: theme.background },
                      ]}
                    >
                      <Text style={[styles.rankText, { color: theme.text }]}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={styles.playerInfo}>
                      <Text style={[styles.playerName, { color: theme.text }]}>
                        {player.name}
                      </Text>
                      {player.team && (
                        <Text
                          style={[
                            styles.playerTeam,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {player.team.name}
                        </Text>
                      )}
                    </View>
                    <View style={styles.playerStats}>
                      <Text
                        style={[styles.playerStatValue, { color: theme.text }]}
                      >
                        {player.goals}
                      </Text>
                      <Text
                        style={[
                          styles.playerStatLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        goals
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text
                  style={[styles.noDataText, { color: theme.textSecondary }]}
                >
                  No players with goals yet
                </Text>
              )}
            </View>

            {/* Top Assisters */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.cardBackground,
                  shadowColor: theme.shadow,
                },
              ]}
            >
              <View style={styles.cardTitleRow}>
                <Ionicons name="flash" size={20} color="#FFA500" />
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  Top Assists
                </Text>
              </View>

              {topAssisters.length > 0 ? (
                topAssisters.map((player, index) => (
                  <View
                    key={player.id}
                    style={[
                      styles.playerRow,
                      { borderBottomColor: theme.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.rankBadge,
                        { backgroundColor: theme.background },
                      ]}
                    >
                      <Text style={[styles.rankText, { color: theme.text }]}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={styles.playerInfo}>
                      <Text style={[styles.playerName, { color: theme.text }]}>
                        {player.name}
                      </Text>
                      {player.team && (
                        <Text
                          style={[
                            styles.playerTeam,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {player.team.name}
                        </Text>
                      )}
                    </View>
                    <View style={styles.playerStats}>
                      <Text
                        style={[styles.playerStatValue, { color: theme.text }]}
                      >
                        {player.assists}
                      </Text>
                      <Text
                        style={[
                          styles.playerStatLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        assists
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text
                  style={[styles.noDataText, { color: theme.textSecondary }]}
                >
                  No players with assists yet
                </Text>
              )}
            </View>

            {/* All Players Stats */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.cardBackground,
                  shadowColor: theme.shadow,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                All Players
              </Text>

              {players.length > 0 ? (
                sortPlayersByGoals(players).map((player) => (
                  <TouchableOpacity
                    key={player.id}
                    style={[
                      styles.playerRow,
                      { borderBottomColor: theme.border },
                    ]}
                    onPress={() =>
                      navigation.navigate("PlayerStats", {
                        playerId: player.id,
                      })
                    }
                  >
                    <View style={styles.playerInfo}>
                      <Text style={[styles.playerName, { color: theme.text }]}>
                        {player.name}
                      </Text>
                      {player.team && (
                        <Text
                          style={[
                            styles.playerTeam,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {player.team.name}
                        </Text>
                      )}
                    </View>
                    <View style={styles.playerStatsRow}>
                      <View style={styles.playerStatGroup}>
                        <Text
                          style={[
                            styles.playerStatValue,
                            { color: theme.text },
                          ]}
                        >
                          {player.goals}
                        </Text>
                        <Text
                          style={[
                            styles.playerStatLabel,
                            { color: theme.textSecondary },
                          ]}
                        >
                          G
                        </Text>
                      </View>
                      <View style={styles.playerStatGroup}>
                        <Text
                          style={[
                            styles.playerStatValue,
                            { color: theme.text },
                          ]}
                        >
                          {player.assists}
                        </Text>
                        <Text
                          style={[
                            styles.playerStatLabel,
                            { color: theme.textSecondary },
                          ]}
                        >
                          A
                        </Text>
                      </View>
                      <View style={styles.playerStatGroup}>
                        <Text
                          style={[
                            styles.playerStatValue,
                            { color: theme.text },
                          ]}
                        >
                          {player.goals + player.assists}
                        </Text>
                        <Text
                          style={[
                            styles.playerStatLabel,
                            { color: theme.textSecondary },
                          ]}
                        >
                          Total
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={theme.textSecondary}
                      />
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text
                  style={[styles.noDataText, { color: theme.textSecondary }]}
                >
                  No players yet
                </Text>
              )}
            </View>
          </View>
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    padding: 15,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 15,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 15,
  },
  formContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  formBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  formWin: {
    backgroundColor: COLORS.success,
  },
  formDraw: {
    backgroundColor: COLORS.warning,
  },
  formLoss: {
    backgroundColor: COLORS.error,
  },
  formText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    marginVertical: 10,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statSubvalue: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 5,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray[200],
    marginVertical: 15,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  playerTeam: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  playerStats: {
    alignItems: "center",
  },
  playerStatsRow: {
    flexDirection: "row",
    gap: 15,
  },
  playerStatGroup: {
    alignItems: "center",
  },
  playerStatValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  playerStatLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingVertical: 20,
  },
});

export default StatsScreen;
