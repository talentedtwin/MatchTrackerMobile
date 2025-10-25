import { getPrisma } from './prisma.js';
import { withDatabaseUserContext } from './db-utils.js';
import EncryptionService from './encryption.js';

/**
 * Service class for user operations
 */
class UserService {
  /**
   * Create or get existing user
   */
  static async ensureUserExists(clerkUserId, userData = {}) {
    const prisma = getPrisma();

    try {
      // Try to find existing user
      let user = await prisma.user.findUnique({
        where: { id: clerkUserId },
      });

      if (user) {
        // User exists, return as-is (encryption handled at query level if needed)
        return user;
      }

      // Create new user
      const { email, name } = userData;
      
      user = await prisma.user.create({
        data: {
          id: clerkUserId,
          email: email || null,
          name: name || null,
          isPremium: false,
          consentWithdrawn: false,
          lastLoginAt: new Date(),
        },
      });

      return user;
    } catch (error) {
      console.error('Error ensuring user exists:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId) {
    return await withDatabaseUserContext(userId, async (tx) => {
      const user = await tx.user.findFirst({
        where: {
          id: userId,
          isDeleted: false,
        },
        include: {
          teams: {
            where: { isDeleted: false },
          },
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

      if (!user) {
        return null;
      }

      // Decrypt sensitive fields
      return {
        ...user,
        email: user.email ? EncryptionService.decrypt(user.email) : null,
        name: user.name ? EncryptionService.decrypt(user.name) : null,
        teams: user.teams.map(team => ({
          ...team,
          name: EncryptionService.decrypt(team.name),
        })),
        players: user.players.map(player => ({
          ...player,
          name: EncryptionService.decrypt(player.name),
        })),
      };
    });
  }

  /**
   * Update user
   */
  static async updateUser(userId, data) {
    const updateData = { ...data };

    // Encrypt sensitive fields
    if (updateData.email) {
      updateData.email = EncryptionService.encrypt(updateData.email);
    }
    if (updateData.name) {
      updateData.name = EncryptionService.encrypt(updateData.name);
    }

    return await withDatabaseUserContext(userId, async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: updateData,
      });

      return {
        ...user,
        email: user.email ? EncryptionService.decrypt(user.email) : null,
        name: user.name ? EncryptionService.decrypt(user.name) : null,
      };
    });
  }

  /**
   * Update user's push notification token
   */
  static async updatePushToken(userId, pushToken) {
    const prisma = getPrisma();

    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { pushToken },
      });

      return user;
    } catch (error) {
      console.error('Error updating push token:', error);
      throw error;
    }
  }

  /**
   * Soft delete user (GDPR)
   */
  static async deleteUser(userId) {
    return await withDatabaseUserContext(userId, async (tx) => {
      // Soft delete user
      await tx.user.update({
        where: { id: userId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      // Soft delete all user's data
      await tx.team.updateMany({
        where: { userId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      await tx.player.updateMany({
        where: { userId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      return { success: true };
    });
  }

  /**
   * Export user data (GDPR)
   */
  static async exportUserData(userId) {
    return await withDatabaseUserContext(userId, async (tx) => {
      const user = await tx.user.findFirst({
        where: {
          id: userId,
          isDeleted: false,
        },
        include: {
          teams: {
            where: { isDeleted: false },
            include: {
              players: {
                where: { isDeleted: false },
              },
            },
          },
          players: {
            where: { isDeleted: false },
            include: {
              matchStats: {
                include: {
                  match: true,
                },
              },
            },
          },
          matches: {
            include: {
              playerStats: {
                include: {
                  player: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        return null;
      }

      // Decrypt all sensitive data
      const decryptedUser = {
        ...user,
        email: user.email ? EncryptionService.decrypt(user.email) : null,
        name: user.name ? EncryptionService.decrypt(user.name) : null,
        teams: user.teams.map(team => ({
          ...team,
          name: EncryptionService.decrypt(team.name),
          players: team.players.map(player => ({
            ...player,
            name: EncryptionService.decrypt(player.name),
          })),
        })),
        players: user.players.map(player => ({
          ...player,
          name: EncryptionService.decrypt(player.name),
          matchStats: player.matchStats.map(stat => ({
            ...stat,
            match: {
              ...stat.match,
              opponent: stat.match.opponent,
            },
          })),
        })),
        matches: user.matches.map(match => ({
          ...match,
          playerStats: match.playerStats.map(stat => ({
            ...stat,
            player: {
              ...stat.player,
              name: EncryptionService.decrypt(stat.player.name),
            },
          })),
        })),
      };

      return decryptedUser;
    });
  }

  /**
   * Update user consent (GDPR)
   */
  static async updateConsent(userId, hasConsent) {
    return await withDatabaseUserContext(userId, async (tx) => {
      return await tx.user.update({
        where: { id: userId },
        data: {
          hasConsent,
          consentDate: hasConsent ? new Date() : null,
        },
      });
    });
  }

  /**
   * Check if user is premium
   */
  static async isPremium(userId) {
    const prisma = getPrisma();
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPremium: true },
    });

    return user?.isPremium || false;
  }

  /**
   * Update premium status
   */
  static async updatePremiumStatus(userId, isPremium) {
    return await withDatabaseUserContext(userId, async (tx) => {
      return await tx.user.update({
        where: { id: userId },
        data: { isPremium },
      });
    });
  }

  /**
   * Get user statistics
   */
  static async getUserStats(userId) {
    return await withDatabaseUserContext(userId, async (tx) => {
      const [
        totalTeams,
        totalPlayers,
        totalMatches,
        finishedMatches,
        recentMatches,
      ] = await Promise.all([
        tx.team.count({
          where: { userId, isDeleted: false },
        }),
        tx.player.count({
          where: { userId, isDeleted: false },
        }),
        tx.match.count({
          where: { userId },
        }),
        tx.match.count({
          where: { userId, isFinished: true },
        }),
        tx.match.findMany({
          where: { userId, isFinished: true },
          orderBy: { date: 'desc' },
          take: 10,
          include: {
            playerStats: true,
          },
        }),
      ]);

      // Calculate win/loss record
      const wins = recentMatches.filter(m => m.goalsFor > m.goalsAgainst).length;
      const losses = recentMatches.filter(m => m.goalsFor < m.goalsAgainst).length;
      const draws = recentMatches.filter(m => m.goalsFor === m.goalsAgainst).length;

      // Calculate total goals
      const totalGoalsFor = recentMatches.reduce((sum, m) => sum + m.goalsFor, 0);
      const totalGoalsAgainst = recentMatches.reduce((sum, m) => sum + m.goalsAgainst, 0);

      return {
        totalTeams,
        totalPlayers,
        totalMatches,
        finishedMatches,
        wins,
        losses,
        draws,
        totalGoalsFor,
        totalGoalsAgainst,
        winPercentage: finishedMatches > 0 ? ((wins / finishedMatches) * 100).toFixed(1) : 0,
      };
    });
  }
}

export default UserService;
