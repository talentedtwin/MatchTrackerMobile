import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTeams } from '../hooks/useResources';
import { COLORS } from '../config/constants';

const AddTeamScreen = ({ navigation, route }) => {
  const { addTeam, updateTeam } = useTeams();
  const editingTeam = route.params?.team;
  const isEditing = !!editingTeam;

  const [teamName, setTeamName] = useState(editingTeam?.name || '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!teamName.trim()) {
      newErrors.teamName = 'Team name is required';
    } else if (teamName.trim().length < 2) {
      newErrors.teamName = 'Team name must be at least 2 characters';
    } else if (teamName.trim().length > 50) {
      newErrors.teamName = 'Team name must be less than 50 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const teamData = {
        name: teamName.trim(),
      };

      if (isEditing) {
        await updateTeam(editingTeam.id, teamData);
        Alert.alert('Success', 'Team updated successfully');
      } else {
        await addTeam(teamData);
        Alert.alert('Success', 'Team added successfully');
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error saving team:', error);
      Alert.alert('Error', error.message || 'Failed to save team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team Information</Text>

          {/* Team Name */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Ionicons name="people" size={18} color={COLORS.primary} />
              <Text style={styles.label}>Team Name</Text>
            </View>
            <TextInput
              style={[styles.input, errors.teamName && styles.inputError]}
              placeholder="Enter team name"
              value={teamName}
              onChangeText={(text) => {
                setTeamName(text);
                if (errors.teamName) {
                  setErrors({ ...errors, teamName: null });
                }
              }}
              maxLength={50}
            />
            {errors.teamName && (
              <View style={styles.errorRow}>
                <Ionicons name="warning" size={14} color={COLORS.error} />
                <Text style={styles.errorText}>{errors.teamName}</Text>
              </View>
            )}
            <Text style={styles.helperText}>
              Give your team a memorable name
            </Text>
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>About Teams</Text>
            <Text style={styles.infoText}>
              Teams help you organize your players and track matches for different squads. 
              You can assign players to teams and filter matches by team.
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons 
                name={isEditing ? "checkmark-circle" : "add-circle"} 
                size={20} 
                color="#fff" 
              />
              <Text style={styles.submitButtonText}>
                {isEditing ? 'Update Team' : 'Create Team'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoIconContainer: {
    marginRight: 10,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#1565c0',
    lineHeight: 18,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 30,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddTeamScreen;
