# Running MatchTracker Locally - Complete Guide

This guide will help you run both the React Native mobile app and the Next.js backend API locally.

## Prerequisites

Make sure you have the following installed:

- ✅ Node.js (v18 or higher)
- ✅ npm or yarn
- ✅ Expo CLI (`npm install -g expo-cli`)
- ✅ Expo Go app on your phone (download from App Store/Play Store)
- ✅ Git

## Quick Start (Both Frontend & Backend)

### Option 1: Run Everything with One Command

Open PowerShell in the project root and run:

```powershell
# Start both backend and frontend simultaneously
npm run dev
```

This will:
1. Start the Next.js backend on `http://localhost:3000`
2. Start the Expo development server
3. Open Expo DevTools in your browser

### Option 2: Run Backend and Frontend Separately

#### Terminal 1 - Start the Backend:

```powershell
cd backend
npm run dev
```

Backend will run on: `http://localhost:3000`

#### Terminal 2 - Start the Frontend:

```powershell
# From project root
npx expo start
# or
npm start
```

Expo DevTools will open at: `http://localhost:8081`

## Initial Setup (First Time Only)

### 1. Install All Dependencies

```powershell
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies (if not already installed)
npm install
```

### 2. Set Up Environment Variables

#### Backend Environment (`.env.local`):

```powershell
cd backend
Copy-Item .env.example .env.local
```

Edit `backend/.env.local` with your credentials:

```env
# Database (Supabase)
DATABASE_URL="your_supabase_pooling_url"
DIRECT_URL="your_supabase_direct_url"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Encryption
ENCRYPTION_KEY="generate_with_command_below"
```

**Generate Encryption Key:**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Frontend Environment (Optional):

Create `src/config/constants.js` if you need to override the API URL:

```javascript
export const API_URL = 'http://localhost:3000/api'; // For local backend
// or
export const API_URL = 'http://YOUR_LOCAL_IP:3000/api'; // For physical device
```

### 3. Set Up Database

```powershell
cd backend

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

### 4. Apply Row Level Security Policies

Open Supabase Dashboard → SQL Editor and run the contents of:
```
backend/prisma/clerk-rls.sql
```

## Running the Application

### Backend (Next.js API)

```powershell
cd backend
npm run dev
```

**Available at:**
- API: `http://localhost:3000/api`
- Health Check: `http://localhost:3000/api/health`
- Sign In: `http://localhost:3000/sign-in`
- Sign Up: `http://localhost:3000/sign-up`

**Verify it's running:**
```powershell
curl http://localhost:3000/api/health
```

### Frontend (React Native / Expo)

```powershell
# From project root
npx expo start
```

**Options to run:**

1. **📱 On Your Phone (Recommended for testing):**
   - Scan QR code with Expo Go app (iOS) or Camera app (Android)
   - Make sure phone and computer are on same WiFi network

2. **📲 iOS Simulator (Mac only):**
   ```
   Press 'i' in the terminal
   ```

3. **🤖 Android Emulator:**
   ```
   Press 'a' in the terminal
   ```
   (Requires Android Studio with emulator set up)

4. **🌐 Web Browser (limited functionality):**
   ```
   Press 'w' in the terminal
   ```

## Important: Connecting Frontend to Backend

### If Using Physical Device:

You need to use your computer's local IP address instead of `localhost`.

**Find your local IP:**

```powershell
# Windows
ipconfig
# Look for "IPv4 Address" under your active network adapter
```

**Update API URL in frontend:**

File: `src/config/constants.js`

```javascript
// Change from:
export const API_URL = 'http://localhost:3000/api';

// To your local IP:
export const API_URL = 'http://192.168.1.XXX:3000/api'; // Replace with your IP
```

**Restart Expo:**
```powershell
# Press 'r' to reload, or stop and restart:
npx expo start -c  # -c clears cache
```

## Troubleshooting

### Backend Issues

**Issue: "Cannot connect to database"**
```powershell
# Check DATABASE_URL is correct in .env.local
# Verify Supabase project is running
# Test connection:
cd backend
npm run db:studio
```

**Issue: "ENCRYPTION_KEY is not set"**
```powershell
# Generate key:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Add to backend/.env.local
```

**Issue: "Port 3000 already in use"**
```powershell
# Kill process on port 3000:
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port:
$env:PORT=3001; npm run dev
```

### Frontend Issues

**Issue: "Network request failed"**
- Make sure backend is running (`http://localhost:3000/api/health` works)
- If using physical device, use local IP address (see above)
- Check firewall isn't blocking port 3000

**Issue: "Unable to resolve module"**
```powershell
# Clear cache and reinstall:
npx expo start -c
# or
rm -rf node_modules
npm install
```

