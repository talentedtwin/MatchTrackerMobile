/**
 * Authentication middleware
 * Uses Clerk for authentication in Next.js API routes
 */
import { clerkClient, getAuth } from '@clerk/nextjs/server';
import UserService from '../lib/userService.js';

/**
 * Wrapper for API routes that require authentication
 * @param {Function} handler - The API route handler
 * @returns {Function} - Wrapped handler with authentication
 */
function withAuth(handler) {
  return async (req, res) => {
    try {
      // Get authentication from Clerk (Pages Router version)
      const { userId } = getAuth(req);

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Ensure user exists in database
      await UserService.ensureUserExists(userId);

      // Add userId to request
      req.userId = userId;

      // Call the handler
      return await handler(req, res);
    } catch (error) {
      console.error('Authentication error:', error);
      
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication error',
      });
    }
  };
}

// Authentication middleware (legacy export for compatibility)
export function authMiddleware(handler) {
  return withAuth(handler);
}

// CORS middleware
export function corsMiddleware(handler) {
  return async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    return handler(req, res);
  };
}

// Error handling middleware wrapper
export function errorHandler(handler) {
  return async (req, res) => {
    try {
      return await handler(req, res);
    } catch (error) {
      console.error('API Error:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };
}

/**
 * Get authenticated user ID from Clerk
 * @param {Object} req - Request object
 * @returns {string|null} - User ID or null if not authenticated
 */
export function getAuthUserId(req) {
  try {
    const { userId } = getAuth(req);
    return userId;
  } catch (error) {
    console.error('Error getting auth user ID:', error);
    return null;
  }
}

/**
 * Require authentication and return user ID
 * Throws error if not authenticated
 * @param {Object} req - Request object
 * @returns {Promise<string>} - User ID
 */
export async function requireAuth(req) {
  const { userId } = getAuth(req);

  if (!userId) {
    throw new Error('Authentication required');
  }

  // Ensure user exists in database
  await UserService.ensureUserExists(userId);

  return userId;
}

// Default export
export default withAuth;
