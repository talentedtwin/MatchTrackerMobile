/**
 * Authentication middleware
 * Uses Clerk for authentication in Next.js API routes
 */
const { auth } = require('@clerk/nextjs/server');
const UserService = require('../lib/userService');

/**
 * Wrapper for API routes that require authentication
 * @param {Function} handler - The API route handler
 * @returns {Function} - Wrapped handler with authentication
 */
function withAuth(handler) {
  return async (req, res) => {
    try {
      // Get authentication from Clerk
      const { userId } = auth();

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
 * @returns {string|null} - User ID or null if not authenticated
 */
async function getAuthUserId() {
  try {
    const { userId } = auth();
    return userId;
  } catch (error) {
    console.error('Error getting auth user ID:', error);
    return null;
  }
}

/**
 * Require authentication and return user ID
 * Throws error if not authenticated
 * @returns {Promise<string>} - User ID
 */
async function requireAuth() {
  const { userId } = auth();

  if (!userId) {
    throw new Error('Authentication required');
  }

  // Ensure user exists in database
  await UserService.ensureUserExists(userId);

  return userId;
}

module.exports = {
  withAuth,
  authMiddleware,
  corsMiddleware,
  errorHandler,
  getAuthUserId,
  requireAuth,
};
