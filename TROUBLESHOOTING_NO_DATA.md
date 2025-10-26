# Troubleshooting: No Data Showing in App

## Problem
App shows no data after implementing push notifications.

## Root Cause Analysis

The most likely causes are:

### 1. **Missing Database Column** (Most Likely)
The `pushToken` column hasn't been added to the `users` table in the database yet.

### 2. **Backend API Errors**
The push token API endpoint is failing, which might be breaking other requests.

### 3. **Notification Initialization Blocking**
The notification setup is throwing an error that prevents the app from loading data.

## Quick Fixes Applied

### Mobile App Changes
✅ Made notification initialization **non-blocking**:
- Wrapped in try-catch
- Won't throw errors if it fails
- App continues to work even if notifications fail

✅ Updated `AppNavigator.js`:
```javascript
// Now catches errors and continues
initializeNotifications().catch(error => {
  console.error('Failed to initialize notifications:', error);
  // App continues normally
});
```

✅ Updated `notificationService.js`:
- Added error handling to `initializeNotifications()`
- Added error handling to `savePushToken()`
- Returns `null` gracefully on failure

### Backend Changes
✅ Made notification scheduler **non-blocking**:
- Wrapped in try-catch in `_app.js`
- Won't crash backend if it fails

## Solution Steps

### Option 1: Run Prisma Migration (Recommended)

```bash
cd backend
npx prisma migrate dev --name add_push_token
```

This will:
- Add the `pushToken` column to the database
- Update the Prisma client
- Keep track of the migration

### Option 2: Manual SQL (If Prisma Fails)

If the Prisma migration doesn't work, run this SQL directly on your database:

```sql
ALTER TABLE users ADD COLUMN "pushToken" TEXT NULL;
```

Or use the provided script:
```bash
psql -d your_database_name -f backend/prisma/add_push_token_manual.sql
```

### Option 3: Temporarily Disable Notifications

If you want to quickly test without notifications, comment out the initialization in `AppNavigator.js`:

```javascript
// Temporarily disabled
// initializeNotifications().catch(error => {
//   console.error('Failed to initialize notifications:', error);
// });
```

## Verification Steps

### 1. Check Database Schema
Run the check script:
```bash
psql -d your_database_name -f backend/prisma/check_database.sql
```

You should see `pushToken` in the columns list.

### 2. Check Mobile App Logs
Look for these messages:
- ✅ `"Expo Push Token: ExponentPushToken[...]"` - Good!
- ✅ `"Push token saved to backend"` - Good!
- ⚠️ `"Failed to get push token for push notification!"` - Expected in simulator
- ❌ `"Error saving push token:"` - Check backend API

### 3. Check Backend Logs
Look for these messages:
- ✅ `"Match notification scheduler started"` - Good!
- ❌ Any database errors about `pushToken` column - Need migration
- ❌ API errors on `/api/users/push-token` - Check endpoint

### 4. Test Data Loading
Try these actions in the app:
- [ ] Can you see existing teams?
- [ ] Can you see existing players?
- [ ] Can you see existing matches?
- [ ] Can you create new data?

## Common Error Messages

### "column users.pushToken does not exist"
**Fix**: Run the database migration (Option 1 or 2 above)

### "Failed to initialize notifications"
**Impact**: Notifications won't work, but app should still function
**Fix**: Not urgent - app will work without it

### "Must use physical device for Push Notifications"
**Impact**: This is expected in simulator/emulator
**Fix**: This is normal - notifications only work on real devices

## Prevention for Future

When adding new database columns:
1. Update `schema.prisma` ✅
2. Run `npx prisma migrate dev` ✅
3. Commit the migration files ✅
4. Make the feature optional/graceful ✅

## Files Modified

### Made Non-Blocking:
- `src/services/notificationService.js` - Error handling added
- `src/navigation/AppNavigator.js` - Non-blocking initialization
- `backend/pages/_app.js` - Safe scheduler startup

### SQL Scripts Created:
- `backend/prisma/add_push_token_manual.sql` - Manual migration
- `backend/prisma/check_database.sql` - Database verification

## Next Steps

1. **Run the migration** to add the `pushToken` column
2. **Restart the backend** server
3. **Restart the mobile app**
4. **Check if data loads** properly
5. If still no data, check backend API logs for other errors

## Still Not Working?

If data still doesn't show after running the migration:

1. **Check backend is running**: Visit `http://localhost:3001/api/health`
2. **Check Clerk authentication**: Make sure you're signed in
3. **Check API URL**: Verify `.env` has correct `EXPO_PUBLIC_API_URL`
4. **Check database connection**: Verify backend can connect to database
5. **Check console logs**: Look for specific error messages in both mobile and backend

## Contact Info

If you need more help, provide:
- Mobile app console logs
- Backend console logs
- Database column list (from check script)
- Any error messages you see
