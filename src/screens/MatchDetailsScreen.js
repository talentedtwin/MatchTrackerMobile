import React, { useState, useEffect } from "react";
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
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMatches, usePlayers } from "../hooks/useResources";
import { useTheme } from "../contexts/ThemeContext";
import { COLORS, MATCH_TYPES, VENUE_TYPES } from "../config/constants";
import {
  formatDateTime,
  getMatchResult,
  getResultColor,
  getPlayerById,
} from "../utils/helpers";

const MatchDetailsScreen = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { matchId } = route.params;
  const {
    matches,
    loading: matchesLoading,
    updateMatch,
    removeMatch,
  } = useMatches(null);
  const { players, loading: playersLoading } = usePlayers(null);

  const [match, setMatch] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Edit form state
  const [opponent, setOpponent] = useState("");
  const [goalsFor, setGoalsFor] = useState("0");
  const [goalsAgainst, setGoalsAgainst] = useState("0");
  const [venue, setVenue] = useState(VENUE_TYPES.HOME);
  const [matchType, setMatchType] = useState(MATCH_TYPES.LEAGUE);
  const [notes, setNotes] = useState("");
  const [playerStats, setPlayerStats] = useState({});
  const [playerOfTheMatchId, setPlayerOfTheMatchId] = useState(null);
  const [showPotmPicker, setShowPotmPicker] = useState(false);

  const loading = matchesLoading || playersLoading;

  useEffect(() => {
    const foundMatch = matches.find((m) => m.id === matchId);
    if (foundMatch) {
      setMatch(foundMatch);
      setOpponent(foundMatch.opponent);
      setGoalsFor(foundMatch.goalsFor.toString());
      setGoalsAgainst(foundMatch.goalsAgainst.toString());
      setVenue(foundMatch.venue);
      setMatchType(foundMatch.matchType);
      setNotes(foundMatch.notes || "");
      setPlayerOfTheMatchId(foundMatch.playerOfTheMatchId || null);

      // Initialize player stats from match
      const stats = {};
      if (foundMatch.playerStats && foundMatch.playerStats.length > 0) {
        foundMatch.playerStats.forEach((stat) => {
          stats[stat.playerId] = {
            goals: stat.goals || 0,
            assists: stat.assists || 0,
          };
        });
      }
      setPlayerStats(stats);
    }
  }, [matchId, matches]);

  const handleEditMatch = () => {
    setEditModalVisible(true);
  };

  const updatePlayerStat = (playerId, field, value) => {
    setPlayerStats((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: parseInt(value) || 0,
      },
    }));
  };

  const handleSaveMatch = async () => {
    if (!opponent.trim()) {
      Alert.alert("Error", "Please enter opponent name");
      return;
    }

    const goalsForNum = parseInt(goalsFor) || 0;
    const goalsAgainstNum = parseInt(goalsAgainst) || 0;

    // Validate that player goals don't exceed team total
    const totalPlayerGoals = Object.values(playerStats).reduce(
      (sum, stat) => sum + (stat.goals || 0),
      0
    );
    if (totalPlayerGoals > goalsForNum) {
      Alert.alert(
        "Validation Error",
        `Total player goals (${totalPlayerGoals}) cannot exceed team goals (${goalsForNum})`
      );
      return;
    }

    try {
      // Prepare player stats array
      const playerStatsArray = Object.keys(playerStats).map((playerId) => ({
        playerId,
        goals: playerStats[playerId].goals || 0,
        assists: playerStats[playerId].assists || 0,
      }));

      await updateMatch(matchId, {
        opponent: opponent.trim(),
        goalsFor: goalsForNum,
        goalsAgainst: goalsAgainstNum,
        venue,
        matchType,
        notes: notes.trim(),
        playerStats: playerStatsArray,
        playerOfTheMatchId: playerOfTheMatchId,
      });
      setEditModalVisible(false);
      setIsEditing(false);
      Alert.alert("Success", "Match updated successfully");
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to update match");
    }
  };

  const handleDeleteMatch = () => {
    Alert.alert(
      "Delete Match",
      "Are you sure you want to delete this match? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await removeMatch(matchId);
              navigation.goBack();
              Alert.alert("Success", "Match deleted successfully");
            } catch (error) {
              Alert.alert("Error", error.message || "Failed to delete match");
            }
          },
        },
      ]
    );
  };

  const handleFinishMatch = async () => {
    Alert.alert("Finish Match", "Mark this match as played?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Finish",
        onPress: async () => {
          try {
            await updateMatch(matchId, { isFinished: true });
            Alert.alert("Success", "Match marked as played");
          } catch (error) {
            Alert.alert("Error", error.message || "Failed to finish match");
          }
        },
      },
    ]);
  };

  const handleShareMatch = async () => {
    if (!match) return;

    try {
      // Build share message
      let message = `🏆 Match Details\n\n`;
      message += `📅 ${formatDateTime(match.date)}\n`;
      message += `📍 ${match.venue === VENUE_TYPES.HOME ? "Home" : "Away"}\n`;
      message += `${
        match.matchType === MATCH_TYPES.CUP
          ? "🏆 Cup"
          : match.matchType === MATCH_TYPES.FRIENDLY
          ? "🤝 Friendly"
          : "⚽ League"
      }\n\n`;

      message += `Opponent: ${match.opponent}\n`;

      if (match.isFinished) {
        const result = getMatchResult(match.goalsFor, match.goalsAgainst);
        const resultEmoji =
          result === "win" ? "🎉" : result === "loss" ? "😔" : "🤝";
        message += `\n${resultEmoji} Result: ${result.toUpperCase()}\n`;
        message += `Score: ${match.goalsFor} - ${match.goalsAgainst}\n`;

        // Add player stats if available
        if (playersWithStats.length > 0) {
          const scorers = playersWithStats.filter(
            (p) =>
              p.goals > 0 ||
              p.assists > 0 ||
              (p.minutesPlayed && p.minutesPlayed > 0)
          );
          if (scorers.length > 0) {
            message += `\n⭐ Player Statistics:\n`;
            scorers.forEach((player) => {
              const stats = [];
              //don't show minutes played
              //if (player.minutesPlayed && player.minutesPlayed > 0) stats.push(`${player.minutesPlayed} min`);
              if (player.goals > 0)
                stats.push(
                  `${player.goals} goal${player.goals > 1 ? "s" : ""}`
                );
              if (player.assists > 0)
                stats.push(
                  `${player.assists} assist${player.assists > 1 ? "s" : ""}`
                );
              message += `${player.name}: ${stats.join(", ")}\n`;
            });
          }
        }
      } else {
        message += `\n⏰ Scheduled Match\n`;
      }

      if (match.notes) {
        message += `\n📝 Notes: ${match.notes}\n`;
      }

      message += `\nShared via MatchTracker App`;

      await Share.share({
        message: message,
        title: `Match vs ${match.opponent}`,
      });
    } catch (error) {
      console.error("Error sharing match:", error);
      Alert.alert("Error", "Failed to share match details");
    }
  };

  if (loading || !match) {
    return (
      <View
        style={[styles.centerContainer, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading match details...
        </Text>
      </View>
    );
  }

  const result = match.isFinished
    ? getMatchResult(match.goalsFor, match.goalsAgainst)
    : null;
  const resultColor = result ? getResultColor(result) : null;

  // Debug logging
  console.log("Match data:", {
    id: match.id,
    playerOfTheMatchId: match.playerOfTheMatchId,
    playerStatsCount: match.playerStats?.length,
    selectedPlayerIds: match.selectedPlayerIds,
  });

  // Get player stats for this match
  const matchPlayerStats = match.playerStats || [];
  const playersWithStats = matchPlayerStats
    .map((stat) => {
      const player = getPlayerById(players, stat.playerId);
      if (!player) return null;

      console.log("Player with stats:", {
        playerId: stat.playerId,
        playerObjId: player.id,
        playerName: player.name,
        isPlayerOfMatch: match.playerOfTheMatchId === player.id,
        statId: stat.id,
      });

      // Preserve player.id and merge in the stats
      return {
        ...player,
        goals: stat.goals || 0,
        assists: stat.assists || 0,
        minutesPlayed: stat.minutesPlayed || 0,
        // Keep player.id intact for comparison with playerOfTheMatchId
      };
    })
    .filter(Boolean);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.content}>
        {/* Match Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.cardBackground,
              shadowColor: theme.shadow,
            },
          ]}
        >
          <View style={styles.headerTop}>
            <Text style={[styles.date, { color: theme.textSecondary }]}>
              {formatDateTime(match.date)}
            </Text>
            <View style={styles.badges}>
              <View
                style={[styles.badge, { backgroundColor: theme.background }]}
              >
                {match.matchType === MATCH_TYPES.CUP ? (
                  <View style={styles.badgeContent}>
                    <Ionicons name="trophy" size={14} color="#ffd900ff" />
                    <Text style={styles.badgeText}>Cup</Text>
                  </View>
                ) : match.matchType === MATCH_TYPES.FRIENDLY ? (
                  <View style={styles.badgeContent}>
                    <Ionicons name="happy" size={14} color={COLORS.success} />
                    <Text style={styles.badgeText}>Friendly</Text>
                  </View>
                ) : (
                  <View style={styles.badgeContent}>
                    <Ionicons name="football" size={14} color={theme.primary} />
                    <Text style={[styles.badgeText, { color: theme.text }]}>
                      League
                    </Text>
                  </View>
                )}
              </View>
              <View
                style={[styles.badge, { backgroundColor: theme.background }]}
              >
                <View style={styles.badgeContent}>
                  <Ionicons
                    name={
                      match.venue === VENUE_TYPES.HOME ? "home" : "airplane"
                    }
                    size={14}
                    color={theme.textSecondary}
                  />
                  <Text style={[styles.badgeText, { color: theme.text }]}>
                    {match.venue === VENUE_TYPES.HOME ? "Home" : "Away"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <Text style={[styles.opponent, { color: theme.text }]}>
            {match.opponent}
          </Text>

          {match.team && (
            <Text style={[styles.teamName, { color: theme.textSecondary }]}>
              Team: {match.team.name}
            </Text>
          )}

          {match.isFinished ? (
            <View style={styles.scoreSection}>
              <View
                style={[styles.resultBadge, { backgroundColor: resultColor }]}
              >
                <Text style={styles.resultText}>{result.toUpperCase()}</Text>
              </View>
              <Text style={[styles.score, { color: theme.text }]}>
                {match.goalsFor} - {match.goalsAgainst}
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.notPlayedBadge,
                { backgroundColor: theme.background },
              ]}
            >
              <Text
                style={[styles.notPlayedText, { color: theme.textSecondary }]}
              >
                Scheduled
              </Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {match.notes && (
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
              <Ionicons name="document-text" size={20} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                Notes
              </Text>
            </View>
            <Text style={[styles.notesText, { color: theme.text }]}>
              {match.notes}
            </Text>
          </View>
        )}

        {/* Player Statistics */}
        {match.isFinished && playersWithStats.length > 0 && (
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
              Player Statistics
            </Text>

            {playersWithStats.map((player) => (
              <View
                key={player.id}
                style={[
                  styles.playerStatRow,
                  { borderBottomColor: theme.border },
                ]}
              >
                <View style={styles.playerInfo}>
                  <Text style={[styles.playerName, { color: theme.text }]}>
                    {player.name}
                  </Text>
                  {match.playerOfTheMatchId === player.id && (
                    <View style={styles.potmBadge}>
                      <Ionicons name="trophy" size={14} color="#FFA500" />
                      <Text style={styles.potmText}>Player of the Match</Text>
                    </View>
                  )}
                </View>
                <View style={styles.playerStats}>
                  {player.minutesPlayed !== undefined &&
                    player.minutesPlayed > 0 && (
                      <View
                        style={[
                          styles.statBadge,
                          { backgroundColor: theme.background },
                        ]}
                      >
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color={theme.primary}
                        />
                        <Text
                          style={[styles.statBadgeText, { color: theme.text }]}
                        >
                          {player.minutesPlayed}'
                        </Text>
                      </View>
                    )}
                  {player.goals > 0 && (
                    <View
                      style={[
                        styles.statBadge,
                        { backgroundColor: theme.background },
                      ]}
                    >
                      <Ionicons
                        name="football"
                        size={14}
                        color={theme.primary}
                      />
                      <Text
                        style={[styles.statBadgeText, { color: theme.text }]}
                      >
                        {player.goals}
                      </Text>
                    </View>
                  )}
                  {player.assists > 0 && (
                    <View
                      style={[
                        styles.statBadge,
                        { backgroundColor: theme.background },
                      ]}
                    >
                      <Ionicons name="flash" size={14} color="#FFA500" />
                      <Text
                        style={[styles.statBadgeText, { color: theme.text }]}
                      >
                        {player.assists}
                      </Text>
                    </View>
                  )}
                  {(player.minutesPlayed === 0 ||
                    player.minutesPlayed === undefined) &&
                    player.goals === 0 &&
                    player.assists === 0 && (
                      <Text
                        style={[styles.noStats, { color: theme.textSecondary }]}
                      >
                        -
                      </Text>
                    )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Match Information */}
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
            Match Information
          </Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
              Date & Time
            </Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {formatDateTime(match.date)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
              Opponent
            </Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {match.opponent}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
              Venue
            </Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {match.venue === VENUE_TYPES.HOME ? "Home" : "Away"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
              Match Type
            </Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {match.matchType === MATCH_TYPES.CUP
                ? "Cup"
                : match.matchType === MATCH_TYPES.FRIENDLY
                ? "Friendly"
                : "League"}
            </Text>
          </View>

          {match.team && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                Team
              </Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {match.team.name}
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {match.isFinished ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.editButton,
                  styles.halfWidth,
                  { backgroundColor: theme.primary },
                ]}
                onPress={handleEditMatch}
              >
                <View style={styles.actionButtonContent}>
                  <Ionicons name="create-outline" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Edit Match</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.shareButton,
                  styles.halfWidth,
                  { backgroundColor: theme.warning },
                ]}
                onPress={handleShareMatch}
              >
                <View style={styles.actionButtonContent}>
                  <Ionicons name="share-outline" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Share Match</Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.editButton,
                  { backgroundColor: theme.primary },
                ]}
                onPress={handleEditMatch}
              >
                <View style={styles.actionButtonContent}>
                  <Ionicons name="create-outline" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Edit Match</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.finishButton]}
                onPress={handleFinishMatch}
              >
                <View style={styles.actionButtonContent}>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={[styles.actionButtonText, { color: "#fff" }]}>
                    Finish Match
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDeleteMatch}
          >
            <View style={styles.actionButtonContent}>
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={[styles.actionButtonText, { color: "#fff" }]}>
                Delete Match
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.cardBackground },
            ]}
          >
            <ScrollView>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Edit Match
              </Text>

              <Text style={[styles.label, { color: theme.text }]}>
                Opponent
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
                placeholder="Opponent Name"
                placeholderTextColor={theme.textSecondary}
                value={opponent}
                onChangeText={setOpponent}
              />

              <Text style={[styles.label, { color: theme.text }]}>Score</Text>
              <View style={styles.scoreInputRow}>
                <TextInput
                  style={[
                    styles.input,
                    styles.scoreInput,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  placeholder="0"
                  placeholderTextColor={theme.textSecondary}
                  value={goalsFor}
                  onChangeText={setGoalsFor}
                  keyboardType="numeric"
                />
                <Text style={[styles.scoreSeparator, { color: theme.text }]}>
                  -
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.scoreInput,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  placeholder="0"
                  placeholderTextColor={theme.textSecondary}
                  value={goalsAgainst}
                  onChangeText={setGoalsAgainst}
                  keyboardType="numeric"
                />
              </View>

              <Text style={[styles.label, { color: theme.text }]}>Venue</Text>
              <View style={styles.optionRow}>
                <TouchableOpacity
                  style={[
                    styles.option,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    },
                    venue === VENUE_TYPES.HOME && [
                      styles.optionSelected,
                      {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ],
                  ]}
                  onPress={() => setVenue(VENUE_TYPES.HOME)}
                >
                  <View style={styles.optionContent}>
                    <Ionicons
                      name="home"
                      size={16}
                      color={
                        venue === VENUE_TYPES.HOME
                          ? "#fff"
                          : theme.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.optionText,
                        { color: theme.text },
                        venue === VENUE_TYPES.HOME && styles.optionTextSelected,
                      ]}
                    >
                      Home
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.option,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    },
                    venue === VENUE_TYPES.AWAY && [
                      styles.optionSelected,
                      {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ],
                  ]}
                  onPress={() => setVenue(VENUE_TYPES.AWAY)}
                >
                  <View style={styles.optionContent}>
                    <Ionicons
                      name="airplane"
                      size={16}
                      color={
                        venue === VENUE_TYPES.AWAY
                          ? "#fff"
                          : theme.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.optionText,
                        { color: theme.text },
                        venue === VENUE_TYPES.AWAY && styles.optionTextSelected,
                      ]}
                    >
                      Away
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: theme.text }]}>
                Match Type
              </Text>
              <View style={styles.optionRow}>
                <TouchableOpacity
                  style={[
                    styles.option,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    },
                    matchType === MATCH_TYPES.LEAGUE && [
                      styles.optionSelected,
                      {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ],
                  ]}
                  onPress={() => setMatchType(MATCH_TYPES.LEAGUE)}
                >
                  <View style={styles.optionContent}>
                    <Ionicons
                      name="football"
                      size={16}
                      color={
                        matchType === MATCH_TYPES.LEAGUE
                          ? "#fff"
                          : theme.primary
                      }
                    />
                    <Text
                      style={[
                        styles.optionText,
                        { color: theme.text },
                        matchType === MATCH_TYPES.LEAGUE &&
                          styles.optionTextSelected,
                      ]}
                    >
                      League
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.option,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    },
                    matchType === MATCH_TYPES.CUP && [
                      styles.optionSelected,
                      {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ],
                  ]}
                  onPress={() => setMatchType(MATCH_TYPES.CUP)}
                >
                  <View style={styles.optionContent}>
                    <Ionicons
                      name="trophy"
                      size={16}
                      color={matchType === MATCH_TYPES.CUP ? "#fff" : "#FFD700"}
                    />
                    <Text
                      style={[
                        styles.optionText,
                        { color: theme.text },
                        matchType === MATCH_TYPES.CUP &&
                          styles.optionTextSelected,
                      ]}
                    >
                      Cup
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.option,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    },
                    matchType === MATCH_TYPES.FRIENDLY && [
                      styles.optionSelected,
                      {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ],
                  ]}
                  onPress={() => setMatchType(MATCH_TYPES.FRIENDLY)}
                >
                  <View style={styles.optionContent}>
                    <Ionicons
                      name="happy"
                      size={16}
                      color={
                        matchType === MATCH_TYPES.FRIENDLY
                          ? "#fff"
                          : COLORS.success
                      }
                    />
                    <Text
                      style={[
                        styles.optionText,
                        { color: theme.text },
                        matchType === MATCH_TYPES.FRIENDLY &&
                          styles.optionTextSelected,
                      ]}
                    >
                      Friendly
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: theme.text }]}>
                Notes (Optional)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="Add notes about the match..."
                placeholderTextColor={theme.textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
              />

              {/* Player Stats Section */}
              {match?.selectedPlayerIds &&
                match.selectedPlayerIds.length > 0 && (
                  <View style={styles.playerStatsSection}>
                    <Text style={[styles.label, { color: theme.text }]}>
                      Player Stats
                    </Text>
                    <Text
                      style={[
                        styles.helperText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Update individual goals and assists for each player
                    </Text>
                    {match.selectedPlayerIds.map((playerId) => {
                      const player = players.find((p) => p.id === playerId);
                      if (!player) return null;

                      return (
                        <View
                          key={playerId}
                          style={[
                            styles.playerStatEditRow,
                            {
                              backgroundColor: theme.background,
                              borderColor: theme.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.playerStatEditName,
                              { color: theme.text },
                            ]}
                          >
                            {player.name}
                          </Text>
                          <View style={styles.playerStatEditInputs}>
                            <View style={styles.statEditGroup}>
                              <View style={styles.statEditLabelRow}>
                                <Ionicons
                                  name="football"
                                  size={14}
                                  color={theme.primary}
                                />
                                <Text
                                  style={[
                                    styles.statEditLabel,
                                    { color: theme.textSecondary },
                                  ]}
                                >
                                  Goals
                                </Text>
                              </View>
                              <TextInput
                                style={[
                                  styles.statEditInput,
                                  {
                                    backgroundColor: theme.cardBackground,
                                    borderColor: theme.border,
                                    color: theme.text,
                                  },
                                ]}
                                value={(
                                  playerStats[playerId]?.goals || 0
                                ).toString()}
                                onChangeText={(value) =>
                                  updatePlayerStat(playerId, "goals", value)
                                }
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={theme.textSecondary}
                              />
                            </View>
                            <View style={styles.statEditGroup}>
                              <View style={styles.statEditLabelRow}>
                                <Ionicons
                                  name="flash"
                                  size={14}
                                  color="#FFA500"
                                />
                                <Text
                                  style={[
                                    styles.statEditLabel,
                                    { color: theme.textSecondary },
                                  ]}
                                >
                                  Assists
                                </Text>
                              </View>
                              <TextInput
                                style={[
                                  styles.statEditInput,
                                  {
                                    backgroundColor: theme.cardBackground,
                                    borderColor: theme.border,
                                    color: theme.text,
                                  },
                                ]}
                                value={(
                                  playerStats[playerId]?.assists || 0
                                ).toString()}
                                onChangeText={(value) =>
                                  updatePlayerStat(playerId, "assists", value)
                                }
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={theme.textSecondary}
                              />
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

              {/* Player of the Match */}
              {match?.selectedPlayerIds &&
                match.selectedPlayerIds.length > 0 && (
                  <View style={styles.playerStatsSection}>
                    <View style={styles.labelRow}>
                      <Ionicons name="trophy" size={18} color="#FFD700" />
                      <Text style={[styles.label, { color: theme.text }]}>
                        Player of the Match (Optional)
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.helperText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Select the standout player from this match
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.dropdownButton,
                        {
                          backgroundColor: theme.background,
                          borderColor: theme.border,
                        },
                      ]}
                      onPress={() => setShowPotmPicker(true)}
                    >
                      <Text
                        style={[
                          styles.dropdownButtonText,
                          { color: theme.text },
                        ]}
                      >
                        {playerOfTheMatchId
                          ? players.find((p) => p.id === playerOfTheMatchId)
                              ?.name || "None"
                          : "None"}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={theme.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.cancelButton,
                    { borderColor: theme.border },
                  ]}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text
                    style={[styles.cancelButtonText, { color: theme.text }]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.saveButton,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={handleSaveMatch}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Player of the Match Picker Modal */}
      <Modal
        visible={showPotmPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPotmPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowPotmPicker(false)}
        >
          <View
            style={[
              styles.pickerModal,
              { backgroundColor: theme.cardBackground },
            ]}
          >
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: theme.text }]}>
                Select Player of the Match
              </Text>
              <TouchableOpacity onPress={() => setShowPotmPicker(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              <TouchableOpacity
                style={[
                  styles.pickerItem,
                  { borderBottomColor: theme.border },
                  playerOfTheMatchId === null && [
                    styles.pickerItemSelected,
                    { backgroundColor: theme.background },
                  ],
                ]}
                onPress={() => {
                  setPlayerOfTheMatchId(null);
                  setShowPotmPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    { color: theme.text },
                    playerOfTheMatchId === null &&
                      styles.pickerItemTextSelected,
                  ]}
                >
                  None
                </Text>
                {playerOfTheMatchId === null && (
                  <Ionicons name="checkmark" size={20} color="#FFD700" />
                )}
              </TouchableOpacity>
              {match?.selectedPlayerIds?.map((playerId) => {
                const player = players.find((p) => p.id === playerId);
                if (!player) return null;

                const stat = playerStats[playerId];
                const isSelected = playerOfTheMatchId === playerId;

                return (
                  <TouchableOpacity
                    key={playerId}
                    style={[
                      styles.pickerItem,
                      { borderBottomColor: theme.border },
                      isSelected && [
                        styles.pickerItemSelected,
                        { backgroundColor: theme.background },
                      ],
                    ]}
                    onPress={() => {
                      setPlayerOfTheMatchId(playerId);
                      setShowPotmPicker(false);
                    }}
                  >
                    <View style={styles.pickerItemContent}>
                      <Text
                        style={[
                          styles.pickerItemText,
                          { color: theme.text },
                          isSelected && styles.pickerItemTextSelected,
                        ]}
                      >
                        {player.name}
                      </Text>
                      {stat && (
                        <Text
                          style={[
                            styles.pickerItemStats,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {stat.goals || 0}G {stat.assists || 0}A
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color="#FFD700" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
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
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  date: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  badges: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
  },
  badgeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  opponent: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 5,
  },
  teamName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 15,
  },
  scoreSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  resultBadge: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 12,
  },
  resultText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  score: {
    fontSize: 36,
    fontWeight: "bold",
    color: COLORS.text,
  },
  notPlayedBadge: {
    backgroundColor: COLORS.gray[200],
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: "center",
    marginTop: 10,
  },
  notPlayedText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginTop: 15,
    padding: 20,
    borderRadius: 12,
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
  },
  notesText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  playerStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  potmBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  potmText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFA500",
  },
  playerStats: {
    flexDirection: "row",
    gap: 8,
  },
  statBadge: {
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  noStats: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "600",
  },
  actions: {
    padding: 15,
    gap: 10,
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  actionButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  halfWidth: {
    flex: 1,
  },
  editButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  shareButton: {
    backgroundColor: COLORS.warning,
    borderColor: COLORS.warning,
  },
  finishButton: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  deleteButton: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
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
    maxHeight: "80%",
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
    marginTop: 10,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  scoreInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  scoreInput: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
  },
  scoreSeparator: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
  },
  optionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  option: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    alignItems: "center",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  optionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
  },
  optionTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  playerStatsSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 15,
  },
  playerStatEditRow: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: COLORS.gray[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  playerStatEditName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 10,
  },
  playerStatEditInputs: {
    flexDirection: "row",
    gap: 10,
  },
  statEditGroup: {
    flex: 1,
  },
  statEditLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  statEditLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  statEditInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
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
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
  },
  dropdownButtonText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  pickerModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  pickerItemSelected: {
    backgroundColor: COLORS.gray[50],
  },
  pickerItemContent: {
    flex: 1,
  },
  pickerItemText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "500",
  },
  pickerItemTextSelected: {
    color: "#FFD700",
    fontWeight: "600",
  },
  pickerItemStats: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});

export default MatchDetailsScreen;
