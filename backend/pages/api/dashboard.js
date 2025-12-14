import { requireAuth } from "../../middleware/auth.js";
import { withDatabaseUserContext } from "../../lib/db-utils.js";
import EncryptionService from "../../lib/encryption.js";

/**
 * GET /api/dashboard
 * Returns all data needed for HomeScreen in a single request:
 * - User's teams (summary)
 * - Upcoming matches (next 3)
 * - Recent matches (last 3 finished)
 * - Quick stats (total matches, players, wins)
 */
async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // Get authenticated user
    const userId = await requireAuth(req);
    const { teamId } = req.query;

    return await withDatabaseUserContext(userId, async (tx) => {
      // Fetch teams (summary mode - just id and name)
      const rawTeams = await tx.team.findMany({
        where: {
          userId,
          isDeleted: false,
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Decrypt team names
      const teams = rawTeams.map((team) => ({
        ...team,
        name: EncryptionService.decrypt(team.name),
      }));

      // If no teamId provided, return just teams
      if (!teamId) {
        return res.status(200).json({
          teams,
          upcomingMatches: [],
          recentMatches: [],
          stats: {
            totalMatches: 0,
            totalPlayers: 0,
            wins: 0,
          },
        });
      }

      // Verify team belongs to user
      const teamExists = teams.some((t) => t.id === teamId);
      if (!teamExists) {
        return res.status(403).json({ error: "Team does not belong to user" });
      }

      // Fetch upcoming matches (next 3, not finished, sorted by date)
      const upcomingMatches = await tx.match.findMany({
        where: {
          teamId,
          isFinished: false,
        },
        select: {
          id: true,
          opponent: true,
          date: true,
          venue: true,
          matchType: true,
          isFinished: true,
        },
        orderBy: {
          date: "asc",
        },
        take: 3,
      });

      // Fetch recent matches (last 3 finished, sorted by date desc)
      const recentMatches = await tx.match.findMany({
        where: {
          teamId,
          isFinished: true,
        },
        select: {
          id: true,
          opponent: true,
          date: true,
          venue: true,
          matchType: true,
          goalsFor: true,
          goalsAgainst: true,
          isFinished: true,
        },
        orderBy: {
          date: "desc",
        },
        take: 3,
      });

      // Calculate quick stats
      const [totalMatches, totalPlayers, finishedMatches] = await Promise.all([
        tx.match.count({
          where: { teamId },
        }),
        tx.player.count({
          where: {
            teamId,
            isDeleted: false,
          },
        }),
        // Get finished matches to calculate wins
        tx.match.findMany({
          where: {
            teamId,
            isFinished: true,
          },
          select: {
            goalsFor: true,
            goalsAgainst: true,
          },
        }),
      ]);

      // Calculate wins by comparing goals
      const wins = finishedMatches.filter(
        (m) => m.goalsFor > m.goalsAgainst
      ).length;

      return res.status(200).json({
        teams,
        upcomingMatches,
        recentMatches,
        stats: {
          totalMatches,
          totalPlayers,
          wins,
        },
      });
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return res.status(500).json({
      error: "Failed to fetch dashboard data",
      details: error.message,
    });
  }
}

export default handler;
