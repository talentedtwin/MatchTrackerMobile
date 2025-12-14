import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS } from "../config/constants";

const TeamSelector = ({ teams, selectedTeamId, onSelectTeam }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  const handleSelectTeam = (teamId) => {
    onSelectTeam(teamId);
    setModalVisible(false);
  };

  // Don't show selector if only one team or no teams
  if (teams.length <= 1) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.selectorContent}>
          <Ionicons name="people" size={20} color={COLORS.primary} />
          <Text style={styles.selectorText}>
            {selectedTeam ? selectedTeam.name : "All Teams"}
          </Text>
          <Ionicons
            name="chevron-down"
            size={20}
            color={COLORS.textSecondary}
          />
        </View>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Team</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.teamList}>
              {/* All Teams Option */}
              <TouchableOpacity
                style={[
                  styles.teamOption,
                  !selectedTeamId && styles.teamOptionSelected,
                ]}
                onPress={() => handleSelectTeam(null)}
              >
                <View style={styles.teamOptionContent}>
                  <Ionicons
                    name="albums"
                    size={24}
                    color={
                      !selectedTeamId ? COLORS.primary : COLORS.textSecondary
                    }
                  />
                  <View style={styles.teamInfo}>
                    <Text
                      style={[
                        styles.teamName,
                        !selectedTeamId && styles.teamNameSelected,
                      ]}
                    >
                      All Teams
                    </Text>
                    <Text style={styles.teamDescription}>
                      View data from all your teams
                    </Text>
                  </View>
                </View>
                {!selectedTeamId && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={COLORS.primary}
                  />
                )}
              </TouchableOpacity>

              {/* Individual Teams */}
              {teams.map((team) => (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.teamOption,
                    selectedTeamId === team.id && styles.teamOptionSelected,
                  ]}
                  onPress={() => handleSelectTeam(team.id)}
                >
                  <View style={styles.teamOptionContent}>
                    <Ionicons
                      name="people"
                      size={24}
                      color={
                        selectedTeamId === team.id
                          ? COLORS.primary
                          : COLORS.textSecondary
                      }
                    />
                    <View style={styles.teamInfo}>
                      <Text
                        style={[
                          styles.teamName,
                          selectedTeamId === team.id && styles.teamNameSelected,
                        ]}
                      >
                        {team.name}
                      </Text>
                    </View>
                  </View>
                  {selectedTeamId === team.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={COLORS.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  selectorButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectorContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectorText: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: COLORS.text,
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
    maxHeight: "80%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FONTS.heading,
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  teamList: {
    padding: 15,
  },
  teamOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: COLORS.gray[50],
    borderWidth: 2,
    borderColor: "transparent",
  },
  teamOptionSelected: {
    backgroundColor: `${COLORS.primary}15`,
    borderColor: COLORS.primary,
  },
  teamOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: COLORS.text,
    marginBottom: 4,
  },
  teamNameSelected: {
    color: COLORS.primary,
  },
  teamDescription: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
});

export default TeamSelector;
