# MatchTracker Backend - Quick Start Guide

## ✅ What's Been Set Up

Your backend now has:
- ✅ **Prisma ORM** with complete database schema
- ✅ **Clerk Authentication** integrated
- ✅ **Encryption Service** for sensitive data
- ✅ **Row Level Security** policies
- ✅ **Service Layer** (PlayerService, UserService)
- ✅ **Complete API Routes** (players, teams, matches, stats)
- ✅ **Webhook Handler** for user synchronization
- ✅ **Health Check** endpoint

## 🚀 Quick Start

### 1. Environment Setup

Your `.env.local` file should have these variables (already configured):

```env
# Database
DATABASE_URL="your_supabase_connection_pooling_url"
DIRECT_URL="your_supabase_direct_url"

# Clerk (you've added these)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
CLERK_WEBHOOK_SECRET="whsec_..." # Get this after setting up webhooks

# Encryption
ENCRYPTION_KEY="generate_secure_key"
```

### 2. Generate Encryption Key

Run this in PowerShell to generate a secure encryption key:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and add it to your `.env.local` as `ENCRYPTION_KEY`.

### 3. Initialize Database

```powershell
# Generate Prisma client (already done)
npm run db:generate

# Push schema to database
npm run db:push
```

### 4. Apply Row Level Security Policies

```powershell
# Connect to your Supabase database and run the RLS policies
# You'll need to run this in Supabase SQL Editor or using psql
```

Copy the contents of `prisma/clerk-rls.sql` and run it in your Supabase SQL Editor:
1. Go to Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Paste the entire contents of `prisma/clerk-rls.sql`
4. Click "Run"

### 5. Start Development Server

```powershell
npm run dev
```

Server will start at `http://localhost:3000`

### 6. Test Health Endpoint

```powershell
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-24T...",
  "database": {
    "status": "healthy",
    "connected": true
  },
  "environment": "development"
}
```

## 🔐 Setting Up Clerk Webhooks

Webhooks automatically sync Clerk users to your database.

### Option 1: Using ngrok (Local Development)

1. **Start your backend server:**
   ```powershell
   npm run dev
   ```

2. **Install ngrok** (if not installed):
   - Download from https://ngrok.com/download
   - Or install via Chocolatey: `choco install ngrok`

3. **Start ngrok:**
   ```powershell
   ngrok http 3000
   ```

4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

5. **Configure in Clerk Dashboard:**
   - Go to https://dashboard.clerk.com
   - Navigate to **Webhooks** → **Add Endpoint**
   - Endpoint URL: `https://abc123.ngrok.io/api/webhooks/clerk`
   - Select events: `user.created`, `user.updated`, `user.deleted`
   - Click **Create**
   - Copy the **Signing Secret** (starts with `whsec_`)
   - Add to `.env.local` as `CLERK_WEBHOOK_SECRET`

6. **Restart your server** to load the new environment variable

### Option 2: Production Deployment

When you deploy to Vercel or another host:
- Update webhook URL in Clerk to your production URL
- Example: `https://your-app.vercel.app/api/webhooks/clerk`

## 📝 Testing the API

### Get All Players (Protected)

This will fail without authentication:

```powershell
curl http://localhost:3000/api/players
```

Expected: `401 Unauthorized`

### With Authentication

You'll need a Clerk token. Get one by:
1. Setting up Clerk in your React Native app
2. Using Clerk's testing tools
3. Creating a test token

## 🎯 Next Steps

### 1. Update Frontend API URL

In your React Native app, update the API URL:

**File:** `src/config/constants.js`

```javascript
export const API_URL = 'http://localhost:3000/api'; // Development
// or
export const API_URL = 'https://your-app.vercel.app/api'; // Production
```

### 2. Integrate Clerk in React Native

Install Clerk Expo SDK:

```bash
cd ..  # Go back to root
npm install @clerk/clerk-expo
```

Update your `App.js`:

```javascript
import { ClerkProvider } from '@clerk/clerk-expo';

const publishableKey = 'pk_test_...'; // Your Clerk key

export default function App() {
  return (
    <ClerkProvider publishableKey={publishableKey}>
      {/* Your existing app */}
    </ClerkProvider>
  );
}
```

### 3. Update API Service to Use Clerk Tokens

**File:** `src/services/api.js`

```javascript
import { useAuth } from '@clerk/clerk-expo';

// In your API calls:
const token = await getToken();

axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

### 4. Test Full Flow

1. Sign up a user in your React Native app (using Clerk)
2. Webhook creates user in database automatically
3. User can now create teams, players, matches
4. All data is encrypted and protected by RLS

## 📚 Available Scripts

```powershell
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run linter
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database (dev)
npm run db:migrate   # Run migrations (production)
npm run db:studio    # Open Prisma Studio GUI
```

## 🔍 Verify Your Setup

### ✅ Checklist

- [ ] Dependencies installed (`node_modules` exists)
- [ ] `.env.local` created with all required variables
- [ ] `ENCRYPTION_KEY` generated and added
- [ ] Prisma client generated
- [ ] Database schema pushed to Supabase
- [ ] RLS policies applied in Supabase
- [ ] Server starts without errors (`npm run dev`)
- [ ] Health endpoint responds correctly
- [ ] Clerk webhook configured (optional for local, required for production)

### 🐛 Common Issues

**Issue: `ENCRYPTION_KEY is not set`**
- Solution: Generate a key and add to `.env.local`

**Issue: `Can't reach database server`**
- Solution: Check your `DATABASE_URL` is correct
- Verify Supabase project is running
- Check network connection

**Issue: `P2021: Table does not exist`**
- Solution: Run `npm run db:push` to create tables

**Issue: Webhook returns 400**
- Solution: Verify `CLERK_WEBHOOK_SECRET` matches Clerk dashboard
- Check webhook is sending to correct URL

## 📖 Documentation

- **`CLERK_SETUP.md`** - Complete Clerk authentication guide
- **`BACKEND_README.md`** - Full backend architecture documentation
- **`prisma/schema.prisma`** - Database schema documentation

## 🎉 You're Ready!

Your backend is fully configured with:
- 🔐 Secure authentication via Clerk
- 🔒 Encrypted sensitive data
- 🛡️ Row Level Security
- 📊 Complete REST API
- ⚡ Ready for production deployment

**Next:** Set up Clerk in your React Native app and start building!

## Need Help?

1. Check `CLERK_SETUP.md` for authentication issues
2. Check `BACKEND_README.md` for API documentation
3. Review terminal logs for error messages
4. Check Supabase dashboard for database issues
5. Check Clerk dashboard for authentication issues
