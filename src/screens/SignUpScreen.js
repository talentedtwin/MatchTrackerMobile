import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useSignUp, useOAuth } from "@clerk/clerk-expo";
import { AntDesign, FontAwesome } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { COLORS, FONTS } from "../config/constants";

// Required for OAuth on mobile
WebBrowser.maybeCompleteAuthSession();

// Warm up the browser for faster OAuth on iOS
const useWarmUpBrowser = () => {
  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};

const SignUpScreen = ({ navigation }) => {
  const { theme } = useTheme();
  useWarmUpBrowser(); // Add browser warm up

  const { signUp, setActive, isLoaded } = useSignUp();
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({
    strategy: "oauth_google",
  });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({
    strategy: "oauth_apple",
  });
  const { startOAuthFlow: startFacebookOAuth } = useOAuth({
    strategy: "oauth_facebook",
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }

    if (!isLoaded) return;

    setLoading(true);
    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      });

      // If email verification is required
      if (result.status === "missing_requirements") {
        // Send verification email
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });
        Alert.alert(
          "Verify Email",
          "Please check your email for a verification code.",
          [
            {
              text: "OK",
              onPress: () => navigation.navigate("SignIn"),
            },
          ]
        );
      } else if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        Alert.alert("Success", "Account created successfully!");
      }
    } catch (error) {
      console.error("Sign up error:", error);
      Alert.alert(
        "Error",
        error.errors?.[0]?.message ||
          "Failed to create account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignUp = async (provider) => {
    try {
      setLoading(true);

      let startOAuth;
      if (provider === "Google") startOAuth = startGoogleOAuth;
      else if (provider === "Apple") startOAuth = startAppleOAuth;
      else if (provider === "Facebook") startOAuth = startFacebookOAuth;

      const { createdSessionId, setActive: setActiveSession } =
        await startOAuth();

      if (createdSessionId) {
        await setActiveSession({ session: createdSessionId });
        Alert.alert("Success", `Signed up with ${provider}!`);
      }
    } catch (error) {
      console.error("OAuth error:", error);
      Alert.alert(
        `${provider} Sign-Up`,
        error.errors?.[0]?.message ||
          `${provider} OAuth is not configured in your Clerk dashboard. Please use email/password for now.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: theme.primary }]}>
            Create Account
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Join MatchTracker today
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={[styles.label, { color: theme.text }]}>
                First Name
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="John"
                placeholderTextColor={theme.textSecondary}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>

            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={[styles.label, { color: theme.text }]}>
                Last Name
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="Doe"
                placeholderTextColor={theme.textSecondary}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Email</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="your.email@example.com"
              placeholderTextColor={theme.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Password</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="••••••••"
              placeholderTextColor={theme.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              editable={!loading}
            />
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              Minimum 8 characters
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>
              Confirm Password
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="••••••••"
              placeholderTextColor={theme.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: theme.primary },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate("SignIn")}
            disabled={loading}
          >
            <Text style={[styles.linkText, { color: theme.textSecondary }]}>
              Already have an account?{" "}
              <Text style={[styles.linkTextBold, { color: theme.primary }]}>
                Sign In
              </Text>
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View
              style={[styles.dividerLine, { backgroundColor: theme.border }]}
            />
            <Text style={[styles.dividerText, { color: theme.textSecondary }]}>
              Or continue with
            </Text>
            <View
              style={[styles.dividerLine, { backgroundColor: theme.border }]}
            />
          </View>

          {/* Social Login Buttons */}
          <View style={styles.socialButtons}>
            <TouchableOpacity
              style={[
                styles.socialButton,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => handleSocialSignUp("Google")}
              disabled={loading}
            >
              <AntDesign
                name="google"
                size={20}
                color="#DB4437"
                style={styles.socialIcon}
              />
              <Text style={[styles.socialButtonText, { color: theme.text }]}>
                Google
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, styles.appleSocialButton]}
              onPress={() => handleSocialSignUp("Apple")}
              disabled={loading}
            >
              <AntDesign
                name="apple"
                size={20}
                color="#fff"
                style={styles.socialIcon}
              />
              <Text
                style={[styles.socialButtonText, styles.appleSocialButtonText]}
              >
                Apple
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, styles.facebookSocialButton]}
              onPress={() => handleSocialSignUp("Facebook")}
              disabled={loading}
            >
              <FontAwesome
                name="facebook"
                size={20}
                color="#fff"
                style={styles.socialIcon}
              />
              <Text
                style={[
                  styles.socialButtonText,
                  styles.facebookSocialButtonText,
                ]}
              >
                Facebook
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Note */}
        <View
          style={[
            styles.infoBox,
            {
              backgroundColor: theme.isDarkMode
                ? "rgba(91, 163, 245, 0.15)"
                : COLORS.primary + "10",
              borderLeftColor: theme.primary,
            },
          ]}
        >
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            � Connected to Clerk backend for secure authentication
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 38,
    fontFamily: FONTS.heading,
    color: COLORS.primary,
    marginBottom: 5,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  form: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  inputContainer: {
    marginBottom: 16,
  },
  halfWidth: {
    width: "48%",
  },
  label: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    fontFamily: FONTS.body,
    borderWidth: 1,
    borderColor: COLORS.gray?.[300] || "#ddd",
  },
  hint: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
  },
  linkButton: {
    marginTop: 20,
    alignItems: "center",
  },
  linkText: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  linkTextBold: {
    color: COLORS.primary,
    fontFamily: FONTS.bodyBold,
  },
  infoBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: COLORS.primary + "10",
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoText: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray?.[300] || "#ddd",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  socialButtons: {
    gap: 12,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.gray?.[300] || "#ddd",
  },
  socialIcon: {
    marginRight: 8,
  },
  appleSocialButton: {
    backgroundColor: "#000",
  },
  facebookSocialButton: {
    backgroundColor: "#1877F2",
  },
  socialButtonText: {
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
    color: COLORS.text,
  },
  appleSocialButtonText: {
    color: "#fff",
  },
  facebookSocialButtonText: {
    color: "#fff",
  },
});

export default SignUpScreen;
