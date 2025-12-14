#!/usr/bin/env node
/**
 * Match Notification Diagnostic Tool
 *
 * This script helps diagnose why match notifications aren't being sent.
 * It checks:
 * - Upcoming matches in the database
 * - User notification settings
 * - Match notification status
 * - Time windows for notifications
 *
 * Run with: node diagnose-notifications.js
 */

import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { getPrisma } from "./lib/prisma.js";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, ".env.local") });

async function diagnoseNotifications() {
  console.log("╔════════════════════════════════════════════════════╗");
  console.log("║   Match Notification Diagnostic Tool              ║");
  console.log("╚════════════════════════════════════════════════════╝\n");

  const prisma = getPrisma();

  try {
    // 1. Check database connection
    console.log("🔍 Step 1: Checking database connection...");
    try {
      await prisma.$connect();
      console.log("✅ Database connection successful\n");
    } catch (error) {
      console.error("❌ Database connection failed:", error.message);
      process.exit(1);
    }

    // 2. Check email configuration
    console.log("🔍 Step 2: Checking email configuration...");
    const emailConfigured = !!(
      process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN
    );
    if (emailConfigured) {
      console.log("✅ Email configuration present");
      console.log(`   Domain: ${process.env.MAILGUN_DOMAIN}`);
      console.log(
        `   From: ${
          process.env.MAILGUN_FROM_EMAIL || "Not set (will use default)"
        }\n`
      );
    } else {
      console.log("❌ Email configuration missing");
      console.log("   Set MAILGUN_API_KEY and MAILGUN_DOMAIN in .env.local\n");
    }

    // 3. Get current time and notification window
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const twentyFourHoursFromNow = new Date(
      now.getTime() + 24 * 60 * 60 * 1000
    );

    console.log("🔍 Step 3: Time windows for notifications...");
    console.log(`   Current time: ${now.toLocaleString()}`);
    console.log(
      `   Notification window: ${fiveMinutesFromNow.toLocaleTimeString()} - ${fifteenMinutesFromNow.toLocaleTimeString()}`
    );
    console.log("   (Matches in this window will receive notifications)\n");

    // 4. Check all users
    console.log("🔍 Step 4: Checking users and notification settings...");
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        emailNotifications: true,
        pushNotifications: true,
        pushToken: true,
        _count: {
          select: {
            matches: true,
          },
        },
      },
    });

    console.log(`   Found ${users.length} user(s)\n`);
    users.forEach((user, index) => {
      console.log(`   User ${index + 1}:`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Name: ${user.name || "Not set"}`);
      console.log(
        `   - Email notifications: ${
          user.emailNotifications ? "✅ Enabled" : "❌ Disabled"
        }`
      );
      console.log(
        `   - Push notifications: ${
          user.pushNotifications ? "✅ Enabled" : "❌ Disabled"
        }`
      );
      console.log(
        `   - Push token: ${user.pushToken ? "✅ Set" : "❌ Not set"}`
      );
      console.log(`   - Total matches: ${user._count.matches}`);
      console.log("");
    });

    // 5. Check matches in notification window (not yet notified)
    console.log(
      "🔍 Step 5: Checking matches in notification window (5-15 min)..."
    );
    const upcomingMatches = await prisma.match.findMany({
      where: {
        date: {
          gte: fiveMinutesFromNow,
          lte: fifteenMinutesFromNow,
        },
        isFinished: false,
        notificationSent: false,
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            emailNotifications: true,
            pushNotifications: true,
            pushToken: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    if (upcomingMatches.length > 0) {
      console.log(
        `   ✅ Found ${upcomingMatches.length} match(es) ready for notification:\n`
      );
      upcomingMatches.forEach((match, index) => {
        const minutesUntil = Math.round(
          (new Date(match.date).getTime() - now.getTime()) / 60000
        );
        console.log(`   Match ${index + 1}:`);
        console.log(`   - Opponent: ${match.opponent}`);
        console.log(`   - Date: ${new Date(match.date).toLocaleString()}`);
        console.log(`   - Minutes until match: ${minutesUntil}`);
        console.log(`   - Venue: ${match.venue || "Not set"}`);
        console.log(`   - Type: ${match.matchType || "Not set"}`);
        console.log(`   - User email: ${match.user.email}`);
        console.log(
          `   - Email notifications enabled: ${
            match.user.emailNotifications ? "Yes ✅" : "No ❌"
          }`
        );
        console.log(
          `   - Push notifications enabled: ${
            match.user.pushNotifications ? "Yes ✅" : "No ❌"
          }`
        );
        console.log(
          `   - Has push token: ${match.user.pushToken ? "Yes ✅" : "No ❌"}`
        );
        console.log(
          `   - Notification sent: ${match.notificationSent ? "Yes" : "No"}`
        );
        console.log("");
      });
    } else {
      console.log(`   ⚠️  No matches found in the notification window\n`);
    }

    // 6. Check matches already notified
    console.log("🔍 Step 6: Checking recently notified matches...");
    const notifiedMatches = await prisma.match.findMany({
      where: {
        notificationSent: true,
        date: {
          gte: now,
        },
      },
      orderBy: {
        notificationSentAt: "desc",
      },
      take: 5,
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (notifiedMatches.length > 0) {
      console.log(`   Found ${notifiedMatches.length} notified match(es):\n`);
      notifiedMatches.forEach((match, index) => {
        console.log(`   Match ${index + 1}:`);
        console.log(`   - Opponent: ${match.opponent}`);
        console.log(
          `   - Match date: ${new Date(match.date).toLocaleString()}`
        );
        console.log(
          `   - Notified at: ${
            match.notificationSentAt
              ? new Date(match.notificationSentAt).toLocaleString()
              : "Not set"
          }`
        );
        console.log(`   - User: ${match.user.email}`);
        console.log("");
      });
    } else {
      console.log(`   No recently notified matches found\n`);
    }

    // 7. Check upcoming matches (next 24 hours)
    console.log("🔍 Step 7: Checking all upcoming matches (next 24 hours)...");
    const allUpcomingMatches = await prisma.match.findMany({
      where: {
        date: {
          gte: now,
          lte: twentyFourHoursFromNow,
        },
        isFinished: false,
      },
      orderBy: {
        date: "asc",
      },
      include: {
        user: {
          select: {
            email: true,
            emailNotifications: true,
          },
        },
      },
    });

    if (allUpcomingMatches.length > 0) {
      console.log(
        `   Found ${allUpcomingMatches.length} upcoming match(es):\n`
      );
      allUpcomingMatches.forEach((match, index) => {
        const minutesUntil = Math.round(
          (new Date(match.date).getTime() - now.getTime()) / 60000
        );
        const hoursUntil = Math.round(minutesUntil / 60);
        const timeUntil =
          hoursUntil > 0
            ? `${hoursUntil}h ${minutesUntil % 60}min`
            : `${minutesUntil}min`;

        const inNotificationWindow = minutesUntil >= 5 && minutesUntil <= 15;

        console.log(`   Match ${index + 1}:`);
        console.log(`   - Opponent: ${match.opponent}`);
        console.log(`   - Date: ${new Date(match.date).toLocaleString()}`);
        console.log(`   - Time until match: ${timeUntil}`);
        console.log(
          `   - In notification window: ${
            inNotificationWindow ? "✅ Yes" : "❌ No"
          }`
        );
        console.log(
          `   - Notification sent: ${
            match.notificationSent ? "✅ Yes" : "❌ No"
          }`
        );
        console.log(
          `   - User: ${match.user.email} (Email: ${
            match.user.emailNotifications ? "On" : "Off"
          })`
        );
        console.log("");
      });
    } else {
      console.log(`   ⚠️  No matches scheduled in the next 24 hours\n`);
    }

    // 8. Summary and recommendations
    console.log("═".repeat(60));
    console.log("\n📋 SUMMARY & RECOMMENDATIONS:\n");

    if (allUpcomingMatches.length === 0) {
      console.log("❌ No matches scheduled in the next 24 hours");
      console.log("   → Schedule a match in the app to test notifications\n");
    } else if (upcomingMatches.length === 0) {
      const nextMatch = allUpcomingMatches[0];
      const minutesUntil = Math.round(
        (new Date(nextMatch.date).getTime() - now.getTime()) / 60000
      );

      if (minutesUntil < 5) {
        console.log("⚠️  Next match is less than 5 minutes away");
        console.log(
          "   → Notifications are only sent 5-15 minutes before match\n"
        );
      } else if (minutesUntil > 15) {
        console.log("⚠️  Next match is more than 15 minutes away");
        console.log(
          `   → Wait until the match is 5-15 minutes away (in ~${
            minutesUntil - 10
          } minutes)\n`
        );
      }

      if (nextMatch.notificationSent) {
        console.log("⚠️  Notification already sent for next match");
        console.log("   → Each match only sends one notification\n");
      }

      if (!nextMatch.user.emailNotifications) {
        console.log("❌ Email notifications disabled for next match");
        console.log("   → Enable email notifications in Settings screen\n");
      }
    } else {
      console.log("✅ Matches ready for notification");
      console.log("   → Run the cron job to send notifications:\n");
      console.log(
        "   curl -X POST http://localhost:3000/api/cron/check-matches\n"
      );
    }

    if (!emailConfigured) {
      console.log("❌ Email service not configured");
      console.log(
        "   → Set MAILGUN_API_KEY and MAILGUN_DOMAIN in .env.local\n"
      );
    }

    const usersWithoutEmail = users.filter((u) => !u.emailNotifications);
    if (usersWithoutEmail.length > 0) {
      console.log(
        `⚠️  ${usersWithoutEmail.length} user(s) have email notifications disabled`
      );
      console.log("   → Enable in the app Settings screen\n");
    }

    console.log("💡 To manually test email service:");
    console.log("   node test-email-service.js\n");
  } catch (error) {
    console.error("\n❌ Error during diagnosis:", error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run diagnostics
diagnoseNotifications().catch(console.error);
