import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS } from "../config/constants";
import { useTheme } from "../contexts/ThemeContext";

const TeamSelector = ({ teams, selectedTeamId, onSelectTeam }) => {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  console.log(
    "TeamSelector - Selected team:",
    selectedTeam?.name,
    "Avatar:",
    selectedTeam?.avatar
  );
  console.log(
    "TeamSelector - All teams:",
    teams.map((t) => ({ name: t.name, hasAvatar: !!t.avatar }))
  );

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
        style={[
          styles.selectorButton,
          {
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
            shadowColor: theme.shadow,
          },
        ]}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.selectorContent}>
          {selectedTeam?.avatar ? (
            <Image
              source={{ uri: selectedTeam.avatar }}
              style={styles.selectorAvatar}
              onError={(error) =>
                console.log("Image load error:", error.nativeEvent.error)
              }
              onLoad={() =>
                console.log("Image loaded successfully:", selectedTeam.avatar)
              }
            />
          ) : (
            <Ionicons name="people" size={20} color={theme.primary} />
          )}
          <Text style={[styles.selectorText, { color: theme.text }]}>
            {selectedTeam ? selectedTeam.name : "All Teams"}
          </Text>
          <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
        </View>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.cardBackground },
            ]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: theme.border }]}
            >
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Select Team
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.teamList}>
              {/* All Teams Option */}
              <TouchableOpacity
                style={[
                  styles.teamOption,
                  {
                    backgroundColor: theme.cardBackground,
                  },
                ]}
                onPress={() => handleSelectTeam(null)}
              >
                <View style={styles.teamOptionContent}>
                  <Ionicons
                    name="albums"
                    size={24}
                    color={
                      !selectedTeamId ? theme.primary : theme.textSecondary
                    }
                  />
                  <View style={styles.teamInfo}>
                    <Text
                      style={[
                        styles.teamName,
                        { color: theme.text },
                        !selectedTeamId && [
                          styles.teamNameSelected,
                          { color: theme.primary },
                        ],
                      ]}
                    >
                      All Teams
                    </Text>
                    <Text
                      style={[
                        styles.teamDescription,
                        { color: theme.textSecondary },
                      ]}
                    >
                      View data from all your teams
                    </Text>
                  </View>
                </View>
                {!selectedTeamId && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={theme.primary}
                  />
                )}
              </TouchableOpacity>

              {/* Individual Teams */}
              {teams.map((team) => (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.teamOption,
                    {
                      backgroundColor: theme.cardBackground,
                    },
                  ]}
                  onPress={() => handleSelectTeam(team.id)}
                >
                  <View style={styles.teamOptionContent}>
                    {team.avatar ? (
                      <Image
                        source={{ uri: team.avatar }}
                        style={styles.teamAvatar}
                        onError={(error) =>
                          console.log(
                            "Team avatar load error:",
                            team.name,
                            error.nativeEvent.error
                          )
                        }
                        onLoad={() =>
                          console.log("Team avatar loaded:", team.name)
                        }
                      />
                    ) : (
                      <Ionicons
                        name="people"
                        size={24}
                        color={
                          selectedTeamId === team.id
                            ? theme.primary
                            : theme.textSecondary
                        }
                      />
                    )}
                    <View style={styles.teamInfo}>
                      <Text
                        style={[
                          styles.teamName,
                          { color: theme.text },
                          selectedTeamId === team.id && [
                            styles.teamNameSelected,
                            { color: theme.primary },
                          ],
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
                      color={theme.primary}
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
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 15,
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectorContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  selectorText: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
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
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FONTS.heading,
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
    borderWidth: 2,
    borderColor: "transparent",
  },
  teamOptionSelected: {
    borderColor: COLORS.primary,
  },
  teamOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  teamAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    marginBottom: 4,
  },
  teamNameSelected: {
    color: COLORS.primary,
  },
  teamDescription: {
    fontSize: 13,
    fontFamily: FONTS.body,
  },
});

export default TeamSelector;
