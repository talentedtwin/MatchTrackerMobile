/**
 * Session Info Endpoint
 * GET /api/auth/session
 * 
 * Returns user information for a given session
 */
import { clerkClient } from '@clerk/nextjs/server';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const sessionId = authHeader.split(' ')[1];

    // Get session from Clerk
    const session = await clerkClient.sessions.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get user info
    const user = await clerkClient.users.getUser(session.userId);

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses[0]?.emailAddress,
      },
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Session fetch error:', error);
    return res.status(500).json({
      error: 'Failed to fetch session',
      message: error.message,
    });
  }
}
