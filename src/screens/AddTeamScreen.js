import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTeams } from "../hooks/useResources";
import { COLORS } from "../config/constants";
import { useTheme } from "../contexts/ThemeContext";
import { uploadApi } from "../services/api";

const AddTeamScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { addTeam, updateTeam } = useTeams();
  const editingTeam = route.params?.team;
  const isEditing = !!editingTeam;

  const [teamName, setTeamName] = useState(editingTeam?.name || "");
  const [avatarUri, setAvatarUri] = useState(editingTeam?.avatar || null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!teamName.trim()) {
      newErrors.teamName = "Team name is required";
    } else if (teamName.trim().length < 2) {
      newErrors.teamName = "Team name must be at least 2 characters";
    } else if (teamName.trim().length > 50) {
      newErrors.teamName = "Team name must be less than 50 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImage = async () => {
    try {
      // Request permission
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to upload a team avatar."
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Upload to Cloudinary
        setUploadingImage(true);
        try {
          const base64Image = `data:image/jpeg;base64,${asset.base64}`;
          const uploadResponse = await uploadApi.uploadImage(base64Image);

          if (uploadResponse.success) {
            setAvatarUri(uploadResponse.url);
            Alert.alert("Success", "Avatar uploaded successfully");
          }
        } catch (error) {
          console.error("Error uploading image:", error);
          Alert.alert("Error", "Failed to upload image. Please try again.");
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const removeAvatar = () => {
    Alert.alert(
      "Remove Avatar",
      "Are you sure you want to remove the team avatar?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => setAvatarUri(null),
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const teamData = {
        name: teamName.trim(),
        avatar: avatarUri,
      };

      console.log("📝 Submitting team data:", {
        name: teamData.name,
        hasAvatar: !!teamData.avatar,
      });

      if (isEditing) {
        await updateTeam(editingTeam.id, teamData);
        Alert.alert("Success", "Team updated successfully");
      } else {
        await addTeam(teamData);
        Alert.alert("Success", "Team added successfully");
      }

      navigation.goBack();
    } catch (error) {
      console.error("Error saving team:", error);
      Alert.alert("Error", error.message || "Failed to save team");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.content}>
        <View
          style={[styles.section, { backgroundColor: theme.cardBackground }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Team Information
          </Text>

          {/* Team Avatar */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Ionicons name="image" size={18} color={theme.primary} />
              <Text style={[styles.label, { color: theme.text }]}>
                Team Avatar
              </Text>
            </View>

            <View style={styles.avatarContainer}>
              {avatarUri ? (
                <View style={styles.avatarPreview}>
                  <Image
                    source={{ uri: avatarUri }}
                    style={styles.avatarImage}
                  />
                  <TouchableOpacity
                    style={[
                      styles.removeAvatarButton,
                      { backgroundColor: COLORS.error },
                    ]}
                    onPress={removeAvatar}
                    disabled={uploadingImage}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.avatarPlaceholder,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.cardBackground,
                    },
                  ]}
                  onPress={pickImage}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator color={theme.primary} />
                  ) : (
                    <>
                      <Ionicons
                        name="camera"
                        size={32}
                        color={theme.textSecondary}
                      />
                      <Text
                        style={[
                          styles.avatarPlaceholderText,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Tap to upload
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {avatarUri && (
                <TouchableOpacity
                  style={[
                    styles.changeAvatarButton,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={pickImage}
                  disabled={uploadingImage}
                >
                  <Ionicons name="camera" size={16} color="#fff" />
                  <Text style={styles.changeAvatarText}>
                    {uploadingImage ? "Uploading..." : "Change Avatar"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={[styles.helperText, { color: theme.textSecondary }]}>
              Upload a logo or image for your team (optional)
            </Text>
          </View>

          {/* Team Name */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Ionicons name="people" size={18} color={theme.primary} />
              <Text style={[styles.label, { color: theme.text }]}>
                Team Name
              </Text>
            </View>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                  color: theme.text,
                },
                errors.teamName && styles.inputError,
              ]}
              placeholder="Enter team name"
              placeholderTextColor={theme.textSecondary}
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
            <Text style={[styles.helperText, { color: theme.textSecondary }]}>
              Give your team a memorable name
            </Text>
          </View>
        </View>

        {/* Info Box */}
        <View
          style={[
            styles.infoBox,
            {
              backgroundColor: theme.isDarkMode
                ? "rgba(91, 163, 245, 0.15)"
                : "#e3f2fd",
              borderLeftColor: theme.primary,
            },
          ]}
        >
          <View style={styles.infoIconContainer}>
            <Ionicons
              name="information-circle"
              size={20}
              color={theme.primary}
            />
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={[styles.infoTitle, { color: theme.primary }]}>
              About Teams
            </Text>
            <Text
              style={[
                styles.infoText,
                { color: theme.isDarkMode ? theme.text : "#1565c0" },
              ]}
            >
              Teams help you organize your players and track matches for
              different squads. You can assign players to teams and filter
              matches by team.
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: theme.primary },
            loading && styles.submitButtonDisabled,
          ]}
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
                {isEditing ? "Update Team" : "Create Team"}
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
    backgroundColor: "#fff",
    padding: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    backgroundColor: "#e3f2fd",
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
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: "#1565c0",
    lineHeight: 18,
  },
  submitButton: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginBottom: 30,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  avatarPreview: {
    position: "relative",
    marginBottom: 12,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  removeAvatarButton: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.error,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.gray[50],
  },
  avatarPlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  changeAvatarButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  changeAvatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default AddTeamScreen;
