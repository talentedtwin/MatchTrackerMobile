# Push Notifications Setup

## Overview

The MatchTracker app now includes backend push notifications that automatically remind users 10 minutes before their scheduled matches start.

## Architecture

### Mobile App (React Native/Expo)
- **Service**: `src/services/notificationService.js`
  - Registers device for push notifications
  - Obtains Expo push token
  - Sends token to backend API
  - Handles incoming notifications and user taps

- **Integration**: `src/navigation/AppNavigator.js`
  - Initializes notifications when user signs in
  - Sets up notification listeners
  - Navigates to match details when notification is tapped

### Backend (Next.js)
- **Notification Service**: `backend/lib/notificationService.js`
  - Uses Expo Server SDK to send push notifications
  - Handles token validation
  - Batches notifications for efficiency

- **Scheduler**: `backend/lib/matchNotificationScheduler.js`
  - Runs every minute via cron job
  - Checks for matches starting in 10-11 minutes
  - Sends notifications to users with valid push tokens

- **API Endpoint**: `backend/pages/api/users/push-token.js`
  - POST endpoint to save user's push token
  - Validates token format
  - Stores token in database

- **User Service**: `backend/lib/userService.js`
  - Added `updatePushToken()` method
  - Manages push token storage

## Database Schema

Added `pushToken` field to User model:

\`\`\`prisma
model User {
  id                 String    @id
  email              String    @unique
  name               String?
  pushToken          String?   // Expo push token
  // ... other fields
}
\`\`\`

## Setup Instructions

### 1. Run Database Migration

\`\`\`bash
cd backend
npx prisma migrate dev --name add_push_token
\`\`\`

### 2. Configure app.json

The notification configuration is already added to `app.json`:

\`\`\`json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/icon.png",
          "color": "#2563eb",
          "mode": "production"
        }
      ]
    ],
    "android": {
      "permissions": ["NOTIFICATIONS", "VIBRATE"]
    }
  }
}
\`\`\`

### 3. Start the Backend

The scheduler starts automatically when the backend launches:

\`\`\`bash
cd backend
npm run dev
\`\`\`

You should see: `"Match notification scheduler started"`

### 4. Test on Physical Device

⚠️ **Important**: Push notifications only work on physical devices, not simulators/emulators.

1. Start the mobile app on a physical device
2. Sign in - this will register the device and send the push token to backend
3. Create a scheduled match for ~11 minutes from now
4. Wait - you'll receive a notification 10 minutes before the match

## How It Works

1. **Registration Flow**:
   - User signs in → `AppNavigator` calls `initializeNotifications()`
   - App requests notification permissions
   - Gets Expo push token from device
   - Sends token to backend via `POST /api/users/push-token`
   - Backend saves token in database

2. **Notification Flow**:
   - Backend cron job runs every minute
   - Queries for matches starting in 10-11 minutes
   - For each match, fetches user's push token
   - Sends notification via Expo Push Notification service
   - User receives notification on device
   - Tapping notification opens match details

## Notification Content

**Title**: ⚽ Match Starting Soon!

**Body**: Your match against {opponent} starts in 10 minutes at {venue}

**Data**: Includes `matchId` for navigation

## Testing Checklist

- [ ] User can sign in and app requests notification permissions
- [ ] Push token is saved to backend (check console logs)
- [ ] Create a match scheduled for ~11 minutes from now
- [ ] Receive notification 10 minutes before match
- [ ] Tapping notification opens match details screen
- [ ] Scheduler logs appear in backend console every minute

## Troubleshooting

### No notifications received

1. Check device has notification permissions enabled
2. Verify backend scheduler is running (check console logs)
3. Ensure match is scheduled correctly (not already finished)
4. Verify user has a push token saved (check database)
5. Test on physical device (simulators don't support push notifications)

### Token errors

- Invalid token format: Must start with `ExponentPushToken[`
- Device not registered: Token may be expired, user needs to sign in again

## Production Considerations

### Expo Push Notification Service Limits

- **Free tier**: Unlimited notifications
- **Rate limits**: 600 requests/minute, 6000 requests/hour
- **Message size**: 4KB max payload

### Optimization Ideas

1. **Batch notifications**: Already implemented in `notificationService.js`
2. **Token cleanup**: Remove invalid tokens from database
3. **User preferences**: Allow users to disable notifications
4. **Custom notification times**: Let users choose 5/10/15 minutes before
5. **Multiple notifications**: Send 1 hour + 10 minutes before match

### Monitoring

Add logging/monitoring for:
- Failed notification sends
- Invalid tokens
- Scheduler execution times
- Notification delivery rates

## Future Enhancements

- [ ] Match result notifications (final score)
- [ ] Player performance alerts (hat-trick, clean sheet)
- [ ] Team milestone notifications (50 matches, 100 goals)
- [ ] Customizable notification preferences
- [ ] Rich notifications with images/actions
- [ ] Notification history in app

## References

- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Expo Server SDK](https://github.com/expo/expo-server-sdk-node)
- [Node-cron](https://github.com/node-cron/node-cron)
