import cron from 'node-cron';
import { getPrisma } from './prisma.js';
import { sendMatchReminderNotification } from './notificationService.js';

/**
 * Check for matches starting in 10 minutes and send notifications
 */
async function checkUpcomingMatches() {
  const prisma = getPrisma();

  try {
    const now = new Date();
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
    const elevenMinutesFromNow = new Date(now.getTime() + 11 * 60 * 1000);

    // Find matches that start between 10-11 minutes from now
    // This gives us a 1-minute window to catch the match
    const upcomingMatches = await prisma.match.findMany({
      where: {
        date: {
          gte: tenMinutesFromNow,
          lte: elevenMinutesFromNow,
        },
        isFinished: false,
        isDeleted: false,
      },
      include: {
        user: {
          select: {
            id: true,
            pushToken: true,
          },
        },
      },
    });

    console.log(`Found ${upcomingMatches.length} matches starting in ~10 minutes`);

    // Send notifications for each match
    for (const match of upcomingMatches) {
      if (match.user?.pushToken) {
        try {
          await sendMatchReminderNotification(match.user.pushToken, {
            id: match.id,
            opponent: match.opponent,
            venue: match.venue || 'TBD',
          });
          console.log(`Sent notification for match ${match.id} to user ${match.user.id}`);
        } catch (error) {
          console.error(`Failed to send notification for match ${match.id}:`, error);
        }
      } else {
        console.log(`No push token for user ${match.user?.id}, skipping notification`);
      }
    }
  } catch (error) {
    console.error('Error checking upcoming matches:', error);
  }
}

/**
 * Start the notification scheduler
 * Runs every minute to check for upcoming matches
 */
export function startNotificationScheduler() {
  console.log('Starting match notification scheduler...');
  
  // Run every minute: '* * * * *'
  // Format: minute hour day month weekday
  const task = cron.schedule('* * * * *', () => {
    console.log('Running scheduled notification check...');
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
    console.log('Notification scheduler stopped');
  }
}

// For manual testing
export { checkUpcomingMatches };
