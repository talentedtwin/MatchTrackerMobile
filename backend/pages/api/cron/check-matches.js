import { checkUpcomingMatches } from '../../../lib/matchNotificationScheduler.js';

/**
 * API endpoint to check for upcoming matches and send notifications
 * This should be called by an external cron service (like cron-job.org)
 * 
 * Vercel Hobby plan only supports daily cron jobs. For minute-by-minute checks,
 * use an external service to hit this endpoint every minute:
 * https://cron-job.org or https://easycron.com
 */
export default async function handler(req, res) {
  // Only allow POST/GET requests
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Optional: Add a secret token for security
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers['authorization'] !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Running scheduled match notification check...');
    await checkUpcomingMatches();
    
    return res.status(200).json({ 
      success: true, 
      message: 'Match notifications checked successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in cron job:', error);
    return res.status(500).json({ 
      error: 'Failed to check matches',
      message: error.message 
    });
  }
}
