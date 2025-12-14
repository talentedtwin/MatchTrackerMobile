/**
 * Single Match API Route
 * GET /api/matches/[id] - Get match by ID
 * PUT /api/matches/[id] - Update match
 * DELETE /api/matches/[id] - Delete match
 */
import { requireAuth } from '../../../middleware/auth.js';
import { withDatabaseUserContext } from '../../../lib/db-utils.js';
import { getPrisma } from '../../../lib/prisma.js';
import EncryptionService from '../../../lib/encryption.js';

async function handler(req, res) {
  try {
    // Get authenticated user
    const userId = await requireAuth(req);
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
        playerStats,
      } = req.body;

      // Debug logging
      console.log('PUT /api/matches/[id] - Request body:', req.body);
      console.log('selectedPlayerIds:', selectedPlayerIds);
      console.log('playerStats:', playerStats);

      const match = await withDatabaseUserContext(userId, async (tx) => {
        const updateData = {
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
        };
        
        console.log('Update data being sent to Prisma:', JSON.stringify(updateData, null, 2));
        
        // If playerStats are provided, update them
        if (playerStats && Array.isArray(playerStats)) {
          // First, delete existing player stats for this match
          await tx.playerMatchStat.deleteMany({
            where: { matchId: id },
          });

          // Create new player stats
          if (playerStats.length > 0) {
            await tx.playerMatchStat.createMany({
              data: playerStats.map(stat => ({
                matchId: id,
                playerId: stat.playerId,
                goals: stat.goals || 0,
                assists: stat.assists || 0,
                minutesPlayed: stat.minutesPlayed || 0,
                playingPeriods: stat.playingPeriods || null,
              })),
            });
          }
        }
        
        const result = await tx.match.update({
          where: { id },
          data: updateData,
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

export default handler;
