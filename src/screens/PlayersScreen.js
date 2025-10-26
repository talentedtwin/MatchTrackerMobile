import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayers, useTeams } from '../hooks/useResources';
import { COLORS } from '../config/constants';

const PlayersScreen = ({ navigation }) => {
  const { players, loading: playersLoading, addPlayer, updatePlayer, removePlayer, refetch: refetchPlayers } = usePlayers();
  const { teams, loading: teamsLoading, addTeam, updateTeam, removeTeam, refetch: refetchTeams } = useTeams();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [teamModalVisible, setTeamModalVisible] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('teams'); // 'teams' or 'players'

  const loading = playersLoading || teamsLoading;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchPlayers(), refetchTeams()]);
    setRefreshing(false);
  };

  // Team Management
  const handleAddTeam = async () => {
    if (!teamName.trim()) {
      Alert.alert('Error', 'Please enter a team name');
      return;
    }

    try {
      await addTeam({ name: teamName });
      setTeamName('');
      setTeamModalVisible(false);
      Alert.alert('Success', 'Team added successfully');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to add team');
    }
  };

  const handleEditTeam = (team) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamModalVisible(true);
  };

  const handleUpdateTeam = async () => {
    if (!teamName.trim()) {
      Alert.alert('Error', 'Please enter a team name');
      return;
    }

    try {
      await updateTeam(editingTeam.id, { name: teamName });
      setEditingTeam(null);
      setTeamName('');
      setTeamModalVisible(false);
      Alert.alert('Success', 'Team updated successfully');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update team');
    }
  };

  const handleDeleteTeam = (teamId) => {
    Alert.alert(
      'Delete Team',
      'Are you sure you want to delete this team?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeTeam(teamId);
              Alert.alert('Success', 'Team deleted successfully');
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete team');
            }
          },
        },
      ]
    );
  };

  // Player Management
  const handleAddPlayer = async () => {
    if (!playerName.trim()) {
      Alert.alert('Error', 'Please enter a player name');
      return;
    }

    try {
      await addPlayer({ 
        name: playerName, 
        teamId: selectedTeamId || undefined 
      });
      setPlayerName('');
      setSelectedTeamId('');
      setModalVisible(false);
      Alert.alert('Success', 'Player added successfully');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to add player');
    }
  };

  const handleEditPlayer = (player) => {
    setEditingPlayer(player);
    setPlayerName(player.name);
    setSelectedTeamId(player.teamId || '');
    setModalVisible(true);
  };

  const handleUpdatePlayer = async () => {
    if (!playerName.trim()) {
      Alert.alert('Error', 'Please enter a player name');
      return;
    }

    try {
      await updatePlayer(editingPlayer.id, { 
        name: playerName,
        teamId: selectedTeamId || null
      });
      setEditingPlayer(null);
      setPlayerName('');
      setSelectedTeamId('');
      setModalVisible(false);
      Alert.alert('Success', 'Player updated successfully');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update player');
    }
  };

  const handleDeletePlayer = (playerId) => {
    Alert.alert(
      'Delete Player',
      'Are you sure you want to delete this player?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removePlayer(playerId);
              Alert.alert('Success', 'Player deleted successfully');
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete player');
            }
          },
        },
      ]
    );
  };

  const getPlayersByTeam = (teamId) => {
    return players.filter(p => p.teamId === teamId);
  };

  const unassignedPlayers = players.filter(p => !p.teamId);

  if (loading && players.length === 0 && teams.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'teams' && styles.activeTab]}
          onPress={() => setActiveTab('teams')}
        >
          <Text style={[styles.tabText, activeTab === 'teams' && styles.activeTabText]}>
            Teams
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'players' && styles.activeTab]}
          onPress={() => setActiveTab('players')}
        >
          <Text style={[styles.tabText, activeTab === 'players' && styles.activeTabText]}>
            Players
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'teams' ? (
          // Teams Tab
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Teams</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('AddTeam')}
              >
                <Text style={styles.addButtonText}>+ Add Team</Text>
              </TouchableOpacity>
            </View>

            {teams.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No teams yet</Text>
                <Text style={styles.emptySubtext}>Create your first team to get started</Text>
              </View>
            ) : (
              teams.map((team) => {
                const teamPlayers = getPlayersByTeam(team.id);
                return (
                  <View key={team.id} style={styles.teamCard}>
                    <View style={styles.teamHeader}>
                      <View style={styles.teamInfo}>
                        <Text style={styles.teamName}>{team.name}</Text>
                        <Text style={styles.teamPlayerCount}>
                          {teamPlayers.length} player{teamPlayers.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => navigation.navigate('AddTeam', { team })}
                        >
                          <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => handleDeleteTeam(team.id)}
                        >
                          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    {teamPlayers.length > 0 && (
                      <View style={styles.playersList}>
                        {teamPlayers.map((player) => (
                          <View key={player.id} style={styles.playerChip}>
                            <Text style={styles.playerChipText}>
                              {player.name} ({player.goals}G {player.assists}A)
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        ) : (
          // Players Tab
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>All Players</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  setEditingPlayer(null);
                  setPlayerName('');
                  setSelectedTeamId('');
                  setModalVisible(true);
                }}
              >
                <Text style={styles.addButtonText}>+ Add Player</Text>
              </TouchableOpacity>
            </View>

            {/* Unassigned Players */}
            {unassignedPlayers.length > 0 && (
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Unassigned Players</Text>
                {unassignedPlayers.map((player) => (
                  <View key={player.id} style={styles.playerCard}>
                    <View style={styles.playerInfo}>
                      <Text style={styles.playerName}>{player.name}</Text>
                      <View style={styles.playerStatsRow}>
                        <View style={styles.statItem}>
                          <Ionicons name="football" size={14} color={COLORS.primary} />
                          <Text style={styles.playerStats}>{player.goals} goals</Text>
                        </View>
                        <Text style={styles.statDivider}>•</Text>
                        <View style={styles.statItem}>
                          <Ionicons name="flash" size={14} color="#FFA500" />
                          <Text style={styles.playerStats}>{player.assists} assists</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => handleEditPlayer(player)}
                      >
                        <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => handleDeletePlayer(player.id)}
                      >
                        <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Players by Team */}
            {teams.map((team) => {
              const teamPlayers = getPlayersByTeam(team.id);
              if (teamPlayers.length === 0) return null;
              
              return (
                <View key={team.id} style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>{team.name}</Text>
                  {teamPlayers.map((player) => (
                    <View key={player.id} style={styles.playerCard}>
                      <View style={styles.playerInfo}>
                        <Text style={styles.playerName}>{player.name}</Text>
                        <View style={styles.playerStatsRow}>
                          <View style={styles.statItem}>
                            <Ionicons name="football" size={14} color={COLORS.primary} />
                            <Text style={styles.playerStats}>{player.goals} goals</Text>
                          </View>
                          <Text style={styles.statDivider}>•</Text>
                          <View style={styles.statItem}>
                            <Ionicons name="flash" size={14} color="#FFA500" />
                            <Text style={styles.playerStats}>{player.assists} assists</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => handleEditPlayer(player)}
                        >
                          <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => handleDeletePlayer(player.id)}
                        >
                          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}

            {players.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No players yet</Text>
                <Text style={styles.emptySubtext}>Add your first player to get started</Text>
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingPlayer ? 'Edit Player' : 'Add Player'}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Player Name"
              value={playerName}
              onChangeText={setPlayerName}
            />

            <Text style={styles.label}>Assign to Team (Optional)</Text>
            <View style={styles.teamSelector}>
              <TouchableOpacity
                style={[styles.teamOption, !selectedTeamId && styles.teamOptionSelected]}
                onPress={() => setSelectedTeamId('')}
              >
                <Text style={[styles.teamOptionText, !selectedTeamId && styles.teamOptionTextSelected]}>
                  No Team
                </Text>
              </TouchableOpacity>
              {teams.map((team) => (
                <TouchableOpacity
                  key={team.id}
                  style={[styles.teamOption, selectedTeamId === team.id && styles.teamOptionSelected]}
                  onPress={() => setSelectedTeamId(team.id)}
                >
                  <Text style={[styles.teamOptionText, selectedTeamId === team.id && styles.teamOptionTextSelected]}>
                    {team.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setEditingPlayer(null);
                  setPlayerName('');
                  setSelectedTeamId('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={editingPlayer ? handleUpdatePlayer : handleAddPlayer}
              >
                <Text style={styles.saveButtonText}>
                  {editingPlayer ? 'Update' : 'Add'}
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingTeam ? 'Edit Team' : 'Add Team'}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Team Name"
              value={teamName}
              onChangeText={setTeamName}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setTeamModalVisible(false);
                  setEditingTeam(null);
                  setTeamName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={editingTeam ? handleUpdateTeam : handleAddTeam}
              >
                <Text style={styles.saveButtonText}>
                  {editingTeam ? 'Update' : 'Add'}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subsection: {
    marginBottom: 20,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
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
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  teamCard: {
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
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  teamPlayerCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  playersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  playerStats: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  playerStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
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
    maxWidth: 400,
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
    color: '#fff',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
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

export default PlayersScreen;
