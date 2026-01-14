import React, { useState, useMemo, useCallback, useRef, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePlayers, useTeams } from "../hooks/useResources";
import { useTeamContext } from "../contexts/TeamContext";
import { useTheme } from "../contexts/ThemeContext";
import { COLORS } from "../config/constants";

// Memoized PlayerCard component to prevent unnecessary re-renders
const PlayerCard = memo(({ player, onEdit, onDelete, theme }) => {
  return (
    <View
      style={[
        styles.playerCard,
        {
          backgroundColor: theme.cardBackground,
          shadowColor: theme.shadow,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.playerInfo}>
        <Text style={[styles.playerName, { color: theme.text }]}>
          {player.name}
        </Text>
        <View style={styles.playerStatsRow}>
          <View style={styles.statItem}>
            <Ionicons name="football" size={14} color={theme.primary} />
            <Text style={[styles.playerStats, { color: theme.textSecondary }]}>
              {player.goals} goals
            </Text>
          </View>
          <Text style={[styles.statDivider, { color: theme.textSecondary }]}>
            •
          </Text>
          <View style={styles.statItem}>
            <Ionicons name="flash" size={14} color="#FFA500" />
            <Text style={[styles.playerStats, { color: theme.textSecondary }]}>
              {player.assists} assists
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => onEdit(player)}
        >
          <Ionicons name="create-outline" size={18} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => onDelete(player.id)}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

// Memoized TeamCard component
const TeamCard = memo(
  ({ team, players, onEdit, onDelete, navigation, theme }) => {
    return (
      <View
        style={[
          styles.teamCard,
          {
            backgroundColor: theme.cardBackground,
            shadowColor: theme.shadow,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.teamHeader}>
          <View style={styles.teamInfo}>
            <View style={styles.teamNameRow}>
              {team.avatar && (
                <Image
                  source={{ uri: team.avatar }}
                  style={styles.teamAvatar}
                  onError={(error) =>
                    console.log(
                      "PlayersScreen - Team avatar error:",
                      team.name,
                      error.nativeEvent.error
                    )
                  }
                  onLoad={() =>
                    console.log(
                      "PlayersScreen - Team avatar loaded:",
                      team.name
                    )
                  }
                />
              )}
              <Text style={[styles.teamName, { color: theme.text }]}>
                {team.name}
              </Text>
            </View>
            <Text
              style={[styles.teamPlayerCount, { color: theme.textSecondary }]}
            >
              {players.length} player{players.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate("AddTeam", { team })}
            >
              <Ionicons name="create-outline" size={18} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => onDelete(team.id)}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        </View>

        {players.length > 0 && (
          <View style={styles.playersList}>
            {players.map((player) => (
              <View
                key={player.id}
                style={[
                  styles.playerChip,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={[styles.playerChipText, { color: theme.text }]}>
                  {player.name} ({player.goals}G {player.assists}A)
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }
);

const PlayersScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { selectedTeamId: filterTeamId } = useTeamContext();
  const {
    players,
    loading: playersLoading,
    addPlayer,
    updatePlayer,
    removePlayer,
    refetch: refetchPlayers,
  } = usePlayers(filterTeamId);
  const [activeTab, setActiveTab] = useState("teams"); // 'teams' or 'players'

  // Lazy load teams only when Teams tab is active
  const {
    teams,
    loading: teamsLoading,
    addTeam,
    updateTeam,
    removeTeam,
    refetch: refetchTeams,
  } = useTeams(
    activeTab === "teams" ? { include: "players" } : { summary: true }
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [teamModalVisible, setTeamModalVisible] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimeoutRef = useRef(null);
  const lastRefreshRef = useRef(Date.now());

  const loading = playersLoading || teamsLoading;

  // Pull-to-refresh cooldown (prevent rapid successive refreshes)
  const onRefresh = useCallback(async () => {
    const now = Date.now();
    if (now - lastRefreshRef.current < 2000) {
      // 2 second cooldown
      return;
    }
    lastRefreshRef.current = now;

    setRefreshing(true);
    await Promise.all([refetchPlayers(), refetchTeams()]);
    setRefreshing(false);
  }, [refetchPlayers, refetchTeams]);

  // Debounced search (300ms delay)
  const handleSearchChange = useCallback((text) => {
    setSearchQuery(text);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    // In a real implementation, this would trigger API call with search parameter
    searchTimeoutRef.current = setTimeout(() => {
      // Future: Call API with search parameter
      console.log("Search query:", text);
    }, 300);
  }, []);

  // Filter players based on search query
  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return players;
    const query = searchQuery.toLowerCase();
    return players.filter((player) =>
      player.name.toLowerCase().includes(query)
    );
  }, [players, searchQuery]);

  // Filter teams based on search query and active tab
  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return teams;
    const query = searchQuery.toLowerCase();

    // In Players tab, show teams that have matching players OR match by name
    if (activeTab === "players") {
      const matchingPlayerTeamIds = filteredPlayers
        .filter((p) => p.teamId)
        .map((p) => p.teamId);
      return teams.filter(
        (team) =>
          matchingPlayerTeamIds.includes(team.id) ||
          team.name.toLowerCase().includes(query)
      );
    }

    // In Teams tab, only filter by team name
    return teams.filter((team) => team.name.toLowerCase().includes(query));
  }, [teams, searchQuery, activeTab, filteredPlayers]);

  // Team Management
  const handleAddTeam = async () => {
    if (!teamName.trim()) {
      Alert.alert("Error", "Please enter a team name");
      return;
    }

    try {
      await addTeam({ name: teamName });
      setTeamName("");
      setTeamModalVisible(false);
      Alert.alert("Success", "Team added successfully");
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to add team");
    }
  };

  const handleEditTeam = (team) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamModalVisible(true);
  };

  const handleUpdateTeam = async () => {
    if (!teamName.trim()) {
      Alert.alert("Error", "Please enter a team name");
      return;
    }

    try {
      await updateTeam(editingTeam.id, { name: teamName });
      setEditingTeam(null);
      setTeamName("");
      setTeamModalVisible(false);
      Alert.alert("Success", "Team updated successfully");
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to update team");
    }
  };

  const handleDeleteTeam = (teamId) => {
    Alert.alert("Delete Team", "Are you sure you want to delete this team?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await removeTeam(teamId);
            Alert.alert("Success", "Team deleted successfully");
          } catch (error) {
            Alert.alert("Error", error.message || "Failed to delete team");
          }
        },
      },
    ]);
  };

  // Player Management
  const handleAddPlayer = async () => {
    if (!playerName.trim()) {
      Alert.alert("Error", "Please enter a player name");
      return;
    }

    try {
      await addPlayer({
        name: playerName,
        teamId: selectedTeamId || undefined,
      });
      setPlayerName("");
      setSelectedTeamId("");
      setModalVisible(false);
      Alert.alert("Success", "Player added successfully");
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to add player");
    }
  };

  const handleEditPlayer = (player) => {
    setEditingPlayer(player);
    setPlayerName(player.name);
    setSelectedTeamId(player.teamId || "");
    setModalVisible(true);
  };

  const handleUpdatePlayer = async () => {
    if (!playerName.trim()) {
      Alert.alert("Error", "Please enter a player name");
      return;
    }

    try {
      await updatePlayer(editingPlayer.id, {
        name: playerName,
        teamId: selectedTeamId || null,
      });
      setEditingPlayer(null);
      setPlayerName("");
      setSelectedTeamId("");
      setModalVisible(false);
      Alert.alert("Success", "Player updated successfully");
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to update player");
    }
  };

  const handleDeletePlayer = (playerId) => {
    Alert.alert(
      "Delete Player",
      "Are you sure you want to delete this player?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await removePlayer(playerId);
              Alert.alert("Success", "Player deleted successfully");
            } catch (error) {
              Alert.alert("Error", error.message || "Failed to delete player");
            }
          },
        },
      ]
    );
  };

  const getPlayersByTeam = (teamId) => {
    return filteredPlayers.filter((p) => p.teamId === teamId);
  };

  const unassignedPlayers = filteredPlayers.filter((p) => !p.teamId);

  if (loading && players.length === 0 && teams.length === 0) {
    return (
      <View
        style={[styles.centerContainer, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading...
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
            { backgroundColor: theme.background },
            activeTab === "teams" && [
              styles.activeTab,
              { backgroundColor: theme.primary },
            ],
          ]}
          onPress={() => setActiveTab("teams")}
        >
          <Text
            style={[
              styles.tabText,
              { color: theme.text },
              activeTab === "teams" && styles.activeTabText,
            ]}
          >
            Teams
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            { backgroundColor: theme.background },
            activeTab === "players" && [
              styles.activeTab,
              { backgroundColor: theme.primary },
            ],
          ]}
          onPress={() => setActiveTab("players")}
        >
          <Text
            style={[
              styles.tabText,
              { color: theme.text },
              activeTab === "players" && styles.activeTabText,
            ]}
          >
            Players
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: theme.cardBackground, borderColor: theme.border },
        ]}
      >
        <Ionicons name="search" size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder={`Search ${activeTab}...`}
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={handleSearchChange}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearchChange("")}>
            <Ionicons
              name="close-circle"
              size={20}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        )}
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
        {activeTab === "teams" ? (
          // Teams Tab
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Your Teams
              </Text>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.primary }]}
                onPress={() => navigation.navigate("AddTeam")}
              >
                <Text style={styles.addButtonText}>+ Add Team</Text>
              </TouchableOpacity>
            </View>

            {filteredTeams.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text
                  style={[styles.emptyText, { color: theme.textSecondary }]}
                >
                  {searchQuery.trim() ? "No teams found" : "No teams yet"}
                </Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery.trim()
                    ? "Try a different search term"
                    : "Create your first team to get started"}
                </Text>
              </View>
            ) : (
              filteredTeams.map((team) => {
                const teamPlayers = getPlayersByTeam(team.id);
                return (
                  <TeamCard
                    key={team.id}
                    team={team}
                    players={teamPlayers}
                    onEdit={handleEditTeam}
                    onDelete={handleDeleteTeam}
                    navigation={navigation}
                    theme={theme}
                  />
                );
              })
            )}
          </View>
        ) : (
          // Players Tab
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                All Players
              </Text>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  setEditingPlayer(null);
                  setPlayerName("");
                  setSelectedTeamId("");
                  setModalVisible(true);
                }}
              >
                <Text style={styles.addButtonText}>+ Add Player</Text>
              </TouchableOpacity>
            </View>

            {/* Unassigned Players */}
            {unassignedPlayers.length > 0 && (
              <View style={styles.subsection}>
                <Text style={[styles.subsectionTitle, { color: theme.text }]}>
                  Unassigned Players
                </Text>
                {unassignedPlayers.map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    onEdit={handleEditPlayer}
                    onDelete={handleDeletePlayer}
                    theme={theme}
                  />
                ))}
              </View>
            )}

            {/* Players by Team */}
            {filteredTeams.map((team) => {
              const teamPlayers = getPlayersByTeam(team.id);
              if (teamPlayers.length === 0) return null;

              return (
                <View key={team.id} style={styles.subsection}>
                  <Text style={[styles.subsectionTitle, { color: theme.text }]}>
                    {team.name}
                  </Text>
                  {teamPlayers.map((player) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      onEdit={handleEditPlayer}
                      onDelete={handleDeletePlayer}
                      theme={theme}
                    />
                  ))}
                </View>
              );
            })}

            {filteredPlayers.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text
                  style={[styles.emptyText, { color: theme.textSecondary }]}
                >
                  {searchQuery.trim() ? "No players found" : "No players yet"}
                </Text>
                <Text
                  style={[styles.emptySubtext, { color: theme.textSecondary }]}
                >
                  {searchQuery.trim()
                    ? "Try a different search term"
                    : "Add your first player to get started"}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Player Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.cardBackground },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editingPlayer ? "Edit Player" : "Add Player"}
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="Player Name"
              placeholderTextColor={theme.textSecondary}
              value={playerName}
              onChangeText={setPlayerName}
            />

            <Text style={[styles.label, { color: theme.text }]}>
              Assign to Team (Optional)
            </Text>
            <View style={styles.teamSelector}>
              <TouchableOpacity
                style={[
                  styles.teamOption,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                  !selectedTeamId && [
                    styles.teamOptionSelected,
                    {
                      backgroundColor: theme.primary,
                      borderColor: theme.primary,
                    },
                  ],
                ]}
                onPress={() => setSelectedTeamId("")}
              >
                <Text
                  style={[
                    styles.teamOptionText,
                    { color: theme.text },
                    !selectedTeamId && styles.teamOptionTextSelected,
                  ]}
                >
                  No Team
                </Text>
              </TouchableOpacity>
              {teams.map((team) => (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.teamOption,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    },
                    selectedTeamId === team.id && [
                      styles.teamOptionSelected,
                      {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ],
                  ]}
                  onPress={() => setSelectedTeamId(team.id)}
                >
                  <Text
                    style={[
                      styles.teamOptionText,
                      { color: theme.text },
                      selectedTeamId === team.id &&
                        styles.teamOptionTextSelected,
                    ]}
                  >
                    {team.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  { borderColor: theme.border },
                ]}
                onPress={() => {
                  setModalVisible(false);
                  setEditingPlayer(null);
                  setPlayerName("");
                  setSelectedTeamId("");
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  { backgroundColor: theme.primary },
                ]}
                onPress={editingPlayer ? handleUpdatePlayer : handleAddPlayer}
              >
                <Text style={styles.saveButtonText}>
                  {editingPlayer ? "Update" : "Add"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Team Modal */}
      <Modal
        visible={teamModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTeamModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.cardBackground },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editingTeam ? "Edit Team" : "Add Team"}
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="Team Name"
              placeholderTextColor={theme.textSecondary}
              value={teamName}
              onChangeText={setTeamName}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  { borderColor: theme.border },
                ]}
                onPress={() => {
                  setTeamModalVisible(false);
                  setEditingTeam(null);
                  setTeamName("");
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  { backgroundColor: theme.primary },
                ]}
                onPress={editingTeam ? handleUpdateTeam : handleAddTeam}
              >
                <Text style={styles.saveButtonText}>
                  {editingTeam ? "Update" : "Add"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    padding: 15,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    alignItems: "center",
    backgroundColor: "#fff",
  },
  activeTab: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: "#fff",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
  },
  subsection: {
    marginBottom: 20,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  teamCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  teamHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  teamInfo: {
    flex: 1,
  },
  teamNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 5,
  },
  teamAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  teamName: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
  },
  teamPlayerCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  playersList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  playerChip: {
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  playerChipText: {
    fontSize: 12,
    color: COLORS.text,
  },
  playerCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 5,
  },
  playerStats: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  playerStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statDivider: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  actionButtons: {
    flexDirection: "row",
  },
  iconButton: {
    padding: 8,
    marginLeft: 5,
  },
  iconButtonText: {
    fontSize: 18,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 15,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  teamSelector: {
    marginBottom: 20,
  },
  teamOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    marginBottom: 8,
  },
  teamOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  teamOptionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  teamOptionTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: COLORS.warning,
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: COLORS.success,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default PlayersScreen;
