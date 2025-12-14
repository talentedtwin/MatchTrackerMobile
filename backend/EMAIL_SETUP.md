# Email Notifications Setup with Mailgun

This guide explains how to set up email notifications using Mailgun for MatchTracker.

## Prerequisites

1. A Mailgun account (free tier available)
2. A verified domain (or use Mailgun's sandbox domain for testing)

## Setup Steps

### 1. Create a Mailgun Account

1. Go to [Mailgun](https://www.mailgun.com/) and sign up
2. Verify your email address
3. Complete the account setup

### 2. Get Your API Credentials

1. Log in to your Mailgun dashboard
2. Go to **Settings** → **API Keys**
3. Copy your **Private API Key** (starts with `key-...`)
4. Note your **Domain** (either your custom domain or the sandbox domain like `sandboxXXX.mailgun.org`)

### 3. Configure Environment Variables

Add the following environment variables to your backend:

**Local Development** (`.env.local`):

```env
MAILGUN_API_KEY=key-your-api-key-here
MAILGUN_DOMAIN=your-domain.mailgun.org
MAILGUN_FROM_EMAIL=MatchTracker <noreply@your-domain.mailgun.org>
```

**Vercel Deployment**:

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add the three variables above
4. Redeploy your application

### 4. Install Dependencies

The Mailgun package needs to be installed:

```bash
cd backend
npm install mailgun.js form-data
```

### 5. Domain Verification (Production)

For production use with your own domain:

1. In Mailgun dashboard, go to **Sending** → **Domains**
2. Click **Add New Domain**
3. Follow the DNS setup instructions
4. Add the provided DNS records to your domain:
   - TXT record for domain verification
   - MX records for receiving emails (optional)
   - CNAME records for tracking (optional)

### 6. Testing with Sandbox Domain

For testing, you can use Mailgun's sandbox domain:

1. In Mailgun dashboard, go to **Sending** → **Overview**
2. Find your sandbox domain (e.g., `sandbox123abc.mailgun.org`)
3. Add authorized recipients:
   - Go to **Sending** → **Domains** → Select sandbox domain
   - Click **Authorized Recipients**
   - Add email addresses that should receive test emails
   - Verify each email address via the confirmation email

**Note**: Sandbox domains can only send to authorized recipients!

## Email Templates

The email service includes two pre-built templates:

### 1. Match Reminder Email

Sent 5-15 minutes before a match starts (if user has email notifications enabled).

**Features:**

- Match details (opponent, date, time, venue, type)
- Professional HTML template with responsive design
- Plain text fallback for email clients that don't support HTML

### 2. Welcome Email

Can be sent when a new user signs up.

**Features:**

- Welcome message
- Feature highlights
- Professional branding

## Usage Examples

### Sending a Match Reminder

```javascript
import { sendMatchReminderEmail } from "./lib/emailService.js";

await sendMatchReminderEmail("user@example.com", "John Doe", {
  id: "match-123",
  opponent: "FC United",
  venue: "Stadium Arena",
  date: new Date("2024-12-10T15:00:00Z"),
  type: "league",
});
```

### Sending a Welcome Email

```javascript
import { sendWelcomeEmail } from "./lib/emailService.js";

await sendWelcomeEmail("user@example.com", "John Doe");
```

### Custom Email

```javascript
import { sendEmail } from "./lib/emailService.js";

await sendEmail({
  to: "user@example.com",
  subject: "Custom Email",
  text: "Plain text content",
  html: "<h1>HTML content</h1>",
});
```

## Notification Preferences

Users can control their email notification preferences via the Settings screen:

- **Email Notifications Toggle**: Enable/disable match reminder emails
- **Push Notifications Toggle**: Enable/disable push notifications

The notification scheduler respects these preferences:

- Only sends emails if `emailNotifications: true`
- Only sends push notifications if `pushNotifications: true`

## Automatic Notifications

The match notification scheduler (`matchNotificationScheduler.js`) automatically:

1. Runs every minute via cron job
2. Finds matches starting in 5-15 minutes
3. Checks user notification preferences
4. Sends push notifications (if enabled and token available)
5. Sends email notifications (if enabled)
6. Marks matches as notified to prevent duplicates

## Troubleshooting

### Emails Not Sending

1. **Check environment variables**: Ensure `MAILGUN_API_KEY` and `MAILGUN_DOMAIN` are set
2. **Check logs**: Look for error messages in the console
3. **Verify API key**: Make sure you're using the Private API Key, not the Public API Key
4. **Check domain**: Ensure the domain is correctly verified in Mailgun
5. **Sandbox limitations**: If using sandbox domain, ensure recipient email is authorized

### Testing Email Delivery

You can test email delivery by:

1. Creating a match scheduled for ~10 minutes in the future
2. Ensuring your user has `emailNotifications: true`
3. Waiting for the notification scheduler to run
4. Checking your email inbox (and spam folder)

Or manually trigger an email in the backend:

```javascript
import { sendMatchReminderEmail } from "./lib/emailService.js";

// In an API route or test script
await sendMatchReminderEmail("your-email@example.com", "Test User", {
  id: "test-123",
  opponent: "Test Opponent",
  venue: "Test Venue",
  date: new Date(),
  type: "friendly",
});
```

## Rate Limits

**Mailgun Free Tier:**

- 5,000 emails per month
- 100 emails per day for first month
- After domain verification: full 5,000/month quota

**Best Practices:**

- Monitor your email quota in Mailgun dashboard
- Implement email batching for multiple recipients
- Use push notifications as primary method (emails as backup)

## Production Checklist

- [ ] Custom domain configured and verified
- [ ] DNS records properly set up
- [ ] Environment variables configured in Vercel
- [ ] Test emails sent successfully
- [ ] Rate limits understood
- [ ] User notification preferences tested
- [ ] Email templates reviewed and customized (optional)

## Additional Resources

- [Mailgun Documentation](https://documentation.mailgun.com/)
- [Mailgun Node.js SDK](https://github.com/mailgun/mailgun-js)
- [Email Best Practices](https://www.mailgun.com/blog/email-best-practices/)
