import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMatches, usePlayers } from '../hooks/useResources';
import { COLORS, MATCH_TYPES, VENUE_TYPES } from '../config/constants';
import { formatDateTime, getMatchResult, getResultColor, getPlayerById } from '../utils/helpers';

const MatchDetailsScreen = ({ route, navigation }) => {
  const { matchId } = route.params;
  const { matches, loading: matchesLoading, updateMatch, removeMatch } = useMatches();
  const { players, loading: playersLoading } = usePlayers();
  
  const [match, setMatch] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  
  // Edit form state
  const [opponent, setOpponent] = useState('');
  const [goalsFor, setGoalsFor] = useState('0');
  const [goalsAgainst, setGoalsAgainst] = useState('0');
  const [venue, setVenue] = useState(VENUE_TYPES.HOME);
  const [matchType, setMatchType] = useState(MATCH_TYPES.LEAGUE);
  const [notes, setNotes] = useState('');
  const [playerStats, setPlayerStats] = useState({});

  const loading = matchesLoading || playersLoading;

  useEffect(() => {
    const foundMatch = matches.find(m => m.id === matchId);
    if (foundMatch) {
      setMatch(foundMatch);
      setOpponent(foundMatch.opponent);
      setGoalsFor(foundMatch.goalsFor.toString());
      setGoalsAgainst(foundMatch.goalsAgainst.toString());
      setVenue(foundMatch.venue);
      setMatchType(foundMatch.matchType);
      setNotes(foundMatch.notes || '');
      
      // Initialize player stats from match
      const stats = {};
      if (foundMatch.playerStats && foundMatch.playerStats.length > 0) {
        foundMatch.playerStats.forEach(stat => {
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
    setPlayerStats(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: parseInt(value) || 0,
      },
    }));
  };

  const handleSaveMatch = async () => {
    if (!opponent.trim()) {
      Alert.alert('Error', 'Please enter opponent name');
      return;
    }

    const goalsForNum = parseInt(goalsFor) || 0;
    const goalsAgainstNum = parseInt(goalsAgainst) || 0;

    // Validate that player goals don't exceed team total
    const totalPlayerGoals = Object.values(playerStats).reduce((sum, stat) => sum + (stat.goals || 0), 0);
    if (totalPlayerGoals > goalsForNum) {
      Alert.alert('Validation Error', `Total player goals (${totalPlayerGoals}) cannot exceed team goals (${goalsForNum})`);
      return;
    }

    try {
      // Prepare player stats array
      const playerStatsArray = Object.keys(playerStats).map(playerId => ({
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
      });
      setEditModalVisible(false);
      setIsEditing(false);
      Alert.alert('Success', 'Match updated successfully');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update match');
    }
  };

  const handleDeleteMatch = () => {
    Alert.alert(
      'Delete Match',
      'Are you sure you want to delete this match? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMatch(matchId);
              navigation.goBack();
              Alert.alert('Success', 'Match deleted successfully');
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete match');
            }
          },
        },
      ]
    );
  };

  const handleFinishMatch = async () => {
    Alert.alert(
      'Finish Match',
      'Mark this match as played?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: async () => {
            try {
              await updateMatch(matchId, { played: true });
              Alert.alert('Success', 'Match marked as played');
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to finish match');
            }
          },
        },
      ]
    );
  };

  if (loading || !match) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading match details...</Text>
      </View>
    );
  }

  const result = match.played ? getMatchResult(match.goalsFor, match.goalsAgainst) : null;
  const resultColor = result ? getResultColor(result) : null;

  // Get player stats for this match
  const matchPlayerStats = match.playerMatchStats || [];
  const playersWithStats = matchPlayerStats
    .map(stat => {
      const player = getPlayerById(players, stat.playerId);
      return player ? { ...player, ...stat } : null;
    })
    .filter(Boolean);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Match Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.date}>{formatDateTime(match.date)}</Text>
            <View style={styles.badges}>
              <View style={styles.badge}>
                {match.matchType === MATCH_TYPES.CUP ? (
                  <View style={styles.badgeContent}>
                    <Ionicons name="trophy" size={14} color="#FFD700" />
                    <Text style={styles.badgeText}>Cup</Text>
                  </View>
                ) : (
                  <View style={styles.badgeContent}>
                    <Ionicons name="football" size={14} color={COLORS.primary} />
                    <Text style={styles.badgeText}>League</Text>
                  </View>
                )}
              </View>
              <View style={styles.badge}>
                <View style={styles.badgeContent}>
                  <Ionicons 
                    name={match.venue === VENUE_TYPES.HOME ? "home" : "airplane"} 
                    size={14} 
                    color={COLORS.textSecondary} 
                  />
                  <Text style={styles.badgeText}>
                    {match.venue === VENUE_TYPES.HOME ? 'Home' : 'Away'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.opponent}>{match.opponent}</Text>
          
          {match.team && (
            <Text style={styles.teamName}>Team: {match.team.name}</Text>
          )}

          {match.played ? (
            <View style={styles.scoreSection}>
              <View style={[styles.resultBadge, { backgroundColor: resultColor }]}>
                <Text style={styles.resultText}>{result.toUpperCase()}</Text>
              </View>
              <Text style={styles.score}>
                {match.goalsFor} - {match.goalsAgainst}
              </Text>
            </View>
          ) : (
            <View style={styles.notPlayedBadge}>
              <Text style={styles.notPlayedText}>Scheduled</Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {match.notes && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="document-text" size={20} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Notes</Text>
            </View>
            <Text style={styles.notesText}>{match.notes}</Text>
          </View>
        )}

        {/* Player Statistics */}
        {match.played && playersWithStats.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Player Statistics</Text>
            
            {playersWithStats.map((player) => (
              <View key={player.id} style={styles.playerStatRow}>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{player.name}</Text>
                </View>
                <View style={styles.playerStats}>
                  {player.goals > 0 && (
                    <View style={styles.statBadge}>
                      <Ionicons name="football" size={14} color={COLORS.primary} />
                      <Text style={styles.statBadgeText}>{player.goals}</Text>
                    </View>
                  )}
                  {player.assists > 0 && (
                    <View style={styles.statBadge}>
                      <Ionicons name="flash" size={14} color="#FFA500" />
                      <Text style={styles.statBadgeText}>{player.assists}</Text>
                    </View>
                  )}
                  {player.goals === 0 && player.assists === 0 && (
                    <Text style={styles.noStats}>-</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Match Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Match Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date & Time</Text>
            <Text style={styles.infoValue}>{formatDateTime(match.date)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Opponent</Text>
            <Text style={styles.infoValue}>{match.opponent}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Venue</Text>
            <Text style={styles.infoValue}>
              {match.venue === VENUE_TYPES.HOME ? 'Home' : 'Away'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Match Type</Text>
            <Text style={styles.infoValue}>
              {match.matchType === MATCH_TYPES.CUP ? 'Cup' : 'League'}
            </Text>
          </View>

          {match.team && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Team</Text>
              <Text style={styles.infoValue}>{match.team.name}</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={handleEditMatch}
          >
            <View style={styles.actionButtonContent}>
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Edit Match</Text>
            </View>
          </TouchableOpacity>
          
          {!match.played && (
            <TouchableOpacity
              style={[styles.actionButton, styles.finishButton]}
              onPress={handleFinishMatch}
            >
              <View style={styles.actionButtonContent}>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={[styles.actionButtonText, { color: '#fff' }]}>Finish Match</Text>
              </View>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDeleteMatch}
          >
            <View style={styles.actionButtonContent}>
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={[styles.actionButtonText, { color: '#fff' }]}>Delete Match</Text>
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
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Edit Match</Text>
              
              <Text style={styles.label}>Opponent</Text>
              <TextInput
                style={styles.input}
                placeholder="Opponent Name"
                value={opponent}
                onChangeText={setOpponent}
              />

              <Text style={styles.label}>Score</Text>
              <View style={styles.scoreInputRow}>
                <TextInput
                  style={[styles.input, styles.scoreInput]}
                  placeholder="0"
                  value={goalsFor}
                  onChangeText={setGoalsFor}
                  keyboardType="numeric"
                />
                <Text style={styles.scoreSeparator}>-</Text>
                <TextInput
                  style={[styles.input, styles.scoreInput]}
                  placeholder="0"
                  value={goalsAgainst}
                  onChangeText={setGoalsAgainst}
                  keyboardType="numeric"
                />
              </View>

              <Text style={styles.label}>Venue</Text>
              <View style={styles.optionRow}>
                <TouchableOpacity
                  style={[styles.option, venue === VENUE_TYPES.HOME && styles.optionSelected]}
                  onPress={() => setVenue(VENUE_TYPES.HOME)}
                >
                  <View style={styles.optionContent}>
                    <Ionicons 
                      name="home" 
                      size={16} 
                      color={venue === VENUE_TYPES.HOME ? '#fff' : COLORS.textSecondary} 
                    />
                    <Text style={[styles.optionText, venue === VENUE_TYPES.HOME && styles.optionTextSelected]}>
                      Home
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.option, venue === VENUE_TYPES.AWAY && styles.optionSelected]}
                  onPress={() => setVenue(VENUE_TYPES.AWAY)}
                >
                  <View style={styles.optionContent}>
                    <Ionicons 
                      name="airplane" 
                      size={16} 
                      color={venue === VENUE_TYPES.AWAY ? '#fff' : COLORS.textSecondary} 
                    />
                    <Text style={[styles.optionText, venue === VENUE_TYPES.AWAY && styles.optionTextSelected]}>
                      Away
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Match Type</Text>
              <View style={styles.optionRow}>
                <TouchableOpacity
                  style={[styles.option, matchType === MATCH_TYPES.LEAGUE && styles.optionSelected]}
                  onPress={() => setMatchType(MATCH_TYPES.LEAGUE)}
                >
                  <View style={styles.optionContent}>
                    <Ionicons 
                      name="football" 
                      size={16} 
                      color={matchType === MATCH_TYPES.LEAGUE ? '#fff' : COLORS.primary} 
                    />
                    <Text style={[styles.optionText, matchType === MATCH_TYPES.LEAGUE && styles.optionTextSelected]}>
                      League
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.option, matchType === MATCH_TYPES.CUP && styles.optionSelected]}
                  onPress={() => setMatchType(MATCH_TYPES.CUP)}
                >
                  <View style={styles.optionContent}>
                    <Ionicons 
                      name="trophy" 
                      size={16} 
                      color={matchType === MATCH_TYPES.CUP ? '#fff' : '#FFD700'} 
                    />
                    <Text style={[styles.optionText, matchType === MATCH_TYPES.CUP && styles.optionTextSelected]}>
                      Cup
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add notes about the match..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
              />

              {/* Player Stats Section */}
              {match?.selectedPlayerIds && match.selectedPlayerIds.length > 0 && (
                <View style={styles.playerStatsSection}>
                  <Text style={styles.label}>Player Stats</Text>
                  <Text style={styles.helperText}>Update individual goals and assists for each player</Text>
                  {match.selectedPlayerIds.map(playerId => {
                    const player = players.find(p => p.id === playerId);
                    if (!player) return null;
                    
                    return (
                      <View key={playerId} style={styles.playerStatEditRow}>
                        <Text style={styles.playerStatEditName}>{player.name}</Text>
                        <View style={styles.playerStatEditInputs}>
                          <View style={styles.statEditGroup}>
                            <View style={styles.statEditLabelRow}>
                              <Ionicons name="football" size={14} color={COLORS.primary} />
                              <Text style={styles.statEditLabel}>Goals</Text>
                            </View>
                            <TextInput
                              style={styles.statEditInput}
                              value={(playerStats[playerId]?.goals || 0).toString()}
                              onChangeText={(value) => updatePlayerStat(playerId, 'goals', value)}
                              keyboardType="numeric"
                              placeholder="0"
                            />
                          </View>
                          <View style={styles.statEditGroup}>
                            <View style={styles.statEditLabelRow}>
                              <Ionicons name="flash" size={14} color="#FFA500" />
                              <Text style={styles.statEditLabel}>Assists</Text>
                            </View>
                            <TextInput
                              style={styles.statEditInput}
                              value={(playerStats[playerId]?.assists || 0).toString()}
                              onChangeText={(value) => updatePlayerStat(playerId, 'assists', value)}
                              keyboardType="numeric"
                              placeholder="0"
                            />
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveMatch}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#fff',
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  date: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  opponent: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  teamName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 15,
  },
  scoreSection: {
    alignItems: 'center',
    marginTop: 10,
  },
  resultBadge: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 10,
  },
  resultText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  score: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  notPlayedBadge: {
    backgroundColor: COLORS.gray[200],
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'center',
    marginTop: 10,
  },
  notPlayedText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  notesText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  playerStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  playerStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statBadge: {
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noStats: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  actions: {
    padding: 15,
    gap: 10,
    marginBottom: 20,
  },
  actionButton: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
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
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
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
    textAlignVertical: 'top',
  },
  scoreInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scoreInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scoreSeparator: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  option: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    alignItems: 'center',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '600',
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
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  playerStatEditInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  statEditGroup: {
    flex: 1,
  },
  statEditLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  statEditLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  statEditInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.warning,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.success,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MatchDetailsScreen;
