import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import api from './api';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and get the Expo push token
 */
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563eb',
      });
    } catch (error) {
      console.log('Could not set notification channel:', error.message);
      // Continue - this is not critical
    }
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }
    
    try {
      // Get the Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      
      if (!projectId) {
        console.log('No EAS project ID found - push notifications disabled');
        return null;
      }
      
      token = (await Notifications.getExpoPushTokenAsync({
        projectId,
      })).data;
      
      console.log('Expo Push Token:', token);
    } catch (error) {
      console.log('Push notifications not available:', error.message);
      // Don't show the full error to avoid confusion
      // Common causes: Firebase not configured, simulator/emulator, network issues
      return null;
    }
  } else {
    console.log('Push notifications require a physical device');
  }

  return token;
}

/**
 * Send the push token to the backend to be saved
 */
export async function savePushToken(token) {
  if (!token) return;

  try {
    await api.post('/users/push-token', { pushToken: token });
    console.log('Push token saved to backend');
  } catch (error) {
    console.error('Error saving push token:', error);
    // Don't throw - this shouldn't break the app if it fails
  }
}

/**
 * Initialize notifications for the app
 * Call this when the user signs in
 */
export async function initializeNotifications() {
  try {
    const token = await registerForPushNotificationsAsync();
    if (token) {
      await savePushToken(token);
    }
    return token;
  } catch (error) {
    console.error('Error initializing notifications:', error);
    // Don't throw - notification failures shouldn't break the app
    return null;
  }
}

/**
 * Add notification listeners
 */
export function addNotificationListeners(onNotificationReceived, onNotificationResponse) {
  // Handle notifications received while app is in foreground
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  // Handle user tapping on notification
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification tapped:', response);
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
      console.log('Error removing notification listener:', error.message);
    }
  }
  if (listeners?.responseListener) {
    try {
      listeners.responseListener.remove();
    } catch (error) {
      console.log('Error removing response listener:', error.message);
    }
  }
}
