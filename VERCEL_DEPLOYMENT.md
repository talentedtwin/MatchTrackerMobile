# Deploying MatchTracker Backend to Vercel

## Overview

Your Next.js backend is perfectly suited for Vercel deployment. This guide covers the complete deployment process.

## Prerequisites

- ✅ Vercel account (sign up at https://vercel.com)
- ✅ GitHub repository with your code
- ✅ Supabase database already set up
- ✅ Clerk account configured

## Method 1: Deploy via Vercel CLI (Recommended)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Navigate to Backend Directory

```bash
cd backend
```

### Step 4: Deploy

```bash
vercel
```

**First deployment prompts:**
- Set up and deploy? → **Yes**
- Which scope? → Select your account
- Link to existing project? → **No**
- Project name? → `matchtracker-backend` (or your choice)
- In which directory is your code? → **./** (current directory)
- Want to override settings? → **No**

This creates a **preview deployment** for testing.

### Step 5: Add Environment Variables

After the first deployment, add your environment variables:

```bash
# Add all your environment variables
vercel env add DATABASE_URL production
# Paste your Supabase DATABASE_URL when prompted

vercel env add DIRECT_URL production
# Paste your DIRECT_URL

vercel env add ENCRYPTION_KEY production
# Paste your encryption key

vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
# Paste your Clerk publishable key

vercel env add CLERK_SECRET_KEY production
# Paste your Clerk secret key

vercel env add CLERK_WEBHOOK_SECRET production
# Paste your webhook secret
```

**Important:** Also add these to **preview** and **development** environments:

```bash
vercel env add DATABASE_URL preview
vercel env add DATABASE_URL development
# Repeat for all variables
```

### Step 6: Deploy to Production

```bash
vercel --prod
```

Your backend will be live at: `https://matchtracker-backend.vercel.app`

---

## Method 2: Deploy via Vercel Dashboard (Easier for Beginners)

### Step 1: Push Code to GitHub

```bash
git add .
git commit -m "Prepare backend for Vercel deployment"
git push origin master
```

### Step 2: Import Project in Vercel

1. Go to https://vercel.com/dashboard
2. Click **"Add New Project"**
3. Import your GitHub repository
4. **Root Directory:** Select `backend`
5. **Framework Preset:** Next.js (auto-detected)
6. Click **"Deploy"**

### Step 3: Add Environment Variables in Dashboard

1. Go to **Project Settings** → **Environment Variables**
2. Add each variable:

| Name | Value | Environments |
|------|-------|--------------|
| `DATABASE_URL` | Your Supabase connection string | Production, Preview, Development |
| `DIRECT_URL` | Your direct connection string | Production, Preview, Development |
| `ENCRYPTION_KEY` | Your encryption key | Production, Preview, Development |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Your Clerk publishable key | Production, Preview, Development |
| `CLERK_SECRET_KEY` | Your Clerk secret key | Production, Preview, Development |
| `CLERK_WEBHOOK_SECRET` | Your webhook secret | Production, Preview, Development |

3. Click **"Save"**

### Step 4: Redeploy

After adding environment variables:
1. Go to **Deployments** tab
2. Click the three dots on the latest deployment
3. Click **"Redeploy"**

---

## Environment Variables Reference

Copy these values from your `.env.local`:

```bash
# From Supabase
DATABASE_URL="postgresql://postgres.ybevplllokkcagbalqvp:JPxjRyjjEx8IXPKr@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

DIRECT_URL="postgresql://postgres.ybevplllokkcagbalqvp:JPxjRyjjEx8IXPKr@aws-1-eu-west-2.pooler.supabase.com:5432/postgres"

# Your encryption key
ENCRYPTION_KEY="MzgWsdKjQ7gaBehWVgP8VK8spJLBWeHZ"

# From Clerk Dashboard
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_dW5pdGVkLWxpb25maXNoLTkwLmNsZXJrLmFjY291bnRzLmRldiQ"

CLERK_SECRET_KEY="sk_test_trtItgOGAP4KzNMj3dDEE7rgijZbEKZ8ByiKCyk6Ej"

CLERK_WEBHOOK_SECRET="whsec_Ic4sVM2SohNd1T24aF7fQBzMeTPSzPQP"
```

---

## Update Mobile App Configuration

After deployment, update your mobile app to use the Vercel URL:

### Update .env

```bash
# Change from local IP to Vercel URL
EXPO_PUBLIC_API_URL=https://matchtracker-backend.vercel.app/api
```

### Update eas.json

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://matchtracker-backend.vercel.app/api"
      }
    }
  }
}
```

---

## Vercel Configuration (`vercel.json`)

Already created for you! This file configures:
- Build settings
- Environment variable references
- API routes configuration

---

## Database Migrations

### Important: Run Migrations After First Deploy

Vercel doesn't automatically run migrations. You need to run them manually:

**Option 1: From Local Machine**
```bash
cd backend
npx prisma migrate deploy
```

**Option 2: Use Vercel CLI**
```bash
vercel env pull .env.production
npx prisma migrate deploy
```

---

## Update Clerk Webhook URL

After deploying, update your Clerk webhook:

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Navigate to **Webhooks**
3. Update the endpoint URL to:
   ```
   https://matchtracker-backend.vercel.app/api/webhooks/clerk
   ```

---

## Testing Your Deployment

### Test Health Endpoint

```bash
curl https://matchtracker-backend.vercel.app/api/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2025-10-26T...",
  "database": {
    "status": "healthy",
    "connected": true
  }
}
```

### Test from Mobile App

Update your `.env` and restart the app:
```bash
EXPO_PUBLIC_API_URL=https://matchtracker-backend.vercel.app/api
```

Then test:
- Sign in
- Load data
- Create a match
- View statistics

---

## Continuous Deployment

Vercel automatically deploys when you push to GitHub:

- **Push to `main`/`master`** → Production deployment
- **Push to other branches** → Preview deployment
- **Pull requests** → Preview deployment with comment

### Deployment Commands

```bash
# Deploy to preview
git push origin feature-branch

# Deploy to production
git push origin master
```

---

## Custom Domain (Optional)

### Add Custom Domain

1. Go to Vercel Dashboard → **Project Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `api.matchtracker.com`)
4. Follow DNS configuration instructions

### Update Mobile App

```bash
EXPO_PUBLIC_API_URL=https://api.matchtracker.com/api
```

---

## Monitoring & Logs

### View Deployment Logs

1. Go to Vercel Dashboard → **Deployments**
2. Click on a deployment
3. View **"Building"** and **"Function Logs"** tabs

### Real-time Logs (CLI)

```bash
vercel logs matchtracker-backend
```

---

## Common Issues & Solutions

### Issue 1: Build Fails with Prisma Error

**Error:** `@prisma/client did not initialize yet`

**Solution:** Make sure `postinstall` script is in `package.json`:
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

### Issue 2: Database Connection Error

**Error:** `Can't reach database server`

**Solution:** 
- Check `DATABASE_URL` is set in Vercel environment variables
- Ensure Supabase allows connections from Vercel IPs (usually automatic)

### Issue 3: CORS Errors

**Error:** `Access-Control-Allow-Origin` error

**Solution:** Already configured in `next.config.js`, but verify:
```javascript
headers: [
  { key: 'Access-Control-Allow-Origin', value: '*' }
]
```

### Issue 4: Environment Variables Not Working

**Solution:**
- Make sure they're set for all environments (Production, Preview, Development)
- Redeploy after adding variables
- Check variable names match exactly (case-sensitive)

---

## Performance Optimization

### 1. Edge Functions

Vercel automatically optimizes your API routes as edge functions for global performance.

### 2. Caching

Add caching headers for frequently accessed data:

```javascript
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
  // Your logic here
}
```

### 3. Database Connection Pooling

Already configured in your `DATABASE_URL` with `pgbouncer=true`.

---

## Cost Considerations

### Vercel Free Tier Includes:
- ✅ Unlimited deployments
- ✅ 100GB bandwidth per month
- ✅ Automatic HTTPS
- ✅ Git integration

### Supabase Free Tier Includes:
- ✅ 500MB database
- ✅ 1GB file storage
- ✅ 50,000 monthly active users

**Most hobby projects fit within free tiers!**

---

## Deployment Checklist

- [ ] Backend code pushed to GitHub
- [ ] Vercel account created and linked to GitHub
- [ ] Project imported/deployed to Vercel
- [ ] All environment variables added
- [ ] Database migrations run
- [ ] Clerk webhook URL updated
- [ ] Health endpoint tested
- [ ] Mobile app `.env` updated with Vercel URL
- [ ] Mobile app rebuilt with new API URL
- [ ] End-to-end testing completed

---

## Quick Deploy Commands

```bash
# One-time setup
cd backend
npm install -g vercel
vercel login
vercel

# Add environment variables
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
vercel env add ENCRYPTION_KEY production
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
vercel env add CLERK_SECRET_KEY production
vercel env add CLERK_WEBHOOK_SECRET production

# Deploy to production
vercel --prod

# Run migrations
npx prisma migrate deploy

# View logs
vercel logs
```

---

## Next Steps After Deployment

1. **Update mobile app** with production API URL
2. **Test all features** with production backend
3. **Monitor logs** for any errors
4. **Set up alerts** in Vercel dashboard (optional)
5. **Add custom domain** (optional)
6. **Configure CI/CD** (automatic via GitHub integration)

---

## Support & Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/solutions/nextjs)
- [Prisma on Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [Supabase + Vercel Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-vercel)

---

## Summary

**Best method:** Use Vercel CLI for full control, or Dashboard for simplicity.

**Steps:**
1. Deploy with `vercel` command or GitHub import
2. Add environment variables
3. Run database migrations
4. Update Clerk webhook
5. Update mobile app API URL
6. Test everything

**Your backend will be live at:** `https://matchtracker-backend.vercel.app/api` 🚀
