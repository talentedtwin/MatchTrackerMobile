import { getPrisma } from './prisma.js';
import { withDatabaseUserContext } from './db-utils.js';
import EncryptionService from './encryption.js';

/**
 * Service class for player operations
 */
class PlayerService {
  /**
   * Create a new player
   */
  static async createPlayer(userId, data) {
    const { name, teamId, goals = 0, assists = 0 } = data;

    // Encrypt player name
    const encryptedName = EncryptionService.encrypt(name);

    return await withDatabaseUserContext(userId, async (tx) => {
      const player = await tx.player.create({
        data: {
          name: encryptedName,
          goals,
          assists,
          userId,
          teamId: teamId || null,
        },
        include: {
          team: true,
        },
      });

      // Decrypt before returning
      return {
        ...player,
        name: EncryptionService.decrypt(player.name),
        team: player.team ? {
          ...player.team,
          name: EncryptionService.decrypt(player.team.name),
        } : null,
      };
    });
  }

  /**
   * Get all players for a user
   */
  static async getPlayersForUser(userId, options = {}) {
    const { includeTeam = true, teamId, isDeleted = false } = options;

    return await withDatabaseUserContext(userId, async (tx) => {
      const players = await tx.player.findMany({
        where: {
          userId,
          isDeleted,
          ...(teamId && { teamId }),
        },
        include: {
          team: includeTeam,
          matchStats: {
            select: {
              goals: true,
              assists: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Decrypt player names, calculate stats totals from matchStats
      return players.map(player => {
        // Calculate total goals and assists from all match stats
        const totalGoals = player.matchStats.reduce((sum, stat) => sum + stat.goals, 0);
        const totalAssists = player.matchStats.reduce((sum, stat) => sum + stat.assists, 0);

        return {
          ...player,
          name: EncryptionService.decrypt(player.name),
          goals: totalGoals, // Override with calculated total
          assists: totalAssists, // Override with calculated total
          team: player.team ? {
            ...player.team,
            name: EncryptionService.decrypt(player.team.name),
          } : null,
          matchStats: undefined, // Remove matchStats from response to keep it clean
        };
      });
    });
  }

  /**
   * Get a single player by ID
   */
  static async getPlayerById(userId, playerId) {
    return await withDatabaseUserContext(userId, async (tx) => {
      const player = await tx.player.findFirst({
        where: {
          id: playerId,
          userId,
          isDeleted: false,
        },
        include: {
          team: true,
          matchStats: {
            include: {
              match: true,
            },
            orderBy: {
              id: 'desc',
            },
          },
        },
      });

      if (!player) {
        return null;
      }

      // Decrypt
      return {
        ...player,
        name: EncryptionService.decrypt(player.name),
        team: player.team ? {
          ...player.team,
          name: EncryptionService.decrypt(player.team.name),
        } : null,
      };
    });
  }

  /**
   * Update a player
   */
  static async updatePlayer(userId, playerId, data) {
    const updateData = { ...data };

    // Encrypt name if being updated
    if (updateData.name) {
      updateData.name = EncryptionService.encrypt(updateData.name);
    }

    return await withDatabaseUserContext(userId, async (tx) => {
      const player = await tx.player.update({
        where: {
          id: playerId,
        },
        data: updateData,
        include: {
          team: true,
        },
      });

      // Decrypt before returning
      return {
        ...player,
        name: EncryptionService.decrypt(player.name),
        team: player.team ? {
          ...player.team,
          name: EncryptionService.decrypt(player.team.name),
        } : null,
      };
    });
  }

  /**
   * Soft delete a player
   */
  static async deletePlayer(userId, playerId) {
    return await withDatabaseUserContext(userId, async (tx) => {
      return await tx.player.update({
        where: {
          id: playerId,
        },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
    });
  }

  /**
   * Hard delete a player (permanently remove)
   */
  static async hardDeletePlayer(userId, playerId) {
    return await withDatabaseUserContext(userId, async (tx) => {
      return await tx.player.delete({
        where: {
          id: playerId,
        },
      });
    });
  }

  /**
   * Update player stats (goals and assists)
   */
  static async updatePlayerStats(userId, playerId, goals, assists) {
    return await withDatabaseUserContext(userId, async (tx) => {
      const player = await tx.player.update({
        where: {
          id: playerId,
        },
        data: {
          goals: {
            increment: goals,
          },
          assists: {
            increment: assists,
          },
        },
        include: {
          team: true,
        },
      });

      // Decrypt before returning
      return {
        ...player,
        name: EncryptionService.decrypt(player.name),
        team: player.team ? {
          ...player.team,
          name: EncryptionService.decrypt(player.team.name),
        } : null,
      };
    });
  }

  /**
   * Get player statistics
   */
  static async getPlayerStats(userId, playerId) {
    return await withDatabaseUserContext(userId, async (tx) => {
      const player = await tx.player.findFirst({
        where: {
          id: playerId,
          userId,
          isDeleted: false,
        },
        include: {
          matchStats: {
            include: {
              match: true,
            },
          },
        },
      });

      if (!player) {
        return null;
      }

      // Calculate stats
      const totalMatches = player.matchStats.length;
      const totalGoals = player.matchStats.reduce((sum, stat) => sum + stat.goals, 0);
      const totalAssists = player.matchStats.reduce((sum, stat) => sum + stat.assists, 0);
      const avgGoalsPerMatch = totalMatches > 0 ? (totalGoals / totalMatches).toFixed(2) : 0;
      const avgAssistsPerMatch = totalMatches > 0 ? (totalAssists / totalMatches).toFixed(2) : 0;

      // Get recent form (last 5 matches)
      const recentMatches = player.matchStats
        .sort((a, b) => new Date(b.match.date) - new Date(a.match.date))
        .slice(0, 5);

      return {
        playerId: player.id,
        playerName: EncryptionService.decrypt(player.name),
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
  }

  /**
   * Assign player to a team
   */
  static async assignPlayerToTeam(userId, playerId, teamId) {
    return await withDatabaseUserContext(userId, async (tx) => {
      const player = await tx.player.update({
        where: {
          id: playerId,
        },
        data: {
          teamId,
        },
        include: {
          team: true,
        },
      });

      // Decrypt before returning
      return {
        ...player,
        name: EncryptionService.decrypt(player.name),
        team: player.team ? {
          ...player.team,
          name: EncryptionService.decrypt(player.team.name),
        } : null,
      };
    });
  }

  /**
   * Remove player from team
   */
  static async removePlayerFromTeam(userId, playerId) {
    return await this.assignPlayerToTeam(userId, playerId, null);
  }
}

export default PlayerService;
