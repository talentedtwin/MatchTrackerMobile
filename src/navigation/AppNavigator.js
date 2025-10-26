import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { setClerkTokenGetter } from '../services/api';
import { 
  initializeNotifications, 
  addNotificationListeners, 
  removeNotificationListeners 
} from '../services/notificationService';
import HomeScreen from '../screens/HomeScreen';
import PlayersScreen from '../screens/PlayersScreen';
import HistoryScreen from '../screens/HistoryScreen';
import StatsScreen from '../screens/StatsScreen';
import MatchDetailsScreen from '../screens/MatchDetailsScreen';
import EditMatchScreen from '../screens/EditMatchScreen';
import AddMatchScreen from '../screens/AddMatchScreen';
import AddTeamScreen from '../screens/AddTeamScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import { COLORS } from '../config/constants';

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
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: COLORS.gray[200],
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Players"
        component={PlayersScreen}
        options={{
          title: 'Players & Teams',
          tabBarLabel: 'Players',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          title: 'Match History',
          tabBarLabel: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          title: 'Statistics',
          tabBarLabel: 'Stats',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const navigationRef = useRef();
  const notificationListeners = useRef();

  // Set up the Clerk token getter for API calls
  useEffect(() => {
    setClerkTokenGetter(getToken);
  }, [getToken]);

  // Initialize push notifications when user signs in
  useEffect(() => {
    if (isSignedIn) {
      // Initialize notifications and get push token
      initializeNotifications();

      // Add notification listeners
      notificationListeners.current = addNotificationListeners(
        // Handle notification received (app in foreground)
        (notification) => {
          console.log('Notification received:', notification);
        },
        // Handle notification tapped (navigate to match details)
        (response) => {
          const matchId = response.notification.request.content.data?.matchId;
          if (matchId && navigationRef.current) {
            navigationRef.current.navigate('MatchDetails', { matchId });
          }
        }
      );

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
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
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
              options={{ title: 'Match Details' }}
            />
            <Stack.Screen
              name="EditMatch"
              component={EditMatchScreen}
              options={{ title: 'Edit Match' }}
            />
            <Stack.Screen
              name="AddMatch"
              component={AddMatchScreen}
              options={{ title: 'Add Match' }}
            />
            <Stack.Screen
              name="AddTeam"
              component={AddTeamScreen}
              options={{ title: 'Add Team' }}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  logo: {
    fontSize: 80,
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
});

export default AppNavigator;
