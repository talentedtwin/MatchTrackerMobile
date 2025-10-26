# Mobile Authentication Setup with Clerk

## Overview

The mobile app now connects to your Clerk backend for authentication. Both sign-in and sign-up screens communicate with API endpoints that will integrate with Clerk.

## Architecture

```
Mobile App (React Native)
    ↓
Mobile Auth API (/api/auth/sign-in, /api/auth/sign-up)
    ↓
Clerk Backend (Authentication Service)
    ↓
Database (User Management via Webhooks)
```

## API Endpoints Created

### 1. Sign-In: `/api/auth/sign-in`
- **Method:** POST
- **Body:**
  ```json
  {
    "identifier": "user@example.com",
    "password": "password123"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "name": "John Doe"
    },
    "token": "session_token_here",
    "sessionId": "session_id_here"
  }
  ```

### 2. Sign-Up: `/api/auth/sign-up`
- **Method:** POST
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "user": {
      "id": "user_124",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "name": "John Doe"
    },
    "token": "session_token_here",
    "sessionId": "session_id_here"
  }
  ```

## Current Status

### ✅ Implemented
- Mobile sign-in screen with backend integration
- Mobile sign-up screen with backend integration
- API endpoints for authentication
- Public routes configuration (no auth required for auth endpoints)
- Error handling and validation
- Session token storage in mobile app
- Social login UI buttons (Google, Apple, Facebook)

### 🚧 Mock Mode (Current State)
The authentication endpoints are currently in **mock mode** for testing. They:
- Accept any email/password combination
- Return mock user data and session tokens
- Allow you to test the complete flow without Clerk API keys

### 🔐 Production Setup Required

To enable **real Clerk authentication**, update the API endpoints:

#### File: `backend/pages/api/auth/sign-in.js`

Uncomment the production code section and install Clerk SDK:

```bash
cd backend
npm install @clerk/clerk-sdk-node
```

Then replace the mock code with:

```javascript
const { clerkClient } = require('@clerk/clerk-sdk-node');

// Verify credentials with Clerk
const signInAttempt = await clerkClient.signInAttempts.create({
  strategy: 'password',
  identifier,
  password,
});

if (signInAttempt.status === 'complete') {
  const session = signInAttempt.createdSessionId;
  const userId = signInAttempt.userId;
  
  // Get user details
  const user = await clerkClient.users.getUser(userId);
  
  return res.status(200).json({
    success: true,
    user: {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    },
    token: session,
    sessionId: session,
  });
}
```

#### File: `backend/pages/api/auth/sign-up.js`

Similarly, uncomment and use:

```javascript
const { clerkClient } = require('@clerk/clerk-sdk-node');

// Create user with Clerk
const user = await clerkClient.users.createUser({
  emailAddress: [email],
  password,
  firstName: firstName || '',
  lastName: lastName || '',
});

// Create a session for the new user
const session = await clerkClient.sessions.createSession({
  userId: user.id,
});

return res.status(201).json({
  success: true,
  user: {
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress,
    firstName: user.firstName,
    lastName: user.lastName,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
  },
  token: session.id,
  sessionId: session.id,
});
```

## Social OAuth Setup (Google, Apple, Facebook)

To enable social login buttons:

### 1. Configure OAuth Providers in Clerk Dashboard
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **User & Authentication** → **Social Connections**
3. Enable Google, Apple, and/or Facebook
4. Configure OAuth redirect URLs for mobile:
   - iOS: `your-app-scheme://oauth-callback`
   - Android: `your-package-name://oauth-callback`

### 2. Install Expo AuthSession
```bash
npx expo install expo-auth-session expo-crypto
```

### 3. Update Mobile Screens

Replace the `handleSocialSignIn` function in both screens:

```javascript
import * as AuthSession from 'expo-auth-session';

const handleSocialSignIn = async (provider) => {
  try {
    // Get OAuth URL from backend
    const response = await fetch(`${api.getBaseUrl()}/auth/oauth/${provider.toLowerCase()}`, {
      method: 'GET',
    });
    
    const { authUrl } = await response.json();
    
    // Open browser for OAuth
    const result = await AuthSession.startAsync({
      authUrl,
      returnUrl: AuthSession.makeRedirectUri(),
    });
    
    if (result.type === 'success') {
      // Handle OAuth callback
      const { user, token } = result.params;
      await login(user, token);
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to sign in with ' + provider);
  }
};
```

### 4. Create OAuth Endpoints

You'll need to create backend endpoints:
- `/api/auth/oauth/google`
- `/api/auth/oauth/apple`
- `/api/auth/oauth/facebook`

These should return the OAuth authorization URL from Clerk.

