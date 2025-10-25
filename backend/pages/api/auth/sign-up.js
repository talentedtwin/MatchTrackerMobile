/**
 * Mobile Sign-Up API Route
 * POST /api/auth/sign-up - Register new user via Clerk
 */
import { clerkClient } from '@clerk/nextjs/server';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters',
      });
    }

    // Create user with Clerk
    const user = await clerkClient.users.createUser({
      emailAddress: [email],
      password,
      firstName: firstName || '',
      lastName: lastName || '',
    });

    // Create a session for the new user
    const session = await clerkClient.sessions.createSession({
      userId: user.id,
    });

    return res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses[0]?.emailAddress,
      },
      token: session.id,
      sessionId: session.id,
      message: 'Account created successfully',
    });
  } catch (error) {
    console.error('Sign-up error:', error);
    
    // Handle specific Clerk errors
    if (error.errors?.[0]?.code === 'form_identifier_exists') {
      return res.status(409).json({
        error: 'An account with this email already exists',
      });
    }
    
    return res.status(500).json({
      error: 'Registration failed',
      message: error.message || 'An unexpected error occurred',
    });
  }
}
