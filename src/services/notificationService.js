import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import api, { userApi } from "./api";

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Register for push notifications and get the Expo push token
 */
export async function registerForPushNotificationsAsync() {
  let token;

  console.log(
    "📱 Device check:",
    Device.isDevice ? "Physical device" : "Simulator/Emulator"
  );

  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#2563eb",
      });
      console.log("✅ Android notification channel set");
    } catch (error) {
      console.log("⚠️ Could not set notification channel:", error.message);
      // Continue - this is not critical
    }
  }

  if (Device.isDevice) {
    console.log("📋 Checking notification permissions...");
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    console.log("Current permission status:", existingStatus);
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      console.log("🔔 Requesting notification permissions...");
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log("Permission request result:", status);
    }

    if (finalStatus !== "granted") {
      console.log("❌ Push notification permission not granted");
      return null;
    }

    console.log("✅ Notification permissions granted");

    try {
      // Get the Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      console.log("🔑 EAS Project ID:", projectId);

      if (!projectId) {
        console.log("❌ No EAS project ID found - push notifications disabled");
        return null;
      }

      console.log("🌐 Requesting Expo Push Token...");
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;

      console.log("✅ Expo Push Token obtained:", token);
    } catch (error) {
      console.log("❌ Push notifications not available:", error.message);
      console.error("Full error:", error);
      // Don't show the full error to avoid confusion
      // Common causes: Firebase not configured, simulator/emulator, network issues
      return null;
    }
  } else {
    console.log("❌ Push notifications require a physical device");
  }

  return token;
}

/**
 * Send the push token to the backend to be saved
 */
export async function savePushToken(token) {
  if (!token) {
    console.log("⚠️ No token to save");
    return;
  }

  try {
    console.log("💾 Saving push token to backend:", token);
    await api.post("/users/push-token", { pushToken: token });
    console.log("✅ Push token saved to backend successfully");
  } catch (error) {
    console.error("❌ Error saving push token:", error);
    console.error("Error details:", error.response?.data || error.message);
    // Don't throw - this shouldn't break the app if it fails
  }
}

/**
 * Initialize notifications for the app
 * Call this when the user signs in
 */
export async function initializeNotifications() {
  try {
    console.log("🔔 Starting notification initialization...");

    // Check if user has push notifications enabled in their settings
    try {
      const { user } = await userApi.getProfile();
      if (!user.pushNotifications) {
        console.log("⚠️ Push notifications disabled in user settings");
        console.log("💡 User can enable them in Settings screen");
        return null;
      }
      console.log("✅ Push notifications enabled in user settings");
    } catch (error) {
      console.log(
        "⚠️ Could not check user notification preferences:",
        error.message
      );
      // Continue anyway - don't block notifications if API call fails
    }

    const token = await registerForPushNotificationsAsync();
    if (token) {
      console.log("✅ Push token obtained:", token);
      await savePushToken(token);
      console.log("✅ Push token saved to backend");
    } else {
      console.log("⚠️ No push token obtained - notifications disabled");
      console.log("💡 Possible reasons:");
      console.log("  - Running on simulator/emulator (use physical device)");
      console.log("  - Permissions denied");
      console.log("  - Firebase not configured (Android)");
      console.log("  - Not using EAS development/production build");
    }
    return token;
  } catch (error) {
    console.error("❌ Error initializing notifications:", error);
    // Don't throw - notification failures shouldn't break the app
    return null;
  }
}

/**
 * Add notification listeners
 */
export function addNotificationListeners(
  onNotificationReceived,
  onNotificationResponse
) {
  // Handle notifications received while app is in foreground
  const notificationListener = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log("Notification received:", notification);
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    }
  );

  // Handle user tapping on notification
  const responseListener =
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("🔔 Notification tapped:", response);
      console.log("   Action:", response.actionIdentifier);
      console.log("   Data:", response.notification.request.content.data);
      if (onNotificationResponse) {
        onNotificationResponse(response);
      }
    });

  return { notificationListener, responseListener };
}

/**
 * Remove notification listeners
 */
export function removeNotificationListeners(listeners) {
  if (listeners?.notificationListener) {
    try {
      listeners.notificationListener.remove();
    } catch (error) {
      console.log("Error removing notification listener:", error.message);
    }
  }
  if (listeners?.responseListener) {
    try {
      listeners.responseListener.remove();
    } catch (error) {
      console.log("Error removing response listener:", error.message);
    }
  }
}
