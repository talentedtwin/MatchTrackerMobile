import { Expo } from 'expo-server-sdk';

// Create a new Expo SDK client
const expo = new Expo();

/**
 * Send push notifications to multiple devices
 * @param {Array} messages - Array of message objects with format:
 *   {
 *     to: 'ExponentPushToken[...]',
 *     sound: 'default',
 *     title: 'Title',
 *     body: 'Message body',
 *     data: { ... }
 *   }
 */
export async function sendPushNotifications(messages) {
  // Filter out invalid tokens
  const validMessages = messages.filter(message => 
    Expo.isExpoPushToken(message.to)
  );

  if (validMessages.length === 0) {
    console.log('No valid push tokens to send notifications to');
    return;
  }

  // Create chunks of notifications (Expo can handle up to 100 at once)
  const chunks = expo.chunkPushNotifications(validMessages);
  const tickets = [];

  console.log(`Sending ${validMessages.length} notifications in ${chunks.length} chunks`);

  // Send notifications in chunks
  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error('Error sending notification chunk:', error);
    }
  }

  // Check for errors in tickets
  for (const ticket of tickets) {
    if (ticket.status === 'error') {
      console.error('Error in ticket:', ticket.message);
      if (ticket.details?.error === 'DeviceNotRegistered') {
        // Token is invalid, should be removed from database
        console.log('Device not registered, token should be removed');
      }
    }
  }

  return tickets;
}

/**
 * Send a match reminder notification to a user
 * @param {string} pushToken - User's Expo push token
 * @param {object} match - Match object with details
 */
export async function sendMatchReminderNotification(pushToken, match) {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error('Invalid push token:', pushToken);
    return;
  }

  const message = {
    to: pushToken,
    sound: 'default',
    title: '⚽ Match Starting Soon!',
    body: `Your match against ${match.opponent} starts in 10 minutes at ${match.venue}`,
    data: {
      matchId: match.id,
      type: 'match_reminder',
    },
    priority: 'high',
    channelId: 'default',
  };

  try {
    const tickets = await sendPushNotifications([message]);
    console.log('Match reminder sent:', tickets);
    return tickets;
  } catch (error) {
    console.error('Error sending match reminder:', error);
    throw error;
  }
}

/**
 * Send notifications to multiple users for a match
 * @param {Array} pushTokens - Array of user push tokens
 * @param {object} match - Match object
 */
export async function sendMatchRemindersToUsers(pushTokens, match) {
  const messages = pushTokens.map(token => ({
    to: token,
    sound: 'default',
    title: '⚽ Match Starting Soon!',
    body: `Your match against ${match.opponent} starts in 10 minutes at ${match.venue}`,
    data: {
      matchId: match.id,
      type: 'match_reminder',
    },
    priority: 'high',
    channelId: 'default',
  }));

  return await sendPushNotifications(messages);
}
