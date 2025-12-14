import React, { useEffect, useRef } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { usePostHog } from "posthog-react-native";
import { setClerkTokenGetter } from "../services/api";
import {
  initializeNotifications,
  addNotificationListeners,
  removeNotificationListeners,
} from "../services/notificationService";
import HomeScreen from "../screens/HomeScreen";
import PlayersScreen from "../screens/PlayersScreen";
import HistoryScreen from "../screens/HistoryScreen";
import StatsScreen from "../screens/StatsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import PlayerStatsScreen from "../screens/PlayerStatsScreen";
import MatchDetailsScreen from "../screens/MatchDetailsScreen";
import LiveMatchScreen from "../screens/LiveMatchScreen";
import EditMatchScreen from "../screens/EditMatchScreen";
import AddMatchScreen from "../screens/AddMatchScreen";
import AddTeamScreen from "../screens/AddTeamScreen";
import SignInScreen from "../screens/SignInScreen";
import SignUpScreen from "../screens/SignUpScreen";
import { COLORS } from "../config/constants";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator for main screens
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: COLORS.gray[200],
          paddingBottom: 15,
          paddingTop: 5,
          height: 70,
        },
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: "Dashboard",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Players"
        component={PlayersScreen}
        options={{
          title: "Players & Teams",
          tabBarLabel: "Players",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          title: "Match History",
          tabBarLabel: "History",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          title: "Statistics",
          tabBarLabel: "Stats",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: "Settings",
          tabBarLabel: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user } = useUser();
  const posthog = usePostHog();
  const navigationRef = useRef();
  const notificationListeners = useRef();
  const hasIdentifiedUser = useRef(false); // Track if we've already identified this user

  // Set up the Clerk token getter for API calls
  useEffect(() => {
    setClerkTokenGetter(getToken);
  }, [getToken]);

  // Identify user with PostHog when signed in
  useEffect(() => {
    if (isSignedIn && user && posthog && !hasIdentifiedUser.current) {
      console.log("📊 Identifying user with PostHog:", user.id);

      // Identify user with PostHog
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
        username: user.username,
        createdAt: user.createdAt,
      });

      // Mark as identified to prevent duplicate calls
      hasIdentifiedUser.current = true;
      console.log("✅ User identified with PostHog");
    } else if (!isSignedIn && hasIdentifiedUser.current) {
      // Reset identification flag when user signs out
      console.log("🚪 User signed out - resetting PostHog identification");
      posthog?.reset();
      hasIdentifiedUser.current = false;
    }
  }, [isSignedIn, user, posthog]);

  // Initialize push notifications when user signs in
  useEffect(() => {
    console.log("🔐 Auth state changed - isSignedIn:", isSignedIn);
    if (isSignedIn) {
      console.log("✅ User signed in - initializing notifications...");
      // Initialize notifications and get push token (don't await - non-blocking)
      initializeNotifications().catch((error) => {
        console.error("Failed to initialize notifications:", error);
        // Continue app execution even if notifications fail
      });

      // Add notification listeners
      try {
        notificationListeners.current = addNotificationListeners(
          // Handle notification received (app in foreground)
          (notification) => {
            console.log(
              "📬 Notification received in foreground:",
              notification
            );
          },
          // Handle notification tapped (navigate to match details)
          (response) => {
            console.log("👆 Notification tapped, processing...");
            const matchId = response.notification.request.content.data?.matchId;
            console.log("   Match ID from notification:", matchId);
            console.log(
              "   Navigation ref available:",
              !!navigationRef.current
            );

            if (matchId && navigationRef.current) {
              console.log(
                "   ✅ Navigating to MatchDetails with matchId:",
                matchId
              );
              navigationRef.current.navigate("MatchDetails", { matchId });
            } else {
              console.log(
                "   ❌ Cannot navigate - missing matchId or navigation ref"
              );
            }
          }
        );
      } catch (error) {
        console.error("Failed to add notification listeners:", error);
      }

      // Cleanup listeners on unmount
      return () => {
        if (notificationListeners.current) {
          removeNotificationListeners(notificationListeners.current);
        }
      };
    }
  }, [isSignedIn]);

  // Show loading screen while Clerk initializes
  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.logo}>⚽</Text>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>MatchTracker</Text>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.primary,
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      >
        {!isSignedIn ? (
          // Auth Stack - Show when not logged in
          <>
            <Stack.Screen
              name="SignIn"
              component={SignInScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="SignUp"
              component={SignUpScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          // App Stack - Show when logged in
          <>
            <Stack.Screen
              name="Main"
              component={TabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="MatchDetails"
              component={MatchDetailsScreen}
              options={{ title: "Match Details" }}
            />
            <Stack.Screen
              name="PlayerStats"
              component={PlayerStatsScreen}
              options={{ title: "Player Statistics" }}
            />
            <Stack.Screen
              name="LiveMatch"
              component={LiveMatchScreen}
              options={{ title: "Live Match", headerShown: false }}
            />
            <Stack.Screen
              name="EditMatch"
              component={EditMatchScreen}
              options={{ title: "Edit Match" }}
            />
            <Stack.Screen
              name="AddMatch"
              component={AddMatchScreen}
              options={{ title: "Add Match" }}
            />
            <Stack.Screen
              name="AddTeam"
              component={AddTeamScreen}
              options={{ title: "Add Team" }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  logo: {
    fontSize: 80,
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
  },
});

export default AppNavigator;
