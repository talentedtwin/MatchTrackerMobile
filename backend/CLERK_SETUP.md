# Clerk Authentication Setup Guide

This guide will help you set up Clerk authentication for the MatchTracker backend.

## Prerequisites

- A Clerk account (sign up at https://clerk.com)
- Your backend environment variables configured

## Step 1: Create a Clerk Application

1. Go to https://dashboard.clerk.com
2. Click **"Create Application"**
3. Choose your application name (e.g., "MatchTracker")
4. Select your authentication methods:
   - Email (recommended)
   - Google OAuth (optional)
   - Other providers as needed
5. Click **"Create Application"**

## Step 2: Get Your API Keys

After creating your application, you'll see your API keys:

1. Copy the **Publishable Key** (starts with `pk_test_` or `pk_live_`)
2. Copy the **Secret Key** (starts with `sk_test_` or `sk_live_`)

## Step 3: Configure Environment Variables

Add the following to your `.env` or `.env.local` file:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_your_key_here"
CLERK_SECRET_KEY="sk_test_your_key_here"
CLERK_WEBHOOK_SECRET="whsec_your_webhook_secret_here"
```

## Step 4: Set Up Webhooks (Important!)

Webhooks sync Clerk users with your database automatically.

### Configure Webhook in Clerk Dashboard

1. In your Clerk dashboard, go to **Webhooks** in the left sidebar
2. Click **"Add Endpoint"**
3. Enter your webhook URL:
   - Development: `https://your-ngrok-url.ngrok.io/api/webhooks/clerk`
   - Production: `https://your-domain.com/api/webhooks/clerk`

4. Select the following events:
   - ✅ `user.created`
   - ✅ `user.updated`
   - ✅ `user.deleted`

5. Click **"Create"**

6. Copy the **Signing Secret** (starts with `whsec_`)
   - Add this to your `.env` as `CLERK_WEBHOOK_SECRET`

### Testing Webhooks Locally

To test webhooks locally, use ngrok:

```powershell
# Install ngrok (if not already installed)
# Download from https://ngrok.com/download

# Start your Next.js server
npm run dev

# In another terminal, start ngrok
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Use this in Clerk webhook configuration: https://abc123.ngrok.io/api/webhooks/clerk
```

## Step 5: Install Dependencies

Make sure all dependencies are installed:

```powershell
cd backend
npm install
```

This will install:
- `@clerk/nextjs` - Clerk Next.js SDK
- `svix` - Webhook verification library

## Step 6: Test Authentication

### 1. Start the development server:
```powershell
npm run dev
```

### 2. Test the health endpoint (no auth required):
```powershell
curl http://localhost:3000/api/health
```

### 3. Test protected endpoint (requires auth):
```powershell
# This should return 401 Unauthorized
curl http://localhost:3000/api/players
```

## How Authentication Works

### 1. Middleware Protection
The `middleware.js` file at the root protects all API routes except public ones:

```javascript
publicRoutes: [
  "/api/health",      // Health check
  "/api/webhooks(.*)" // Webhooks
]
```

### 2. Request Flow
```
Client Request
    ↓
Clerk Middleware (validates session)
    ↓
API Route Handler
    ↓
requireAuth() function
    ↓
Get userId from Clerk
    ↓
Ensure user exists in DB
    ↓
Set RLS context
    ↓
Execute database operation
```

### 3. User Synchronization
When a user signs up in Clerk:
1. Clerk sends webhook to `/api/webhooks/clerk`
2. Webhook handler creates user in database with encrypted data
3. User can now make authenticated API calls

## Frontend Integration

### For React Native (Expo)

Install Clerk Expo SDK:
```bash
npm install @clerk/clerk-expo
```

Configure in your React Native app:
```javascript
import { ClerkProvider } from '@clerk/clerk-expo';

function App() {
  return (
    <ClerkProvider publishableKey="pk_test_...">
      {/* Your app */}
    </ClerkProvider>
  );
}
```

### Making Authenticated Requests

```javascript
import { useAuth } from '@clerk/clerk-expo';

function MyComponent() {
  const { getToken } = useAuth();
  
  const fetchData = async () => {
    const token = await getToken();
    
    const response = await fetch('http://localhost:3000/api/players', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const data = await response.json();
    return data;
  };
}
```

## API Endpoints

### Public (No Authentication Required)
- `GET /api/health` - Health check
- `POST /api/webhooks/clerk` - Clerk webhook handler

### Protected (Authentication Required)
- `GET /api/users` - Get current user
- `PUT /api/users` - Update current user
- `GET /api/players` - List players
- `POST /api/players` - Create player
- `GET /api/players/[id]` - Get player
- `PUT /api/players/[id]` - Update player
- `DELETE /api/players/[id]` - Delete player
- `GET /api/teams` - List teams
- `POST /api/teams` - Create team
- `GET /api/teams/[id]` - Get team
- `PUT /api/teams/[id]` - Update team
- `DELETE /api/teams/[id]` - Delete team
- `GET /api/matches` - List matches
- `POST /api/matches` - Create match
- `GET /api/matches/[id]` - Get match
- `PUT /api/matches/[id]` - Update match
- `DELETE /api/matches/[id]` - Delete match
- `GET /api/stats` - Get statistics
- `GET /api/player-match-stats` - Player match stats
- `POST /api/player-match-stats` - Create player match stat

## Troubleshooting

### 401 Unauthorized Error
**Problem**: API returns 401 even with valid token

**Solutions**:
1. Check that `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set correctly
2. Verify `CLERK_SECRET_KEY` is set correctly
3. Ensure token is passed in Authorization header: `Bearer <token>`
4. Check that middleware.js is in the root of the backend folder

### Webhook Not Working
**Problem**: Users not syncing to database

**Solutions**:
1. Verify `CLERK_WEBHOOK_SECRET` is set correctly
2. Check webhook URL is accessible (use ngrok for local testing)
3. Verify webhook events are selected in Clerk dashboard
4. Check backend logs for webhook errors
5. Test webhook manually using Clerk dashboard "Send Test Event"

### User Not Found in Database
**Problem**: Authentication works but API says user not found

**Solutions**:
1. Ensure webhook is configured and working
2. Manually trigger user creation:
   ```javascript
   await UserService.ensureUserExists(userId, { email, name });
   ```
3. Check database connection
4. Verify RLS policies are applied

### CORS Errors
**Problem**: Browser blocks API requests

**Solutions**:
1. Check `next.config.js` CORS headers are configured
2. Verify API is running on correct port
3. Use full URL in API calls (not relative paths)

## Security Best Practices

1. **Never commit secrets**
   - Keep `.env` files out of git
   - Use `.env.example` for templates

2. **Use environment-specific keys**
   - Test keys (`pk_test_`, `sk_test_`) for development
   - Live keys (`pk_live_`, `sk_live_`) for production

3. **Rotate webhook secrets**
   - Periodically rotate webhook secrets
   - Update in both Clerk dashboard and `.env`

4. **Monitor webhook logs**
   - Check Clerk dashboard for webhook delivery status
   - Monitor your backend logs for webhook errors

5. **Rate limiting**
   - Consider implementing rate limiting for API routes
   - Clerk has built-in rate limiting for authentication

## Testing Authentication

### Test Script (Node.js)

Create a test file `test-auth.js`:

```javascript
const fetch = require('node-fetch');

async function testAuth() {
  // Replace with actual token from Clerk
  const token = 'your_clerk_token_here';
  
  const response = await fetch('http://localhost:3000/api/users', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  const data = await response.json();
  console.log('Response:', data);
}

testAuth();
```

Run with:
```powershell
node test-auth.js
```

## Production Deployment

### Environment Variables Checklist

Before deploying to production, ensure you have:

- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (live key)
- [ ] `CLERK_SECRET_KEY` (live key)
- [ ] `CLERK_WEBHOOK_SECRET` (webhook signing secret)
- [ ] `DATABASE_URL` (production database)
- [ ] `DIRECT_URL` (production database direct)
- [ ] `ENCRYPTION_KEY` (secure random key)
- [ ] `NODE_ENV=production`

### Webhook Configuration

1. Update webhook URL in Clerk dashboard to production URL
2. Ensure endpoint is publicly accessible
3. Test webhook delivery from Clerk dashboard
4. Monitor webhook logs

### Database

1. Run migrations:
   ```powershell
   npm run db:migrate
   ```

2. Apply RLS policies:
   ```powershell
   psql $DATABASE_URL -f prisma/clerk-rls.sql
   ```

## Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Next.js Guide](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk Webhooks](https://clerk.com/docs/users/sync-data-to-your-backend)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Prisma Documentation](https://www.prisma.io/docs)

## Support

If you encounter issues:
1. Check this guide
2. Review Clerk documentation
3. Check backend logs
4. Test with ngrok for local development
5. Verify environment variables are set correctly
