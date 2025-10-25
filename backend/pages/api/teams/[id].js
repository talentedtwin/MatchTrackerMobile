/**
 * Single Team API Route
 * GET /api/teams/[id] - Get team by ID
 * PUT /api/teams/[id] - Update team
 * DELETE /api/teams/[id] - Delete team (soft delete)
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
        error: 'Team ID is required',
      });
    }

    if (req.method === 'GET') {
      const team = await withDatabaseUserContext(userId, async (tx) => {
        const result = await tx.team.findFirst({
          where: {
            id,
            userId,
            isDeleted: false,
          },
          include: {
            players: {
              where: { isDeleted: false },
            },
            matches: {
              where: { isFinished: true },
              orderBy: { date: 'desc' },
              take: 10,
            },
          },
        });

        if (!result) {
          return null;
        }

        return {
          ...result,
          name: EncryptionService.decrypt(result.name),
          players: result.players.map(player => ({
            ...player,
            name: EncryptionService.decrypt(player.name),
          })),
        };
      });

      if (!team) {
        return res.status(404).json({
          success: false,
          error: 'Team not found',
        });
      }

      return res.status(200).json({
        success: true,
        team,
      });
    }

    if (req.method === 'PUT') {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Team name is required',
        });
      }

      const team = await withDatabaseUserContext(userId, async (tx) => {
        const result = await tx.team.update({
          where: { id },
          data: {
            name: EncryptionService.encrypt(name),
          },
          include: {
            players: {
              where: { isDeleted: false },
            },
          },
        });

        return {
          ...result,
          name: EncryptionService.decrypt(result.name),
          players: result.players.map(player => ({
            ...player,
            name: EncryptionService.decrypt(player.name),
          })),
        };
      });

      return res.status(200).json({
        success: true,
        team,
      });
    }

    if (req.method === 'DELETE') {
      await withDatabaseUserContext(userId, async (tx) => {
        await tx.team.update({
          where: { id },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        });
      });

      return res.status(200).json({
        success: true,
        message: 'Team deleted successfully',
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  } catch (error) {
    console.error('Team API error:', error);

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
