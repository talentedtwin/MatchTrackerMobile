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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { usePlayers } from '../hooks/useResources';
import { matchApi } from '../services/api';
import { COLORS, FONTS, MATCH_TYPES, VENUE_TYPES } from '../config/constants';

const AddMatchScreen = ({ navigation }) => {
  const { players, loading: playersLoading } = usePlayers();
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    opponent: '',
    date: new Date(),
    matchType: MATCH_TYPES.LEAGUE,
    venue: VENUE_TYPES.HOME,
    notes: '',
    selectedPlayerIds: [],
    isFinished: false,
    goalsFor: '',
    goalsAgainst: '',
  });

  const [playerStats, setPlayerStats] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [errors, setErrors] = useState([]);

  const togglePlayerSelection = (playerId) => {
    setFormData(prev => {
      const newSelectedPlayerIds = prev.selectedPlayerIds.includes(playerId)
        ? prev.selectedPlayerIds.filter(id => id !== playerId)
        : [...prev.selectedPlayerIds, playerId];
      
      // Reset player stats if deselected
      if (!newSelectedPlayerIds.includes(playerId)) {
        const newPlayerStats = { ...playerStats };
        delete newPlayerStats[playerId];
        setPlayerStats(newPlayerStats);
      }
      
      return {
        ...prev,
        selectedPlayerIds: newSelectedPlayerIds,
      };
    });
  };

  const updatePlayerStats = (playerId, field, value) => {
    setPlayerStats(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: value,
      },
    }));
  };

  const selectAllPlayers = () => {
    setFormData(prev => ({
      ...prev,
      selectedPlayerIds: players.map(p => p.id),
    }));
    // Initialize stats for all players
    const newStats = {};
    players.forEach(player => {
      newStats[player.id] = { goals: 0, assists: 0 };
    });
    setPlayerStats(newStats);
  };

  const clearSelection = () => {
    setFormData(prev => ({
      ...prev,
      selectedPlayerIds: [],
    }));
    setPlayerStats({});
  };

  const validateForm = () => {
    const validationErrors = [];

    if (!formData.opponent.trim()) {
      validationErrors.push('Please enter an opponent team name');
    }

    if (players.length === 0) {
      validationErrors.push('Please add at least one player to your squad before adding a match');
    }

    if (formData.selectedPlayerIds.length === 0) {
      validationErrors.push('Please select at least one player for this match');
    }

    // Check if date is in the future for scheduled matches
    if (formData.date < new Date() && !formData.isFinished) {
      validationErrors.push('Match date must be in the future for scheduled matches');
    }

    // Validate goals for finished matches
    if (formData.isFinished) {
      if (formData.goalsFor === '' || formData.goalsFor < 0) {
        validationErrors.push('Please enter valid goals scored (0 or more)');
      }
      if (formData.goalsAgainst === '' || formData.goalsAgainst < 0) {
        validationErrors.push('Please enter valid goals conceded (0 or more)');
      }

      // Validate player goals don't exceed team total
      if (formData.selectedPlayerIds.length > 0 && formData.goalsFor !== '') {
        const totalPlayerGoals = formData.selectedPlayerIds.reduce((total, playerId) => {
          return total + (playerStats[playerId]?.goals || 0);
        }, 0);

        if (totalPlayerGoals > Number(formData.goalsFor)) {
          validationErrors.push(
            `Total player goals (${totalPlayerGoals}) cannot exceed team goals (${formData.goalsFor})`
          );
        }
      }
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const playerStatsArray = formData.isFinished
        ? formData.selectedPlayerIds.map(playerId => ({
            playerId,
            goals: playerStats[playerId]?.goals || 0,
            assists: playerStats[playerId]?.assists || 0,
          }))
        : undefined;

      await matchApi.create({
        opponent: formData.opponent.trim(),
        date: formData.date.toISOString(),
        matchType: formData.matchType,
        venue: formData.venue,
        notes: formData.notes.trim() || undefined,
        selectedPlayerIds: formData.selectedPlayerIds,
        isFinished: formData.isFinished,
        goalsFor: formData.isFinished ? Number(formData.goalsFor) : 0,
        goalsAgainst: formData.isFinished ? Number(formData.goalsAgainst) : 0,
        playerStats: playerStatsArray,
      });

      Alert.alert(
        'Success',
        formData.isFinished ? 'Historic match added successfully' : 'Match scheduled successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Failed to add match:', error);
      Alert.alert('Error', 'Failed to add match. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        date: selectedDate,
      }));
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const newDate = new Date(formData.date);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setFormData(prev => ({
        ...prev,
        date: newDate,
      }));
    }
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Match</Text>
        <Text style={styles.subtitle}>Schedule a new match or add a historic match</Text>
      </View>

      {/* Error Messages */}
      {errors.length > 0 && (
        <View style={styles.errorContainer}>
          <View style={styles.errorTitleRow}>
            <Ionicons name="warning" size={20} color={COLORS.error} />
            <Text style={styles.errorTitle}>Please fix the following issues:</Text>
          </View>
          {errors.map((error, index) => (
            <Text key={index} style={styles.errorText}>• {error}</Text>
          ))}
        </View>
      )}

      <View style={styles.form}>
        {/* Opponent Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Opponent Team *</Text>
          <TextInput
            style={styles.input}
            value={formData.opponent}
            onChangeText={(text) => setFormData(prev => ({ ...prev, opponent: text }))}
            placeholder="Enter opponent team name"
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>

        {/* Date and Time */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Match Date & Time *</Text>
          <View style={styles.dateTimeContainer}>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar" size={16} color={COLORS.primary} />
              <Text style={styles.dateTimeText}>
                {formData.date.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time" size={16} color={COLORS.primary} />
              <Text style={styles.dateTimeText}>
                {formData.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={formData.date}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={formData.date}
            mode="time"
            display="default"
            onChange={onTimeChange}
          />
        )}

        {/* Match Type */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Match Type</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setFormData(prev => ({ ...prev, matchType: MATCH_TYPES.LEAGUE }))}
            >
              <View style={[styles.radio, formData.matchType === MATCH_TYPES.LEAGUE && styles.radioSelected]}>
                {formData.matchType === MATCH_TYPES.LEAGUE && <View style={styles.radioDot} />}
              </View>
              <Ionicons name="football" size={16} color={COLORS.primary} />
              <Text style={styles.radioLabel}>League</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setFormData(prev => ({ ...prev, matchType: MATCH_TYPES.CUP }))}
            >
              <View style={[styles.radio, formData.matchType === MATCH_TYPES.CUP && styles.radioSelected]}>
                {formData.matchType === MATCH_TYPES.CUP && <View style={styles.radioDot} />}
              </View>
              <Ionicons name="trophy" size={16} color="#FFD700" />
              <Text style={styles.radioLabel}>Cup</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Venue */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Venue</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setFormData(prev => ({ ...prev, venue: VENUE_TYPES.HOME }))}
            >
              <View style={[styles.radio, formData.venue === VENUE_TYPES.HOME && styles.radioSelected]}>
                {formData.venue === VENUE_TYPES.HOME && <View style={styles.radioDot} />}
              </View>
              <Ionicons name="home" size={16} color={COLORS.textSecondary} />
              <Text style={styles.radioLabel}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setFormData(prev => ({ ...prev, venue: VENUE_TYPES.AWAY }))}
            >
              <View style={[styles.radio, formData.venue === VENUE_TYPES.AWAY && styles.radioSelected]}>
                {formData.venue === VENUE_TYPES.AWAY && <View style={styles.radioDot} />}
              </View>
              <Ionicons name="airplane" size={16} color={COLORS.textSecondary} />
              <Text style={styles.radioLabel}>Away</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Match Status */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Match Status</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setFormData(prev => ({ ...prev, isFinished: false, goalsFor: '', goalsAgainst: '' }))}
            >
              <View style={[styles.radio, !formData.isFinished && styles.radioSelected]}>
                {!formData.isFinished && <View style={styles.radioDot} />}
              </View>
              <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
              <Text style={styles.radioLabel}>Scheduled</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setFormData(prev => ({ ...prev, isFinished: true }))}
            >
              <View style={[styles.radio, formData.isFinished && styles.radioSelected]}>
                {formData.isFinished && <View style={styles.radioDot} />}
              </View>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.radioLabel}>Finished</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Goals (only for finished matches) */}
        {formData.isFinished && (
          <View style={styles.goalsContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Goals Scored *</Text>
              <TextInput
                style={styles.input}
                value={formData.goalsFor.toString()}
                onChangeText={(text) => setFormData(prev => ({ ...prev, goalsFor: text === '' ? '' : Number(text) }))}
                placeholder="0"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Goals Conceded *</Text>
              <TextInput
                style={styles.input}
                value={formData.goalsAgainst.toString()}
                onChangeText={(text) => setFormData(prev => ({ ...prev, goalsAgainst: text === '' ? '' : Number(text) }))}
                placeholder="0"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>
        )}

        {/* Notes */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Match Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
            placeholder="Add any notes about this match..."
            placeholderTextColor={COLORS.textSecondary}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Player Selection */}
        {players.length > 0 && (
          <View style={styles.formGroup}>
            <View style={styles.playerSelectionHeader}>
              <Text style={styles.label}>Select Players for Match *</Text>
              <View style={styles.playerActions}>
                <TouchableOpacity onPress={selectAllPlayers}>
                  <Text style={styles.linkText}>Select All</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={clearSelection}>
                  <Text style={styles.linkText}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView style={styles.playerList} nestedScrollEnabled>
              {players.map((player) => (
                <TouchableOpacity
                  key={player.id}
                  style={styles.playerItem}
                  onPress={() => togglePlayerSelection(player.id)}
                >
                  <View style={styles.checkbox}>
                    {formData.selectedPlayerIds.includes(player.id) && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <Text style={styles.playerStats}>
                    {player.goals || 0}G {player.assists || 0}A
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {formData.selectedPlayerIds.length > 0 && (
              <Text style={styles.selectedCount}>
                {formData.selectedPlayerIds.length} player{formData.selectedPlayerIds.length !== 1 ? 's' : ''} selected
              </Text>
            )}
          </View>
        )}

        {/* Player Stats (only for finished matches with selected players) */}
        {formData.isFinished && formData.selectedPlayerIds.length > 0 && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Player Stats (Optional)</Text>
            <Text style={styles.helperText}>Add individual goals and assists for each player</Text>
            <View style={styles.playerStatsList}>
              {formData.selectedPlayerIds.map(playerId => {
                const player = players.find(p => p.id === playerId);
                if (!player) return null;
                
                return (
                  <View key={playerId} style={styles.playerStatItem}>
                    <Text style={styles.playerStatName}>{player.name}</Text>
                    <View style={styles.playerStatInputs}>
                      <View style={styles.statInputGroup}>
                        <Text style={styles.statInputLabel}>Goals</Text>
                        <TextInput
                          style={styles.statInput}
                          value={(playerStats[playerId]?.goals || 0).toString()}
                          onChangeText={(text) => updatePlayerStats(playerId, 'goals', Number(text) || 0)}
                          keyboardType="numeric"
                          placeholder="0"
                        />
                      </View>
                      <View style={styles.statInputGroup}>
                        <Text style={styles.statInputLabel}>Assists</Text>
                        <TextInput
                          style={styles.statInput}
                          value={(playerStats[playerId]?.assists || 0).toString()}
                          onChangeText={(text) => updatePlayerStats(playerId, 'assists', Number(text) || 0)}
                          keyboardType="numeric"
                          placeholder="0"
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonTextSecondary}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.buttonContent}>
                <Ionicons 
                  name={formData.isFinished ? "checkmark-circle" : "calendar"} 
                  size={20} 
                  color="#fff" 
                />
                <Text style={styles.buttonTextPrimary}>
                  {formData.isFinished ? 'Add Historic Match' : 'Schedule Match'}
                </Text>
              </View>
            )}
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  errorContainer: {
    margin: 15,
    padding: 15,
    backgroundColor: '#fee',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  errorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    marginTop: 4,
  },
  form: {
    padding: 15,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  dateTimeButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dateTimeText: {
    fontSize: 15,
    color: COLORS.text,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 15,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.gray[400],
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: COLORS.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  radioLabel: {
    fontSize: 15,
    color: COLORS.text,
  },
  goalsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  playerSelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  playerActions: {
    flexDirection: 'row',
    gap: 15,
  },
  linkText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  playerList: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    padding: 5,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: COLORS.gray[400],
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  playerName: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  playerStats: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  selectedCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  playerStatsList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    padding: 10,
  },
  playerStatItem: {
    marginBottom: 15,
  },
  playerStatName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  playerStatInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  statInputGroup: {
    flex: 1,
  },
  statInputLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statInput: {
    backgroundColor: COLORS.gray[100],
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: COLORS.text,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    marginBottom: 30,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: COLORS.success,
  },
  buttonSecondary: {
    backgroundColor: COLORS.warning,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddMatchScreen;
