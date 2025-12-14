import { requireAuth } from '../../../middleware/auth.js';
import UserService from '../../../lib/userService.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const userId = await requireAuth(req);

    const { pushToken } = req.body;

    if (!pushToken) {
      return res.status(400).json({ error: 'Push token is required' });
    }

    // Validate push token format (Expo push token starts with ExponentPushToken[)
    if (!pushToken.startsWith('ExponentPushToken[')) {
      return res.status(400).json({ error: 'Invalid push token format' });
    }

    // Update user's push token
    await UserService.updatePushToken(userId, pushToken);

    res.status(200).json({ 
      success: true, 
      message: 'Push token saved successfully' 
    });
  } catch (error) {
    console.error('Error saving push token:', error);
    res.status(500).json({ 
      error: 'Failed to save push token',
      message: error.message 
    });
  }
}
