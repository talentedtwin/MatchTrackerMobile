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
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import Constants from "expo-constants";
import { COLORS, FONTS } from "../config/constants";
import { userApi } from "../services/api";

const SettingsScreen = ({ navigation }) => {
  const { user: clerkUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState(null);

  // Form state
  const [name, setName] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const response = await userApi.getProfile();
      setUserData(response.user);

      // Get name from Clerk user object instead of database
      const clerkName =
        clerkUser?.firstName && clerkUser?.lastName
          ? `${clerkUser.firstName} ${clerkUser.lastName}`
          : clerkUser?.firstName || clerkUser?.lastName || "";

      setName(clerkName);
      setEmailNotifications(response.user.emailNotifications || false);
      setPushNotifications(response.user.pushNotifications || false);
    } catch (error) {
      console.error("Failed to load user data:", error);
      Alert.alert("Error", "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await userApi.updateProfile({
        emailNotifications,
        pushNotifications,
      });
      Alert.alert("Success", "Settings updated successfully");
    } catch (error) {
      console.error("Failed to save settings:", error);
      Alert.alert("Error", "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your account and preferences</Text>
      </View>

      {/* Profile Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="person" size={20} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Profile</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.emailText}>
            {clerkUser?.primaryEmailAddress?.emailAddress}
          </Text>

          <Text style={styles.label}>Name</Text>
          <Text style={styles.emailText}>{name || "Not set"}</Text>
          <Text style={styles.helperText}>
            To update your name, please update it in your Clerk account
            settings.
          </Text>
        </View>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="notifications" size={20} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Notifications</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Email Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive match reminders via email
              </Text>
            </View>
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{
                false: COLORS.gray[300],
                true: COLORS.primary + "40",
              }}
              thumbColor={
                emailNotifications ? COLORS.primary : COLORS.gray[400]
              }
            />
          </View>

          <View style={[styles.settingRow, styles.settingRowBorder]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive match reminders on your device
              </Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{
                false: COLORS.gray[300],
                true: COLORS.primary + "40",
              }}
              thumbColor={pushNotifications ? COLORS.primary : COLORS.gray[400]}
            />
          </View>
        </View>
      </View>

      {/* App Info Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons
            name="information-circle"
            size={20}
            color={COLORS.primary}
          />
          <Text style={styles.sectionTitle}>About</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>
              {Constants.expoConfig?.version || "1.0.0"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account Created</Text>
            <Text style={styles.infoValue}>
              {new Date(clerkUser?.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>

      {/* Save Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.primary,
  },
  title: {
    fontSize: 28,
    fontFamily: FONTS.heading,
    color: "#fff",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: "#fff",
    opacity: 0.9,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 15,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.bodyBold,
    color: COLORS.text,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  label: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 12,
  },
  emailText: {
    fontSize: 15,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    paddingVertical: 8,
  },
  helperText: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    fontStyle: "italic",
    marginTop: 4,
  },
  input: {
    backgroundColor: COLORS.gray[50],
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    fontFamily: FONTS.body,
    color: COLORS.text,
  },
  premiumCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  premiumCardActive: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success + "10",
  },
  premiumContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  premiumTextContainer: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: COLORS.text,
    marginBottom: 4,
  },
  premiumDescription: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  settingRowBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    marginTop: 12,
    paddingTop: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
    color: COLORS.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: COLORS.text,
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  saveButton: {
    backgroundColor: COLORS.success,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
  },
});

export default SettingsScreen;
