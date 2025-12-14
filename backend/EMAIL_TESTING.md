# Email Notification Testing & Troubleshooting

## Quick Test Scripts

I've created three scripts to help you test and diagnose email notifications:

### 1. Email Service Test Script

**Purpose:** Test if Mailgun email service is configured correctly

**Run (interactive):**

```bash
cd backend
node test-email-service.js
```

**Run (with arguments):**

```bash
# Test specific email type
node test-email-service.js your@email.com 1    # Simple test
node test-email-service.js your@email.com 2    # Match reminder
node test-email-service.js your@email.com 3    # Welcome email
node test-email-service.js your@email.com all  # All tests
```

**Features:**

- Interactive CLI tool or command-line arguments
- Tests simple emails, match reminders, and welcome emails
- Validates Mailgun configuration
- Provides detailed error messages

### 2. PowerShell Quick Test

**Purpose:** Quick email test for Windows

**Run:**

```powershell
cd backend
.\test-email.ps1
```

### 3. Notification Diagnostic Tool

**Purpose:** Diagnose why match notifications aren't being sent

**Run:**

```bash
cd backend
node diagnose-notifications.js
```

**What it checks:**

- Database connection
- Email configuration (Mailgun)
- User notification settings
- Matches in the notification window (5-15 min before start)
- Already notified matches
- Upcoming matches in next 24 hours

---

## Common Issues & Solutions

### ❌ "Error 401 Unauthorized / Forbidden"

**Error message:**

```
❌ Error sending email: [Error: Unauthorized]
status: 401, details: 'Forbidden', type: 'MailgunAPIError'
```

**This means your Mailgun API key is incorrect or invalid.**

**How to fix:**

1. **Verify your API key:**

   ```bash
   node verify-mailgun-config.js
   ```

   This will test your credentials and show exactly what's wrong.

2. **Get the correct API key:**

   - Go to https://app.mailgun.com/
   - Click "Settings" → "API Keys" in the sidebar
   - Copy your **Private API key** (NOT the Public key)
   - It should look like: `key-1234567890abcdef1234567890abcdef` or `1234567890abcdef-12345678-12345678`

3. **Update your .env.local file:**

   ```env
   MAILGUN_API_KEY=your-private-api-key-here
   MAILGUN_DOMAIN=mg.yourdomain.com
   ```

   **Important:**

   - NO spaces around the `=` sign
   - NO quotes around the values
   - Make sure you copied the FULL key

4. **Check for common mistakes:**

   - Using Public key instead of Private key
   - Extra spaces or line breaks in the key
   - Wrong region (EU vs US accounts)
   - API key was regenerated in Mailgun dashboard

5. **Restart your development server** after changing .env.local

---

### ❌ "Didn't receive email notification for scheduled match"

**Possible causes:**

1. **Match timing**

   - Notifications are sent 5-15 minutes before match start
   - If your match is not in this window, you won't get a notification yet
   - **Solution:** Run `node diagnose-notifications.js` to see when your match will be notified

2. **Email notifications disabled**

   - Check Settings screen in the app
   - Ensure "Email Notifications" toggle is ON
   - **Solution:** Enable in Settings → Email Notifications

3. **Mailgun not configured**

   - Missing `MAILGUN_API_KEY` or `MAILGUN_DOMAIN` in `.env.local`
   - **Solution:** Add credentials to `.env.local` file

4. **Notification already sent**

   - Each match only sends ONE notification
   - Check `notificationSent` field in database
   - **Solution:** Create a new match to test

5. **Cron job not running**

   - The `/api/cron/check-matches` endpoint must be called every 5 minutes
   - **Solution:** Set up external cron service (see CRON_SETUP.md)

6. **Sandbox domain restrictions**
   - Mailgun sandbox domains only send to authorized recipients
   - **Solution:** Add your email to authorized recipients in Mailgun dashboard

---

## Testing Workflow

### Step 1: Verify Mailgun Configuration

```bash
cd backend
node verify-mailgun-config.js
```

This will test your API credentials and show any configuration issues.

**Expected result:** ✅ Successfully connected to Mailgun!

### Step 2: Test Email Service

