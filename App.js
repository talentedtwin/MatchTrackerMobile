import React from "react";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { useFonts } from "expo-font";
import { BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import {
  RobotoCondensed_300Light,
  RobotoCondensed_400Regular,
  RobotoCondensed_700Bold,
} from "@expo-google-fonts/roboto-condensed";
import { ClerkProvider } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import AppNavigator from "./src/navigation/AppNavigator";
import { PostHogProvider } from "posthog-react-native";
import { TeamProvider } from "./src/contexts/TeamContext";
import { ThemeProvider } from "./src/contexts/ThemeContext";

// Token cache for Clerk
const tokenCache = {
  async getToken(key) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key, value) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;

if (!publishableKey) {
  throw new Error(
    "Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env"
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    RobotoCondensed_300Light,
    RobotoCondensed_400Regular,
    RobotoCondensed_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Wrap app with PostHog only if API key is available
  const AppContent = (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ThemeProvider>
        <TeamProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </TeamProvider>
      </ThemeProvider>
    </ClerkProvider>
  );

  // If PostHog API key is available, wrap with PostHogProvider
  if (posthogApiKey) {
    return (
      <PostHogProvider
        apiKey={posthogApiKey}
        options={{
          host: "https://eu.i.posthog.com",
        }}
        autocapture={{
          captureTouches: true,
          captureScreens: false, // Disabled to prevent navigation errors
          ignoreLabels: [],
          customLabelProp: "ph-label",
          maxElementsCaptured: 20,
          noCaptureProp: "ph-no-capture",
        }}
      >
        {AppContent}
      </PostHogProvider>
    );
  }

  // If no PostHog key, return app without analytics
  console.warn("PostHog API key not found. Analytics disabled.");
  return AppContent;
}
