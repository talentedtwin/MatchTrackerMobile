/**
 * Stats API Route
 * GET /api/stats - Get comprehensive statistics for authenticated user
 */
import { requireAuth  } from '../../middleware/auth.js';
import { withDatabaseUserContext  } from '../../lib/db-utils.js';
import { getPrisma  } from '../../lib/prisma.js';
import EncryptionService from '../../lib/encryption.js';
import UserService from '../../lib/userService.js';
import PlayerService from '../../lib/playerService.js';

async function handler(req, res) {
  try {
    // Get authenticated user
    const userId = await requireAuth(req);

    if (req.method === 'GET') {
      const { type = 'overview' } = req.query;

      if (type === 'overview') {
        // Get overall statistics
        const userStats = await UserService.getUserStats(userId);

        return res.status(200).json({
          success: true,
          stats: userStats,
        });
      }

      if (type === 'players') {
        // Get player statistics
        const players = await withDatabaseUserContext(userId, async (tx) => {
          const result = await tx.player.findMany({
            where: {
              userId,
              isDeleted: false,
            },
            include: {
              team: true,
              matchStats: {
                include: {
                  match: true,
                },
              },
            },
            orderBy: {
              goals: 'desc',
            },
          });

          // Decrypt and calculate stats
          return result.map(player => {
            const totalMatches = player.matchStats.length;
            const totalGoals = player.goals;
            const totalAssists = player.assists;
            const avgGoalsPerMatch = totalMatches > 0 ? (totalGoals / totalMatches).toFixed(2) : 0;
            const avgAssistsPerMatch = totalMatches > 0 ? (totalAssists / totalMatches).toFixed(2) : 0;

            // Get recent form (last 5 matches)
            const recentMatches = player.matchStats
              .sort((a, b) => new Date(b.match.date) - new Date(a.match.date))
              .slice(0, 5);

            return {
              id: player.id,
              name: EncryptionService.decrypt(player.name),
              team: player.team ? {
                id: player.team.id,
                name: EncryptionService.decrypt(player.team.name),
              } : null,
              totalMatches,
              totalGoals,
              totalAssists,
              avgGoalsPerMatch,
              avgAssistsPerMatch,
              recentForm: recentMatches.map(stat => ({
                matchId: stat.matchId,
                date: stat.match.date,
                opponent: stat.match.opponent,
                goals: stat.goals,
                assists: stat.assists,
              })),
            };
          });
        });

        return res.status(200).json({
          success: true,
          stats: players,
        });
      }

      if (type === 'matches') {
        // Get match statistics
        const matchStats = await withDatabaseUserContext(userId, async (tx) => {
          const matches = await tx.match.findMany({
            where: {
              userId,
              isFinished: true,
            },
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
          });

          // Calculate stats by match type and venue
          const leagueMatches = matches.filter(m => m.matchType === 'league');
          const cupMatches = matches.filter(m => m.matchType === 'cup');
          const homeMatches = matches.filter(m => m.venue === 'home');
          const awayMatches = matches.filter(m => m.venue === 'away');

          const calculateWinLoss = (matchList) => {
            const wins = matchList.filter(m => m.goalsFor > m.goalsAgainst).length;
            const losses = matchList.filter(m => m.goalsFor < m.goalsAgainst).length;
            const draws = matchList.filter(m => m.goalsFor === m.goalsAgainst).length;
            const totalGoals = matchList.reduce((sum, m) => sum + m.goalsFor, 0);
            const totalConceded = matchList.reduce((sum, m) => sum + m.goalsAgainst, 0);

            return {
              total: matchList.length,
              wins,
              losses,
              draws,
              winPercentage: matchList.length > 0 ? ((wins / matchList.length) * 100).toFixed(1) : 0,
              totalGoals,
              totalConceded,
              avgGoalsFor: matchList.length > 0 ? (totalGoals / matchList.length).toFixed(2) : 0,
              avgGoalsAgainst: matchList.length > 0 ? (totalConceded / matchList.length).toFixed(2) : 0,
            };
          };

          return {
            overall: calculateWinLoss(matches),
            league: calculateWinLoss(leagueMatches),
            cup: calculateWinLoss(cupMatches),
            home: calculateWinLoss(homeMatches),
            away: calculateWinLoss(awayMatches),
          };
        });

        return res.status(200).json({
          success: true,
          stats: matchStats,
        });
      }

      if (type === 'teams') {
        // Get team statistics
        const teamStats = await withDatabaseUserContext(userId, async (tx) => {
          const teams = await tx.team.findMany({
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
              },
            },
          });

          return teams.map(team => {
            const totalPlayers = team.players.length;
            const totalMatches = team.matches.length;
            const wins = team.matches.filter(m => m.goalsFor > m.goalsAgainst).length;
            const losses = team.matches.filter(m => m.goalsFor < m.goalsAgainst).length;
            const draws = team.matches.filter(m => m.goalsFor === m.goalsAgainst).length;
            const totalGoals = team.matches.reduce((sum, m) => sum + m.goalsFor, 0);
            const totalConceded = team.matches.reduce((sum, m) => sum + m.goalsAgainst, 0);

            return {
              id: team.id,
              name: EncryptionService.decrypt(team.name),
              totalPlayers,
              totalMatches,
              wins,
              losses,
              draws,
              winPercentage: totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : 0,
              totalGoals,
              totalConceded,
            };
          });
        });

        return res.status(200).json({
          success: true,
          stats: teamStats,
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Invalid stats type. Use: overview, players, matches, or teams',
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  } catch (error) {
    console.error('Stats API error:', error);

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