```bash
cd backend
# Quick test with your email
node test-email-service.js your@email.com 1

# Or run interactively
node test-email-service.js
```

Enter your email and select test type.

**Expected result:** You should receive an email within 1-2 minutes.

### Step 3: Run Diagnostics

```bash
cd backend
node diagnose-notifications.js
```

**Look for:**

- ✅ Database connection successful
- ✅ Email configuration present
- User email notifications enabled
- Matches in notification window

### Step 4: Check Match Timing

Notifications are sent **5-15 minutes before** match start time.

**Example:**

- Match time: 3:00 PM
- Notification window: 2:45 PM - 2:55 PM

### Step 5: Manual Cron Trigger (if needed)

If you have matches in the notification window, manually trigger:

```bash
# Local development
curl -X POST http://localhost:3000/api/cron/check-matches

# Production (with auth)
curl -X POST https://your-domain.vercel.app/api/cron/check-matches \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Configuration Checklist

### Required Environment Variables

In `backend/.env.local`:

```env
# Mailgun Email Service
MAILGUN_API_KEY=your-api-key-here
MAILGUN_DOMAIN=your-domain.mailgun.org
MAILGUN_FROM_EMAIL=noreply@yourdomain.com  # Optional

# Cron Security (optional but recommended)
CRON_SECRET=your-random-secret-here
```

### Get Mailgun Credentials

1. Sign up at https://mailgun.com
2. Go to Sending → Domains
3. Copy your domain and API key
4. For production: Verify your domain
5. For testing: Use sandbox domain and add authorized recipients

---

## Email Notification Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. User creates match in app                            │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Match stored in database                             │
│    - notificationSent: false                            │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│ 3. External cron service calls                          │
│    /api/cron/check-matches every 5 minutes              │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Scheduler checks for matches 5-15 min away           │
│    WHERE notificationSent = false                       │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│ 5. If match found:                                      │
│    - Send email (if emailNotifications = true)          │
│    - Send push (if pushNotifications = true)            │
│    - Mark notificationSent = true                       │
└─────────────────────────────────────────────────────────┘
```

---

## Debugging Commands

### Check database matches

```sql
-- In Supabase SQL Editor
SELECT
  id,
  opponent,
  date,
  "notificationSent",
  "emailNotifications"
FROM "Match"
WHERE date > NOW()
ORDER BY date ASC;
```

### Check user settings

```sql
SELECT
  email,
  "emailNotifications",
  "pushNotifications"
FROM "User";
```

### Check Mailgun logs

1. Go to https://app.mailgun.com
2. Click "Logs" in sidebar
3. Filter by recipient email
4. Look for delivery status

---

## Testing Best Practices

1. **Start with simple email test**

   - Use `test-email-service.js` first
   - Confirms Mailgun is working

2. **Check your settings**

   - Ensure email notifications are enabled in app
   - Run diagnostic tool to verify

3. **Test with correct timing**

   - Create a match 10 minutes in the future
   - Wait for notification window (5-15 min before)
   - Manually trigger cron if needed

4. **Check spam folder**

   - Email might be filtered as spam
   - Add sender to contacts/whitelist

5. **Verify domain**
   - Production: Use verified domain
   - Testing: Use sandbox with authorized recipients

---

## Support Resources

- **Mailgun Documentation:** https://documentation.mailgun.com
- **Mailgun Dashboard:** https://app.mailgun.com
- **Email Service Code:** `backend/lib/emailService.js`
- **Notification Scheduler:** `backend/lib/matchNotificationScheduler.js`
- **Cron Endpoint:** `backend/pages/api/cron/check-matches.js`

---

## Quick Commands Reference

```bash
# Verify Mailgun credentials (ALWAYS RUN THIS FIRST!)
node verify-mailgun-config.js

# Test email service (interactive)
node test-email-service.js

# Test email service (command-line)
node test-email-service.js your@email.com all

# Diagnose notification issues
node diagnose-notifications.js

# PowerShell test (Windows)
.\test-email.ps1

# Manual cron trigger
curl -X POST http://localhost:3000/api/cron/check-matches

# Check logs (if running locally)
npm run dev
# Watch console for notification logs
```
