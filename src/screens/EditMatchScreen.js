import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { usePlayers } from '../hooks/useResources';
import { useTeamContext } from '../contexts/TeamContext';
import { matchApi } from '../services/api';
import { COLORS, FONTS } from '../config/constants';

const EditMatchScreen = ({ route, navigation }) => {
  const { matchId, match } = route.params;
  const { selectedTeamId } = useTeamContext();
  const { players, loading: playersLoading } = usePlayers(selectedTeamId);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    opponent: '',
    date: new Date(),
    matchType: 'league',
    venue: 'home',
    notes: '',
    selectedPlayerIds: [],
  });

  // Date/Time picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Initialize form data from match
  useEffect(() => {
    if (match) {
      setFormData({
        opponent: match.opponent || '',
        date: match.date ? new Date(match.date) : new Date(),
        matchType: match.matchType || 'league',
        venue: match.venue || 'home',
        notes: match.notes || '',
        selectedPlayerIds: match.selectedPlayerIds || [],
      });
    }
  }, [match]);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFormData((prev) => ({ ...prev, date: selectedDate }));
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const newDate = new Date(formData.date);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setFormData((prev) => ({ ...prev, date: newDate }));
    }
  };

  const togglePlayerSelection = (playerId) => {
    setFormData((prev) => ({
      ...prev,
      selectedPlayerIds: prev.selectedPlayerIds.includes(playerId)
        ? prev.selectedPlayerIds.filter((id) => id !== playerId)
        : [...prev.selectedPlayerIds, playerId],
    }));
  };

  const validateForm = () => {
    if (!formData.opponent.trim()) {
      Alert.alert('Validation Error', 'Please enter an opponent team name');
      return false;
    }

    if (formData.selectedPlayerIds.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one player');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      // Determine teamId from selected players
      let teamId = null;
      if (formData.selectedPlayerIds.length > 0) {
        const teamCounts = {};
        formData.selectedPlayerIds.forEach(playerId => {
          const player = players.find(p => p.id === playerId);
          if (player?.teamId) {
            teamCounts[player.teamId] = (teamCounts[player.teamId] || 0) + 1;
          }
        });
        
        // Get the teamId with the most players
        if (Object.keys(teamCounts).length > 0) {
          teamId = Object.keys(teamCounts).reduce((a, b) => 
            teamCounts[a] > teamCounts[b] ? a : b
          );
        }
      }

      const updatePayload = {
        opponent: formData.opponent.trim(),
        date: formData.date.toISOString(),
        matchType: formData.matchType,
        venue: formData.venue,
        notes: formData.notes.trim() || undefined,
        selectedPlayerIds: formData.selectedPlayerIds,
        teamId: teamId || undefined,
      };

      // If match is finished, ensure all selected players have stats entries
      if (match.isFinished) {
        const existingStats = match.playerStats || [];
        const playerStatsArray = formData.selectedPlayerIds.map(playerId => {
          // Find existing stats for this player
          const existingStat = existingStats.find(stat => stat.playerId === playerId);
          
          return {
            playerId,
            goals: existingStat?.goals || 0,
            assists: existingStat?.assists || 0,
            minutesPlayed: existingStat?.minutesPlayed || 0,
            playingPeriods: existingStat?.playingPeriods || [],
          };
        });
        
        updatePayload.playerStats = playerStatsArray;
      }

      //console.log('EditMatchScreen - Sending update payload:', JSON.stringify(updatePayload, null, 2));
      //console.log('EditMatchScreen - selectedPlayerIds:', updatePayload.selectedPlayerIds);

      await matchApi.update(matchId, updatePayload);

      Alert.alert('Success', 'Match updated successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Failed to update match:', error);
      Alert.alert('Error', 'Failed to update match. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (playersLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Edit Scheduled Match</Text>
            <Text style={styles.headerSubtitle}>Update match details</Text>
          </View>

          {/* Opponent */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Ionicons name="trophy" size={18} color="#FFD700" />
              <Text style={styles.label}>Opponent Team</Text>
            </View>
            <TextInput
              style={styles.input}
              value={formData.opponent}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, opponent: text }))
              }
              placeholder="Enter opponent team name"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          {/* Date and Time */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Ionicons name="calendar" size={18} color={COLORS.primary} />
              <Text style={styles.label}>Match Date & Time</Text>
            </View>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateTimeText}>{formatDate(formData.date)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.dateTimeText}>{formatTime(formData.date)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={formData.date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={formData.date}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
          )}

          {/* Match Type */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Ionicons name="football" size={18} color={COLORS.primary} />
              <Text style={styles.label}>Match Type</Text>
            </View>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() =>
                  setFormData((prev) => ({ ...prev, matchType: 'league' }))
                }
              >
                <View
                  style={[
                    styles.radioCircle,
                    formData.matchType === 'league' && styles.radioCircleSelected,
                  ]}
                >
                  {formData.matchType === 'league' && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.radioLabel}>League Match</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() =>
                  setFormData((prev) => ({ ...prev, matchType: 'cup' }))
                }
              >
                <View
                  style={[
                    styles.radioCircle,
                    formData.matchType === 'cup' && styles.radioCircleSelected,
                  ]}
                >
                  {formData.matchType === 'cup' && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.radioLabel}>Cup Match</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() =>
                  setFormData((prev) => ({ ...prev, matchType: 'friendly' }))
                }
              >
                <View
                  style={[
                    styles.radioCircle,
                    formData.matchType === 'friendly' && styles.radioCircleSelected,
                  ]}
                >
                  {formData.matchType === 'friendly' && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.radioLabel}>Friendly Match</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Venue */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Ionicons name="location" size={18} color={COLORS.primary} />
              <Text style={styles.label}>Venue</Text>
            </View>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() =>
                  setFormData((prev) => ({ ...prev, venue: 'home' }))
                }
              >
                <View
                  style={[
                    styles.radioCircle,
                    formData.venue === 'home' && styles.radioCircleSelected,
                  ]}
                >
                  {formData.venue === 'home' && <View style={styles.radioDot} />}
                </View>
                <Ionicons name="home" size={16} color={COLORS.textSecondary} />
                <Text style={styles.radioLabel}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() =>
                  setFormData((prev) => ({ ...prev, venue: 'away' }))
                }
              >
                <View
                  style={[
                    styles.radioCircle,
                    formData.venue === 'away' && styles.radioCircleSelected,
                  ]}
                >
                  {formData.venue === 'away' && <View style={styles.radioDot} />}
                </View>
                <Ionicons name="airplane" size={16} color={COLORS.textSecondary} />
                <Text style={styles.radioLabel}>Away</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Player Selection */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Ionicons name="people" size={18} color={COLORS.primary} />
              <Text style={styles.label}>
                Select Squad ({formData.selectedPlayerIds.length} players)
              </Text>
            </View>
            {players.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No players available. Add players first.
                </Text>
              </View>
            ) : (
              <View style={styles.playerListContainer}>
                <ScrollView 
                  style={styles.playerList}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                >
                  {players.map((player) => (
                    <TouchableOpacity
                      key={player.id}
                      style={styles.playerItem}
                      onPress={() => togglePlayerSelection(player.id)}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          formData.selectedPlayerIds.includes(player.id) &&
                            styles.checkboxSelected,
                        ]}
                      >
                        {formData.selectedPlayerIds.includes(player.id) && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </View>
                      <Text style={styles.playerName}>{player.name}</Text>
                      <Text style={styles.playerStats}>
                        {player.goals || 0}G {player.assists || 0}A
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Ionicons name="document-text" size={18} color={COLORS.primary} />
              <Text style={styles.label}>Match Notes (Optional)</Text>
            </View>
            <TextInput
              style={styles.textArea}
              value={formData.notes}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, notes: text }))
              }
              placeholder="Add any notes about this match..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={saving}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Update Match</Text>
          )}
        </TouchableOpacity>
      </View>
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
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: FONTS.heading,
    color: COLORS.text,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: FONTS.body,
    color: COLORS.text,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: COLORS.text,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: FONTS.body,
    color: COLORS.text,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  dateTimeText: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.text,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: COLORS.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  radioLabel: {
    fontSize: 16,
    fontFamily: FONTS.body,
    color: COLORS.text,
  },
  playerListContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    maxHeight: 300,
  },
  playerList: {
    padding: 12,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
  },
  playerName: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.body,
    color: COLORS.text,
  },
  playerStats: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginLeft: 8,
    minWidth: 60,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: FONTS.body,
    color: COLORS.text,
    minHeight: 100,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.warning ,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: '#fff',
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.success,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: '#fff',
  },
});

export default EditMatchScreen;
