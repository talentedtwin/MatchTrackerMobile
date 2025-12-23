import React, { useState, useMemo, useCallback, memo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMatches } from "../hooks/useResources";
import { useTeamContext } from "../contexts/TeamContext";
import { useTheme } from "../contexts/ThemeContext";
import { COLORS, MATCH_TYPES, VENUE_TYPES } from "../config/constants";
import { formatDate, getMatchResult, getResultColor } from "../utils/helpers";

// Memoized MatchCard component
const MatchCard = memo(({ match, onPress, theme }) => {
  const result = getMatchResult(match.goalsFor, match.goalsAgainst);
  const resultColor = getResultColor(result);

  return (
    <TouchableOpacity
      style={[
        styles.matchCard,
        {
          backgroundColor: theme.cardBackground,
          shadowColor: theme.shadow,
          borderColor: theme.border,
        },
      ]}
      onPress={() => onPress(match)}
    >
      <View style={styles.matchHeader}>
        <Text style={[styles.matchOpponent, { color: theme.text }]}>
          {match.opponent}
        </Text>
        <View style={[styles.resultBadge, { backgroundColor: resultColor }]}>
          <Text style={styles.resultText}>
            {result ? result.toUpperCase() : "SCH"}
          </Text>
        </View>
      </View>
      <View style={styles.matchRow}>
        <View style={styles.matchInfo}>
          <View style={styles.matchInfoItem}>
            <Ionicons name="calendar" size={14} color={theme.textSecondary} />
            <Text style={[styles.matchDate, { color: theme.textSecondary }]}>
              {formatDate(match.date)}
            </Text>
          </View>
          <View style={styles.matchInfoItem}>
            <Ionicons name="location" size={14} color={theme.textSecondary} />
            <Text style={[styles.matchDate, { color: theme.textSecondary }]}>
              {match.venue === "home" ? "Home" : "Away"}
            </Text>
          </View>
          <View
            style={[
              styles.matchTypeBadge,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.matchTypeText, { color: theme.text }]}>
              {match.matchType.toUpperCase()}
            </Text>
          </View>
        </View>
        {match.isFinished && (
          <Text style={[styles.score, { color: theme.text }]}>
            {match.goalsFor} - {match.goalsAgainst}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

const HistoryScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { selectedTeamId } = useTeamContext();
  const [filterType, setFilterType] = useState("all"); // 'all', 'league', 'cup'
  const [filterVenue, setFilterVenue] = useState("all"); // 'all', 'home', 'away'
  const [showScheduled, setShowScheduled] = useState(false); // Toggle between scheduled and finished
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterType !== "all") count++;
    if (filterVenue !== "all") count++;
    return count;
  }, [filterType, filterVenue]);

  // Build query options for server-side filtering
  const queryOptions = useMemo(
    () => ({
      isFinished: !showScheduled,
      matchType: filterType !== "all" ? filterType : undefined,
      venue: filterVenue !== "all" ? filterVenue : undefined,
      fields: "basic", // Use basic fields for faster list view
    }),
    [showScheduled, filterType, filterVenue]
  );

  // Fetch matches with server-side filters
  // Use JSON string of options as key to ensure refetch on filter changes
  const optionsKey = JSON.stringify(queryOptions);
  const { matches, loading, refetch, invalidate } = useMatches(
    selectedTeamId,
    queryOptions
  );

  // Manually trigger refetch when filters change
  useEffect(() => {
    invalidate(); // Clear cache for old filter combination
    refetch(); // Fetch with new filters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showScheduled, filterType, filterVenue]);

  // Client-side search filter
  const filteredMatches = useMemo(() => {
    if (!searchQuery.trim()) return matches;
    const query = searchQuery.toLowerCase();
    return matches.filter((match) =>
      match.opponent.toLowerCase().includes(query)
    );
  }, [matches, searchQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Calculate stats from all matches (fetch separately if needed)
  const stats = useMemo(() => {
    const completed = filteredMatches.filter((m) => m.isFinished);
    const wins = completed.filter(
      (m) => getMatchResult(m.goalsFor, m.goalsAgainst) === "win"
    ).length;
    const draws = completed.filter(
      (m) => getMatchResult(m.goalsFor, m.goalsAgainst) === "draw"
    ).length;
    const losses = completed.filter(
      (m) => getMatchResult(m.goalsFor, m.goalsAgainst) === "loss"
    ).length;
    const totalGoalsFor = completed.reduce((sum, m) => sum + m.goalsFor, 0);
    const totalGoalsAgainst = completed.reduce(
      (sum, m) => sum + m.goalsAgainst,
      0
    );

    return {
      total: completed.length,
      wins,
      draws,
      losses,
      goalsFor: totalGoalsFor,
      goalsAgainst: totalGoalsAgainst,
    };
  }, [filteredMatches]);

  const handleMatchPress = useCallback(
    (match) => {
      navigation.navigate("MatchDetails", { matchId: match.id });
    },
    [navigation]
  );

  const handleClearFilters = useCallback(() => {
    setFilterType("all");
    setFilterVenue("all");
  }, []);

  const handleApplyFilters = useCallback(() => {
    setFilterModalVisible(false);
  }, []);

  // FlatList optimization: getItemLayout for better scroll performance
  const getItemLayout = useCallback(
    (data, index) => ({
      length: 120, // Approximate height of match card
      offset: 120 * index,
      index,
    }),
    []
  );

  const keyExtractor = useCallback((item) => item.id, []);

  const renderItem = useCallback(
    ({ item }) => (
      <MatchCard match={item} onPress={handleMatchPress} theme={theme} />
    ),
    [handleMatchPress, theme]
  );

  const ListHeaderComponent = useMemo(
    () => (
      <View>
        {/* Search Bar */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            },
          ]}
        >
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search matches by opponent..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons
                name="close-circle"
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Summary */}
        {stats.total > 0 && (
          <View
            style={[
              styles.statsContainer,
              { backgroundColor: theme.cardBackground },
            ]}
          >
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {stats.wins}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Wins
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.warning }]}>
                {stats.draws}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Draws
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.error }]}>
                {stats.losses}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Losses
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {stats.goalsFor}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Goals
              </Text>
            </View>
          </View>
        )}
      </View>
    ),
    [searchQuery, stats, theme]
  );

  const ListEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="calendar-outline"
          size={64}
          color={theme.textSecondary}
        />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          {loading ? "Loading matches..." : "No matches found"}
        </Text>
        {!loading && searchQuery && (
          <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
            Try adjusting your search
          </Text>
        )}
        {!loading && !showScheduled && filteredMatches.length === 0 && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate("AddMatch")}
          >
            <Text style={styles.addButtonText}>+ Add First Match</Text>
          </TouchableOpacity>
        )}
      </View>
    ),
    [loading, searchQuery, theme]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Toggle between Scheduled and History */}
      <View
        style={[
          styles.toggleContainer,
          { backgroundColor: theme.cardBackground },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.toggleButton,
            { backgroundColor: theme.background },
            !showScheduled && [
              styles.toggleButtonActive,
              { backgroundColor: theme.primary },
            ],
          ]}
          onPress={() => setShowScheduled(false)}
        >
          <Text
            style={[
              styles.toggleButtonText,
              { color: theme.text },
              !showScheduled && styles.toggleButtonTextActive,
            ]}
          >
            History
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            { backgroundColor: theme.background },
            showScheduled && [
              styles.toggleButtonActive,
              { backgroundColor: theme.primary },
            ],
          ]}
          onPress={() => setShowScheduled(true)}
        >
          <Text
            style={[
              styles.toggleButtonText,
              { color: theme.text },
              showScheduled && styles.toggleButtonTextActive,
            ]}
          >
            Scheduled
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Button */}
      <View
        style={[
          styles.filterButtonContainer,
          { backgroundColor: theme.cardBackground },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            },
          ]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="filter" size={20} color={theme.primary} />
          <Text style={[styles.filterButtonText, { color: theme.text }]}>
            Filters
          </Text>
          {activeFilterCount > 0 && (
            <View
              style={[styles.filterBadge, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.cardBackground },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Filters
              </Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Match Type Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: theme.text }]}>
                Match Type
              </Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    },
                    filterType === "all" && [
                      styles.filterOptionActive,
                      {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ],
                  ]}
                  onPress={() => setFilterType("all")}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      { color: theme.text },
                      filterType === "all" && styles.filterOptionTextActive,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    },
                    filterType === "league" && [
                      styles.filterOptionActive,
                      {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ],
                  ]}
                  onPress={() => setFilterType("league")}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      { color: theme.text },
                      filterType === "league" && styles.filterOptionTextActive,
                    ]}
                  >
                    League
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    },
                    filterType === "cup" && [
                      styles.filterOptionActive,
                      {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ],
                  ]}
                  onPress={() => setFilterType("cup")}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      { color: theme.text },
                      filterType === "cup" && styles.filterOptionTextActive,
                    ]}
                  >
                    Cup
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    },
                    filterType === "friendly" && [
                      styles.filterOptionActive,
                      {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ],
                  ]}
                  onPress={() => setFilterType("friendly")}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      { color: theme.text },
                      filterType === "friendly" &&
                        styles.filterOptionTextActive,
                    ]}
                  >
                    Friendly
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Venue Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: theme.text }]}>
                Venue
              </Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    },
                    filterVenue === "all" && [
                      styles.filterOptionActive,
                      {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ],
                  ]}
                  onPress={() => setFilterVenue("all")}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      { color: theme.text },
                      filterVenue === "all" && styles.filterOptionTextActive,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    },
                    filterVenue === "home" && [
                      styles.filterOptionActive,
                      {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ],
                  ]}
                  onPress={() => setFilterVenue("home")}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      { color: theme.text },
                      filterVenue === "home" && styles.filterOptionTextActive,
                    ]}
                  >
                    Home
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    },
                    filterVenue === "away" && [
                      styles.filterOptionActive,
                      {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ],
                  ]}
                  onPress={() => setFilterVenue("away")}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      { color: theme.text },
                      filterVenue === "away" && styles.filterOptionTextActive,
                    ]}
                  >
                    Away
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.clearButton,
                  { borderColor: theme.border },
                ]}
                onPress={handleClearFilters}
              >
                <Text style={[styles.clearButtonText, { color: theme.text }]}>
                  Clear All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.applyButton,
                  { backgroundColor: theme.primary },
                ]}
                onPress={handleApplyFilters}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FlatList for better performance */}
      <FlatList
        data={filteredMatches}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        contentContainerStyle={styles.listContent}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    paddingBottom: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: COLORS.text,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 15,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    alignItems: "center",
    backgroundColor: "#fff",
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  toggleButtonTextActive: {
    color: "#fff",
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  filterButtonContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: "#fff",
  },
  filterButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
    marginLeft: 8,
  },
  filterBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  filterBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
  },
  filterSection: {
    marginBottom: 25,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  filterOption: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    backgroundColor: "#fff",
  },
  filterOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterOptionText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
  },
  filterOptionTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  clearButton: {
    backgroundColor: COLORS.gray[200],
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  applyButton: {
    backgroundColor: COLORS.primary,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  filtersContainer: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    minHeight: 50,
  },
  activeFiltersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  activeFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  activeFilterChipText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
  },
  filtersContainer: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    minHeight: 50,
  },
  filterGroup: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginRight: 10,
    minWidth: 50,
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
  filterChipText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  matchCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  matchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  matchOpponent: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
  },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resultText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#fff",
  },
  matchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  matchInfo: {
    flex: 1,
  },
  matchInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  matchDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 5,
  },
  matchTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
    marginTop: 4,
    alignSelf: "flex-start",
  },
  matchTypeText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },
  score: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: 15,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  addButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default HistoryScreen;
