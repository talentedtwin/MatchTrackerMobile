/**
 * Teams API Route
 * GET /api/teams - Get all teams for authenticated user
 * POST /api/teams - Create a new team
 */
import { requireAuth  } from '../../middleware/auth.js';
import { withDatabaseUserContext  } from '../../lib/db-utils.js';
import { getPrisma  } from '../../lib/prisma.js';
import EncryptionService from '../../lib/encryption.js';
import UserService from '../../lib/userService.js';

async function handler(req, res) {
  try {
    // Get authenticated user
    const userId = await requireAuth(req);

    if (req.method === 'GET') {
      const prisma = getPrisma();

      const teams = await withDatabaseUserContext(userId, async (tx) => {
        const result = await tx.team.findMany({
          where: {
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
          orderBy: {
            createdAt: 'desc',
          },
        });

        // Decrypt team and player names
        return result.map(team => ({
          ...team,
          name: EncryptionService.decrypt(team.name),
          players: team.players.map(player => ({
            ...player,
            name: EncryptionService.decrypt(player.name),
          })),
        }));
      });

      return res.status(200).json({
        success: true,
        teams,
        count: teams.length,
      });
    }

    if (req.method === 'POST') {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Team name is required',
        });
      }

      // Check if user is premium for team limits
      const isPremium = await UserService.isPremium(userId);
      
      if (!isPremium) {
        // Free users can only have 1 team
        const prisma = getPrisma();
        const teamCount = await prisma.team.count({
          where: { userId, isDeleted: false },
        });

        if (teamCount >= 1) {
          return res.status(403).json({
            success: false,
            error: 'Free users can only create 1 team. Upgrade to premium for unlimited teams.',
          });
        }
      }

      const team = await withDatabaseUserContext(userId, async (tx) => {
        const result = await tx.team.create({
          data: {
            name: EncryptionService.encrypt(name),
            userId,
          },
          include: {
            players: true,
          },
        });

        return {
          ...result,
          name: EncryptionService.decrypt(result.name),
        };
      });

      return res.status(201).json({
        success: true,
        team,
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  } catch (error) {
    console.error('Teams API error:', error);

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
