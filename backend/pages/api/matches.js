/**
 * Matches API Route
 * GET /api/matches - Get all matches for authenticated user
 * POST /api/matches - Create a new match
 */
const { requireAuth } = require('../../middleware/auth');
const { withDatabaseUserContext } = require('../../lib/db-utils');
const { getPrisma } = require('../../lib/prisma');
const EncryptionService = require('../../lib/encryption');

async function handler(req, res) {
  try {
    // Get authenticated user
    const userId = await requireAuth();

    if (req.method === 'GET') {
      const { 
        isFinished, 
        teamId, 
        limit = '50',
        matchType,
        venue,
      } = req.query;

      const matches = await withDatabaseUserContext(userId, async (tx) => {
        const where = {
          userId,
          ...(isFinished !== undefined && { isFinished: isFinished === 'true' }),
          ...(teamId && { teamId }),
          ...(matchType && { matchType }),
          ...(venue && { venue }),
        };

        const result = await tx.match.findMany({
          where,
          include: {
            team: true,
            playerStats: {
              include: {
                player: true,
              },
            },
          },
          orderBy: {
            date: 'desc',
          },
          take: parseInt(limit),
        });

        // Decrypt team and player names
        return result.map(match => ({
          ...match,
          team: match.team ? {
            ...match.team,
            name: EncryptionService.decrypt(match.team.name),
          } : null,
          playerStats: match.playerStats.map(stat => ({
            ...stat,
            player: {
              ...stat.player,
              name: EncryptionService.decrypt(stat.player.name),
            },
          })),
        }));
      });

      return res.status(200).json({
        success: true,
        matches,
        count: matches.length,
      });
    }

    if (req.method === 'POST') {
      const {
        opponent,
        date,
        goalsFor = 0,
        goalsAgainst = 0,
        isFinished = false,
        matchType = 'league',
        venue = 'home',
        notes,
        selectedPlayerIds = [],
        teamId,
      } = req.body;

      if (!opponent) {
        return res.status(400).json({
          success: false,
          error: 'Opponent is required',
        });
      }

      const match = await withDatabaseUserContext(userId, async (tx) => {
        const result = await tx.match.create({
          data: {
            opponent,
            date: date ? new Date(date) : new Date(),
            goalsFor,
            goalsAgainst,
            isFinished,
            matchType,
            venue,
            notes,
            selectedPlayerIds,
            userId,
            teamId: teamId || null,
          },
          include: {
            team: true,
            playerStats: {
              include: {
                player: true,
              },
            },
          },
        });

        return {
          ...result,
          team: result.team ? {
            ...result.team,
            name: EncryptionService.decrypt(result.team.name),
          } : null,
          playerStats: result.playerStats.map(stat => ({
            ...stat,
            player: {
              ...stat.player,
              name: EncryptionService.decrypt(stat.player.name),
            },
          })),
        };
      });

      return res.status(201).json({
        success: true,
        match,
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  } catch (error) {
    console.error('Matches API error:', error);

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