**Issue: Expo Go app can't connect**
- Ensure phone and computer are on same WiFi
- Try tunnel mode: `npx expo start --tunnel`
- Check firewall settings

### Authentication Issues

**Issue: "401 Unauthorized"**
- Verify Clerk keys are set in `backend/.env.local`
- Check webhook is configured in Clerk dashboard
- Try signing out and signing in again

**Issue: Sign-in page doesn't load**
- Make sure backend is running
- Navigate to: `http://localhost:3000/sign-in`
- Check Clerk dashboard for errors

## Development Workflow

### Recommended Setup:

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
npx expo start
```

**Terminal 3 - Database Studio (optional):**
```powershell
cd backend
npm run db:studio
```

### Hot Reload:

- **Backend:** Automatically reloads on file changes
- **Frontend:** Shake device or press 'r' in terminal to reload
- **Fast Refresh:** Most React Native changes reload automatically

## Testing the Full Flow

### 1. Test Backend:
```powershell
# Health check
curl http://localhost:3000/api/health

# Should return:
# { "status": "ok", "timestamp": "...", "database": { "status": "healthy" } }
```

### 2. Test Sign-Up:
- Open `http://localhost:3000/sign-up` in browser
- Create account with email
- Check email for verification code
- Enter code and complete signup

### 3. Test Mobile App:
- Open Expo Go and scan QR code
- App should load
- Try signing in with account created in step 2
- Create teams, players, matches

## Available Scripts

### Root Level:
```powershell
npm start          # Start Expo frontend
npm run dev        # Start both backend and frontend
npm run backend    # Start backend only
```

### Backend:
```powershell
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to database
npm run db:migrate     # Run migrations
npm run db:studio      # Open Prisma Studio
```

### Frontend (Expo):
```powershell
npx expo start         # Start dev server
npx expo start -c      # Start with cache cleared
npx expo start --tunnel  # Use tunnel mode (for restricted networks)
npx expo build:android   # Build Android app
npx expo build:ios       # Build iOS app
```

## Production Considerations

### Backend Deployment:

**Vercel (Recommended):**
```powershell
cd backend
vercel
```

### Frontend Deployment:

**EAS Build:**
```powershell
npm install -g eas-cli
eas build --platform android
eas build --platform ios
```

## Common Development Tasks

### Add a new API endpoint:
1. Create file in `backend/pages/api/`
2. Backend auto-reloads
3. Update `src/services/api.js` in frontend
4. Use the new endpoint in your screens

### Add a new screen:
1. Create file in `src/screens/`
2. Update `src/navigation/AppNavigator.js`
3. Reload app (shake device or press 'r')

### Database schema changes:
```powershell
cd backend
# Edit prisma/schema.prisma
npm run db:push          # Apply changes
npm run db:generate      # Regenerate client
# Restart backend server
```

## Performance Tips

1. **Use Fast Refresh:** Most changes reflect instantly without full reload
2. **Clear cache if stuck:** `npx expo start -c`
3. **Use production build for testing:** Expo Go is debug mode (slower)
4. **Monitor backend logs:** Watch terminal for API errors
5. **Use Prisma Studio:** Visual database browser at `http://localhost:5555`

## Getting Help

### Check Logs:

**Backend logs:** Terminal where you ran `npm run dev`
**Frontend logs:** Expo DevTools browser window
**Database:** Prisma Studio (`npm run db:studio`)

### Common Log Locations:

- Backend API errors: Backend terminal
- Frontend crashes: Expo DevTools → Logs
- Network errors: React Native debugger
- Authentication: Clerk dashboard → Logs

## Quick Reference

| Service | URL | Terminal |
|---------|-----|----------|
| Backend API | http://localhost:3000/api | `cd backend && npm run dev` |
| Sign In | http://localhost:3000/sign-in | Same as above |
| Sign Up | http://localhost:3000/sign-up | Same as above |
| Frontend | Expo Go App | `npx expo start` |
| Expo DevTools | http://localhost:8081 | Opens automatically |
| Prisma Studio | http://localhost:5555 | `npm run db:studio` |
| Health Check | http://localhost:3000/api/health | Test backend |

## Next Steps

1. ✅ Backend running on port 3000
2. ✅ Frontend running in Expo
3. ✅ Create test account at /sign-up
4. ✅ Test creating teams, players, matches
5. ✅ Monitor logs for errors
6. ✅ Read API documentation in `backend/BACKEND_README.md`

Need help? Check:
- `backend/CLERK_SETUP.md` - Authentication setup
- `backend/QUICKSTART.md` - Backend quick start
- `backend/BACKEND_README.md` - Full API documentation
- `SCREENS_IMPLEMENTATION.md` - Frontend screens documentation

Happy coding! ⚽🚀
