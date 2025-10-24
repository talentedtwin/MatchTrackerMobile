/**
 * Users API Route
 * GET /api/users - Get current authenticated user
 * PUT /api/users - Update current user
 */
const { requireAuth } = require('../../middleware/auth');
const UserService = require('../../lib/userService');

async function handler(req, res) {
  try {
    // Get authenticated user
    const userId = await requireAuth();

    if (req.method === 'GET') {
      const user = await UserService.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      return res.status(200).json({
        success: true,
        user,
      });
    }

    if (req.method === 'PUT') {
      const { name, email, hasConsent } = req.body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (hasConsent !== undefined) {
        updateData.hasConsent = hasConsent;
        updateData.consentDate = hasConsent ? new Date() : null;
      }

      const user = await UserService.updateUser(userId, updateData);

      return res.status(200).json({
        success: true,
        user,
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  } catch (error) {
    console.error('Users API error:', error);

    if (error.message === 'Authentication required') {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

module.exports = handler;
