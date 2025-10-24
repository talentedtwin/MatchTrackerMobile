/**
 * Single Match API Route
 * GET /api/matches/[id] - Get match by ID
 * PUT /api/matches/[id] - Update match
 * DELETE /api/matches/[id] - Delete match
 */
const { requireAuth } = require('../../../middleware/auth');
const { withDatabaseUserContext } = require('../../../lib/db-utils');
const { getPrisma } = require('../../../lib/prisma');
const EncryptionService = require('../../../lib/encryption');

async function handler(req, res) {
  try {
    // Get authenticated user
    const userId = await requireAuth();
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Match ID is required',
      });
    }

    if (req.method === 'GET') {
      const match = await withDatabaseUserContext(userId, async (tx) => {
        const result = await tx.match.findFirst({
          where: {
            id,
            userId,
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

        if (!result) {
          return null;
        }

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

      if (!match) {
        return res.status(404).json({
          success: false,
          error: 'Match not found',
        });
      }

      return res.status(200).json({
        success: true,
        match,
      });
    }

    if (req.method === 'PUT') {
      const {
        opponent,
        date,
        goalsFor,
        goalsAgainst,
        isFinished,
        matchType,
        venue,
        notes,
        selectedPlayerIds,
        teamId,
      } = req.body;

      const match = await withDatabaseUserContext(userId, async (tx) => {
        const result = await tx.match.update({
          where: { id },
          data: {
            ...(opponent !== undefined && { opponent }),
            ...(date !== undefined && { date: new Date(date) }),
            ...(goalsFor !== undefined && { goalsFor }),
            ...(goalsAgainst !== undefined && { goalsAgainst }),
            ...(isFinished !== undefined && { isFinished }),
            ...(matchType !== undefined && { matchType }),
            ...(venue !== undefined && { venue }),
            ...(notes !== undefined && { notes }),
            ...(selectedPlayerIds !== undefined && { selectedPlayerIds }),
            ...(teamId !== undefined && { teamId }),
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

      return res.status(200).json({
        success: true,
        match,
      });
    }

    if (req.method === 'DELETE') {
      await withDatabaseUserContext(userId, async (tx) => {
        // Delete player stats first
        await tx.playerMatchStat.deleteMany({
          where: { matchId: id },
        });

        // Delete the match
        await tx.match.delete({
          where: { id },
        });
      });

      return res.status(200).json({
        success: true,
        message: 'Match deleted successfully',
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  } catch (error) {
    console.error('Match API error:', error);

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
