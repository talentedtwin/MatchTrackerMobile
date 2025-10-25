/**
 * Clerk OAuth Callback Handler
 * GET /api/auth/clerk-oauth
 * 
 * This endpoint handles the OAuth callback from Clerk and creates a session
 */
import { auth } from '@clerk/nextjs/server';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the authenticated user from Clerk
    const { userId, sessionId } = await auth();

    if (!userId || !sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user details
    const { clerkClient } = await import('@clerk/nextjs/server');
    const user = await clerkClient.users.getUser(userId);

    // Return session info that mobile app can use
    const userData = {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses[0]?.emailAddress,
    };

    // Redirect back to mobile app with session info
    const redirectUrl = `exp://192.168.1.213:8081?session_id=${sessionId}&user=${encodeURIComponent(JSON.stringify(userData))}`;
    
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('OAuth callback error:', error);
    
    // Redirect with error
    const errorUrl = `exp://192.168.1.213:8081?error=${encodeURIComponent(error.message)}`;
    return res.redirect(errorUrl);
  }
}
