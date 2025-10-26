# Firebase Push Notifications Setup (Optional)

## Current Status

Push notifications are **currently disabled** to prevent blocking the app. The app will work perfectly without them.

## The Error You Saw

```
Error: Default FirebaseApp is not initialized in this process
```

This happens because Android push notifications require Firebase Cloud Messaging (FCM) to be configured.

## Quick Fixes Applied

### 1. ✅ Made Notifications Non-Blocking
- `notificationService.js` now handles Firebase errors gracefully
- App continues to work even if push notifications fail
- Errors are logged but don't crash the app

### 2. ✅ Removed Firebase Reference
- Commented out `googleServicesFile` in `app.json`
- App no longer requires `google-services.json` to run

## If You Want Push Notifications Later

### For Android (Requires Firebase)

#### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name it "MatchTracker" (or whatever you prefer)
4. Follow the setup wizard

#### Step 2: Add Android App to Firebase

1. In Firebase Console, click "Add app" → Android
2. Enter your package name: `com.talentedtwin.matchtrackerMobile`
3. Download `google-services.json`
4. Place it in your project root: `MatchTrackerMobile/google-services.json`

#### Step 3: Get FCM Server Key

1. In Firebase Console → Project Settings
2. Click "Cloud Messaging" tab
3. Copy the "Server key" (you'll need this for Expo)

#### Step 4: Add FCM Credentials to Expo

```bash
eas credentials
# Select Android
# Select "Push Notifications: FCM server key"
# Paste your FCM server key
```

#### Step 5: Update app.json

Uncomment the googleServicesFile line:

```json
{
  "android": {
    "adaptiveIcon": {
      "foregroundImage": "./assets/logo.png",
      "backgroundColor": "#2563eb",
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

#### Step 6: Rebuild

```bash
eas build --profile development --platform android
```

### For iOS (Easier)

iOS push notifications work without Firebase:

1. **Apple Developer Account Required** ($99/year)
2. **Enable Push Notifications** in App ID capabilities
3. **Create APNs Key** in Apple Developer Portal
4. **Upload to Expo**:
   ```bash
   eas credentials
   # Select iOS
   # Select "Push Notifications: Manage your Apple Push Notifications Key"
   # Upload your .p8 key file
   ```

## Testing Without Firebase

Your app works fine without push notifications:

- ✅ Authentication works
- ✅ Data loading works
- ✅ All features work
- ✅ App doesn't crash
- ❌ No push notifications for upcoming matches

## Console Messages You'll See

These are **normal** and **expected** when Firebase isn't configured:

```
Push notifications not available: [Firebase error]
```

```
No EAS project ID found - push notifications disabled
```

```
Push notifications require a physical device
```

These messages are **informational only** - your app still works!

## When Do You Need Push Notifications?

You **don't need** them for:
- Development and testing
- Most app features
- App store submission (initially)

You **might want** them for:
- Production use
- User engagement
- Match reminders
- Real-time updates

## Cost Considerations

### Free Tier Limits:

**Expo Push Notifications:**
- Free and unlimited

**Firebase (Android):**
- Free tier: Unlimited messages
- No cost for most apps

**Apple APNs (iOS):**
- Free, but requires $99/year Apple Developer account

## Alternative: Local Notifications

If you want reminders without server push notifications, you can use **local notifications** instead:

```javascript
import * as Notifications from 'expo-notifications';

// Schedule a local notification
await Notifications.scheduleNotificationAsync({
  content: {
    title: "Match Starting Soon!",
    body: "Your match starts in 10 minutes",
  },
  trigger: {
    date: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
  },
});
```

**Pros:**
- No Firebase setup needed
- Works on simulator/emulator
- Easier to implement

**Cons:**
- Only works when app is installed
- User must open app to schedule notifications
- Less reliable than server push

## Summary

✅ **Current state:** Push notifications disabled, app works fine

⏭️ **Next step:** Continue building your app, add push notifications later if needed

📚 **Full guide:** See `PUSH_NOTIFICATIONS.md` for detailed setup when you're ready

## Need Help?

If you decide to set up Firebase later and encounter issues:
1. Check Firebase Console for errors
2. Verify `google-services.json` is in the right location
3. Ensure package name matches exactly
4. Rebuild the app after adding Firebase config
