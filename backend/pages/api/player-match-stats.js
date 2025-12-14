/**
 * Player Match Stats API Route
 * GET /api/player-match-stats - Get all player match stats
 * POST /api/player-match-stats - Create player match stat
 */
import { requireAuth } from "../../middleware/auth.js";
import { withDatabaseUserContext } from "../../lib/db-utils.js";
import { getPrisma } from "../../lib/prisma.js";
import EncryptionService from "../../lib/encryption.js";

async function handler(req, res) {
  try {
    // Get authenticated user
    const userId = await requireAuth(req);

    if (req.method === "GET") {
      const { playerId, matchId, limit = "100", skip = "0" } = req.query;

      const stats = await withDatabaseUserContext(userId, async (tx) => {
        const where = {};

        if (playerId) where.playerId = playerId;
        if (matchId) where.matchId = matchId;

        // If no filters, get stats for user's matches with pagination
        if (!playerId && !matchId) {
          where.match = {
            userId,
          };
        }

        const result = await tx.playerMatchStat.findMany({
          where,
          include: {
            player: true,
            match: {
              include: {
                team: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: Math.min(parseInt(limit), 100), // Max 100 records
          skip: parseInt(skip),
        });

        // Decrypt player and team names
        return result.map((stat) => ({
          ...stat,
          player: {
            ...stat.player,
            name: EncryptionService.decrypt(stat.player.name),
          },
          match: {
            ...stat.match,
            team: stat.match.team
              ? {
                  ...stat.match.team,
                  name: EncryptionService.decrypt(stat.match.team.name),
                }
              : null,
          },
        }));
      });

      return res.status(200).json({
        success: true,
        stats,
        count: stats.length,
      });
    }

    if (req.method === "POST") {
      const { playerId, matchId, goals = 0, assists = 0 } = req.body;

      if (!playerId || !matchId) {
        return res.status(400).json({
          success: false,
          error: "Player ID and Match ID are required",
        });
      }

      const stat = await withDatabaseUserContext(userId, async (tx) => {
        // Verify match belongs to user
        const match = await tx.match.findFirst({
          where: {
            id: matchId,
            userId,
          },
        });

        if (!match) {
          throw new Error("Match not found or unauthorized");
        }

        // Verify player belongs to user
        const player = await tx.player.findFirst({
          where: {
            id: playerId,
            userId,
          },
        });

        if (!player) {
          throw new Error("Player not found or unauthorized");
        }

        // Create or update stat
        const result = await tx.playerMatchStat.upsert({
          where: {
            playerId_matchId: {
              playerId,
              matchId,
            },
          },
          create: {
            playerId,
            matchId,
            goals,
            assists,
          },
          update: {
            goals,
            assists,
          },
          include: {
            player: true,
            match: {
              include: {
                team: true,
              },
            },
          },
        });

        // Update player's overall stats
        await tx.player.update({
          where: { id: playerId },
          data: {
            goals: {
              increment: goals,
            },
            assists: {
              increment: assists,
            },
          },
        });

        return {
          ...result,
          player: {
            ...result.player,
            name: EncryptionService.decrypt(result.player.name),
          },
          match: {
            ...result.match,
            team: result.match.team
              ? {
                  ...result.match.team,
                  name: EncryptionService.decrypt(result.match.team.name),
                }
              : null,
          },
        };
      });

      return res.status(201).json({
        success: true,
        stat,
      });
    }

    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  } catch (error) {
    console.error("Player match stats API error:", error);

    if (error.message === "Authentication required") {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    if (error.message.includes("not found or unauthorized")) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

export default handler;
