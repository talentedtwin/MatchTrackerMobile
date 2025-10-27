# External Cron Setup for Push Notifications

## Overview
Since Vercel's free (Hobby) plan only supports daily cron jobs, you need to use an external free cron service to call your notification check endpoint every minute.

## Production URL
Your backend is deployed at: **https://matchtracker-app.vercel.app**

The cron endpoint is at: **https://matchtracker-app.vercel.app/api/cron/check-matches**

## Option 1: cron-job.org (Recommended - Free)

1. Go to https://cron-job.org/en/
2. Sign up for a free account
3. Click "Create Cronjob"
4. Configure:
   - **Title**: "MatchTracker Notifications"
   - **URL**: `https://matchtracker-app.vercel.app/api/cron/check-matches`
   - **Schedule**: Every 1 minute
   - **Execution**: POST or GET request
   - **Optional**: Add custom header `Authorization: Bearer YOUR_SECRET` if you set CRON_SECRET env var

5. Save and enable the cron job

## Option 2: EasyCron (Free tier: 80 crons/day)

1. Go to https://www.easycron.com/
2. Sign up for free account
3. Click "Add Cron Job"
4. Configure:
   - **URL**: `https://matchtracker-app.vercel.app/api/cron/check-matches`
   - **Cron Expression**: `* * * * *` (every minute)
   - **HTTP Method**: GET or POST
   - **HTTP Auth**: Add bearer token if using CRON_SECRET

5. Save and enable

## Option 3: UptimeRobot (Free tier: 50 monitors)

UptimeRobot is primarily for monitoring but can trigger your endpoint regularly:

1. Go to https://uptimerobot.com/
2. Sign up for free account
3. Click "Add New Monitor"
4. Configure:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: "MatchTracker Cron"
   - **URL**: `https://matchtracker-app.vercel.app/api/cron/check-matches`
   - **Monitoring Interval**: 1 minute (not available on free tier - minimum 5 minutes)

⚠️ **Note**: UptimeRobot's free tier only allows 5-minute intervals

## Security (Optional)

To prevent unauthorized access to your cron endpoint:

1. Add an environment variable in Vercel Dashboard:
   - Name: `CRON_SECRET`
   - Value: Generate a random string (e.g., `openssl rand -hex 32`)

2. Configure your cron service to send this header:
   ```
   Authorization: Bearer YOUR_SECRET_HERE
   ```

## How It Works

1. External cron service calls `/api/cron/check-matches` every minute
2. The endpoint queries your database for matches starting in 10-11 minutes
3. For each upcoming match, it sends a push notification to users who have subscribed (have a push token)
4. Returns success/error response

## Monitoring

Check your cron job logs:
- cron-job.org: Dashboard → Your Job → Execution History
- Vercel logs: Dashboard → Your Project → Logs

## Testing

Test manually:
```bash
curl https://matchtracker-app.vercel.app/api/cron/check-matches
```

Expected response:
```json
{
  "success": true,
  "message": "Match notifications checked successfully",
  "timestamp": "2025-01-27T16:30:00.000Z"
}
```

## Cost

All recommended services have free tiers that are sufficient for this use case:
- **cron-job.org**: Unlimited crons on free tier ✅
- **EasyCron**: 80 crons/day (covers every minute for ~80 minutes)
- **UptimeRobot**: 50 monitors but minimum 5-minute interval

**Recommendation**: Use **cron-job.org** for the most reliable minute-by-minute checks.