## Testing

### Mock Mode (Current)
1. Open mobile app
2. Enter any email and password
3. Tap "Sign In" or "Create Account"
4. You'll be logged in with mock credentials

### Production Mode
1. Complete Clerk setup above
2. Restart backend: `cd backend && npm run dev`
3. Test with real email/password
4. User will be created in Clerk
5. Webhook will sync to your database

## Security Notes

- ✅ Auth endpoints are public (no authentication middleware)
- ✅ Session tokens stored securely in AsyncStorage
- ✅ Password validation (min 8 characters)
- ✅ Email format validation
- ⚠️ In production, enable rate limiting for auth endpoints
- ⚠️ Consider adding reCAPTCHA for bot protection
- ⚠️ Enable 2FA in Clerk dashboard for added security

## Troubleshooting

### Error: "Cannot connect to backend"
- Check that backend is running on correct port
- Verify API_URL in `src/config/constants.js` matches your local IP
- Check firewall isn't blocking connections

### Error: "Invalid credentials"
- In mock mode, any credentials work
- In production mode, ensure Clerk keys are configured

### Social login not working
- Check OAuth redirect URLs in Clerk dashboard
- Ensure expo-auth-session is installed
- Verify OAuth endpoints return correct URLs

## Next Steps

1. ✅ Test current mock authentication flow
2. 🔧 Install Clerk SDK: `npm install @clerk/clerk-sdk-node`
3. 🔧 Uncomment production code in auth endpoints
4. 🔧 Add CLERK_SECRET_KEY to backend/.env.local
5. 🎯 Test with real Clerk authentication
6. 🎯 Configure social OAuth providers
7. 🎯 Implement OAuth mobile flow
8. 🚀 Deploy to production

## EAS Development Build Authentication Fix

### Problem with EAS Builds

Clerk OAuth authentication doesn't work in EAS development builds without proper configuration.

### ✅ Solution Applied

#### 1. Added Custom URL Scheme
Updated `app.json` with:
```json
{
  "expo": {
    "scheme": "matchtrackermobile"
  }
}
```

#### 2. Added Browser Warm-up
Both `SignInScreen.js` and `SignUpScreen.js` now include:
```javascript
const useWarmUpBrowser = () => {
  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};
```

### 🔧 Critical: Configure Clerk Dashboard

**YOU MUST DO THIS FOR OAUTH TO WORK:**

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Select your MatchTracker application
3. Navigate to: **Settings → Social Connections** (or **SSO Connections**)
4. For EACH OAuth provider (Google, Apple, Facebook):
   - Click on the provider
   - Add this redirect URL:
   ```
   matchtrackermobile://oauth-native-callback
   ```
   - Save changes

### 📱 Rebuild Required

After adding the redirect URLs to Clerk, rebuild your app:

```bash
# For iOS
eas build --profile development --platform ios

# For Android
eas build --profile development --platform android
```

**Why rebuild?** The app needs the new `scheme` configuration to handle OAuth redirects.

### Testing Checklist

- [ ] Redirect URL added to Clerk dashboard for each OAuth provider
- [ ] App rebuilt with `eas build`
- [ ] New build installed on device
- [ ] Email/password login works
- [ ] OAuth (Google/Apple/Facebook) login works

### Troubleshooting OAuth Issues

**"Invalid redirect URL" error:**
- Check Clerk dashboard has `matchtrackermobile://oauth-native-callback`
- Verify no typos in the URL

**Browser opens but doesn't redirect back:**
- Rebuild the app with the new scheme configuration
- Install the fresh build on your device

**Works in Expo Go but not in dev build:**
- Expo Go uses `exp://` scheme
- Dev builds use your custom scheme `matchtrackermobile://`
- Both need different redirect URLs in Clerk

## Files Modified

- `app.json` - Added `scheme: "matchtrackermobile"`
- `src/screens/SignInScreen.js` - Added `useWarmUpBrowser` hook, connected to backend API
- `src/screens/SignUpScreen.js` - Added `useWarmUpBrowser` hook, connected to backend API
- `backend/pages/api/auth/sign-in.js` - New sign-in endpoint
- `backend/pages/api/auth/sign-up.js` - New sign-up endpoint
- `backend/middleware.js` - Added auth routes to public routes
- `src/services/api.js` - Added getBaseUrl helper

## Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk React Native Guide](https://clerk.com/docs/quickstarts/react-native)
- [Expo AuthSession](https://docs.expo.dev/guides/authentication/)
- [Clerk OAuth Setup](https://clerk.com/docs/authentication/social-connections/oauth)
- [EAS Build Guide](https://docs.expo.dev/develop/development-builds/create-a-build/)

