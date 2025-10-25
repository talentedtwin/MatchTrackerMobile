/**
 * Single Player API Route
 * GET /api/players/[id] - Get player by ID
 * PUT /api/players/[id] - Update player
 * DELETE /api/players/[id] - Delete player (soft delete)
 */
import { requireAuth } from '../../../middleware/auth.js';
import PlayerService from '../../../lib/playerService.js';

async function handler(req, res) {
  try {
    // Get authenticated user
    const userId = await requireAuth(req);
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Player ID is required',
      });
    }

    if (req.method === 'GET') {
      const player = await PlayerService.getPlayerById(userId, id);

      if (!player) {
        return res.status(404).json({
          success: false,
          error: 'Player not found',
        });
      }

      return res.status(200).json({
        success: true,
        player,
      });
    }

    if (req.method === 'PUT') {
      const { name, teamId, goals, assists } = req.body;

      const player = await PlayerService.updatePlayer(userId, id, {
        ...(name && { name }),
        ...(teamId !== undefined && { teamId }),
        ...(goals !== undefined && { goals }),
        ...(assists !== undefined && { assists }),
      });

      return res.status(200).json({
        success: true,
        player,
      });
    }

    if (req.method === 'DELETE') {
      await PlayerService.deletePlayer(userId, id);

      return res.status(200).json({
        success: true,
        message: 'Player deleted successfully',
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  } catch (error) {
    console.error('Player API error:', error);

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

export default handler;
