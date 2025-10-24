/**
 * Players API Route
 * GET /api/players - Get all players for authenticated user
 * POST /api/players - Create a new player
 */
const { requireAuth } = require('../../middleware/auth');
const PlayerService = require('../../lib/playerService');

async function handler(req, res) {
  try {
    // Get authenticated user
    const userId = await requireAuth();

    if (req.method === 'GET') {
      // Get query parameters
      const { teamId, includeTeam = 'true' } = req.query;

      const options = {
        includeTeam: includeTeam === 'true',
        teamId: teamId || undefined,
      };

      const players = await PlayerService.getPlayersForUser(userId, options);

      return res.status(200).json({
        success: true,
        players,
        count: players.length,
      });
    }

    if (req.method === 'POST') {
      const { name, teamId, goals, assists } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Player name is required',
        });
      }

      const player = await PlayerService.createPlayer(userId, {
        name,
        teamId,
        goals,
        assists,
      });

      return res.status(201).json({
        success: true,
        player,
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  } catch (error) {
    console.error('Players API error:', error);

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
