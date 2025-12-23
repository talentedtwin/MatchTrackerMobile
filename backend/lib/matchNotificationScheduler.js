import cron from "node-cron";
import { getPrisma } from "./prisma.js";
import { sendMatchReminderNotification } from "./notificationService.js";
import { sendMatchReminderEmail } from "./emailService.js";
import EncryptionService from "./encryption.js";

/**
 * Check for matches starting in 5-15 minutes and send notifications
 * This wider window allows the cron job to run less frequently (every 2-5 minutes)
 * while still catching all matches
 */
async function checkUpcomingMatches() {
  const prisma = getPrisma();

  try {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);

    console.log("⏰ Checking for upcoming matches...");
    console.log("   Current time:", now.toISOString());
    console.log("   5 minutes from now:", fiveMinutesFromNow.toISOString());
    console.log("   15 minutes from now:", fifteenMinutesFromNow.toISOString());
    console.log("   Looking for matches scheduled between these times ↑");

    // Find matches that start between 5-15 minutes from now
    // that haven't had a notification sent yet
    const upcomingMatches = await prisma.match.findMany({
      where: {
        date: {
          gte: fiveMinutesFromNow,
          lte: fifteenMinutesFromNow,
        },
        isFinished: false,
        notificationSent: false, // Only matches that haven't been notified
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            pushToken: true,
            pushNotifications: true,
            emailNotifications: true,
          },
        },
      },
    });

    console.log(
      `   Found ${upcomingMatches.length} matches starting in 5-15 minutes (not yet notified)`
    );

    if (upcomingMatches.length > 0) {
      upcomingMatches.forEach((match) => {
        const minutesUntil = Math.round(
          (new Date(match.date).getTime() - now.getTime()) / 60000
        );
        console.log(
          `   - Match vs ${match.opponent} at ${new Date(
            match.date
          ).toISOString()} (${minutesUntil} minutes away)`
        );
      });
    }

    // Send notifications for each match
    for (const match of upcomingMatches) {
      const minutesUntil = Math.round(
        (new Date(match.date).getTime() - now.getTime()) / 60000
      );
      let notificationSent = false;

      // Send push notification if enabled
      if (match.user?.pushNotifications && match.user?.pushToken) {
        try {
          await sendMatchReminderNotification(match.user.pushToken, {
            id: match.id,
            opponent: match.opponent,
            venue: match.venue || "TBD",
          });

          console.log(
            `✅ Sent push notification for match ${match.id} to user ${match.user.id} (${minutesUntil} min before match)`
          );
          notificationSent = true;
        } catch (error) {
          console.error(
            `❌ Failed to send push notification for match ${match.id}:`,
            error
          );
        }
      } else if (!match.user?.pushNotifications) {
        console.log(
          `⚠️ Push notifications disabled for user ${match.user?.id} (${match.user?.email})`
        );
      } else if (!match.user?.pushToken) {
        console.log(
          `⚠️ No push token for user ${match.user?.id} (${match.user?.email})`
        );
      }

      // Send email notification if enabled
      if (match.user?.emailNotifications && match.user?.email) {
        try {
          // Decrypt email and name before sending
          const decryptedEmail = EncryptionService.decrypt(match.user.email);
          const decryptedName = match.user.name
            ? EncryptionService.decrypt(match.user.name)
            : null;

          await sendMatchReminderEmail(decryptedEmail, decryptedName, {
            id: match.id,
            opponent: match.opponent,
            venue: match.venue || "TBD",
            date: match.date,
            type: match.type,
          });

          console.log(
            `✅ Sent email notification for match ${match.id} to ${decryptedEmail} (${minutesUntil} min before match)`
          );
          notificationSent = true;
        } catch (error) {
          console.error(
            `❌ Failed to send match reminder email to ${match.user.id}:${match.user.email}:`,
            error
          );
        }
      } else if (!match.user?.emailNotifications) {
        console.log(
          `⚠️ Email notifications disabled for user ${match.user?.id}`
        );
      }

      // Mark notification as sent (even if both failed, to avoid infinite retries)
      if (
        notificationSent ||
        (!match.user?.pushNotifications && !match.user?.emailNotifications)
      ) {
        await prisma.match.update({
          where: { id: match.id },
          data: {
            notificationSent: true,
            notificationSentAt: now,
          },
        });

        if (notificationSent) {
          console.log(`✅ Match ${match.id} marked as notified`);
        } else {
          console.log(
            `⚠️ Match ${match.id} marked as notified (all notifications disabled)`
          );
        }
      }
    }
  } catch (error) {
    console.error("❌ Error checking upcoming matches:", error);
  }
}

/**
 * Start the notification scheduler
 * Runs every minute to check for upcoming matches
 */
export function startNotificationScheduler() {
  console.log("Starting match notification scheduler...");

  // Run every minute: '* * * * *'
  // Format: minute hour day month weekday
  const task = cron.schedule("* * * * *", () => {
    console.log("Running scheduled notification check...");
    checkUpcomingMatches();
  });

  // Run immediately on startup as well
  checkUpcomingMatches();

  return task;
}

/**
 * Stop the notification scheduler
 */
export function stopNotificationScheduler(task) {
  if (task) {
    task.stop();
    console.log("Notification scheduler stopped");
  }
}

// For manual testing
export { checkUpcomingMatches };
