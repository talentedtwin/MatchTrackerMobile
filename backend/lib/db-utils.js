const { getPrisma, executeWithRetry } = require('./prisma');

/**
 * Set database user context for Row Level Security
 * @param {string} userId - Clerk user ID
 */
async function setDatabaseUserContext(userId) {
  const prisma = getPrisma();
  
  if (!userId) {
    throw new Error('User ID is required for database context');
  }

  try {
    await prisma.$executeRawUnsafe(
      `SET LOCAL app.current_user_id = '${userId}'`
    );
  } catch (error) {
    console.error('Failed to set database user context:', error);
    throw error;
  }
}

/**
 * Execute database operation with RLS context
 * @param {string} userId - Clerk user ID
 * @param {Function} operation - Database operation to execute
 */
async function withDatabaseUserContext(userId, operation) {
  const prisma = getPrisma();

  return await prisma.$transaction(async (tx) => {
    // Set the RLS context
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_user_id = '${userId}'`
    );

    // Execute the operation with the transaction client
    return await operation(tx);
  });
}

/**
 * Retry database operation with exponential backoff
 * @param {Function} operation - Database operation to execute
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 */
async function retryDbOperation(operation, maxRetries = 3, baseDelay = 1000) {
  return await executeWithRetry(operation, maxRetries);
}

/**
 * Database utility functions
 */
const dbUtils = {
  /**
   * Create a record
   */
  async create(model, data, userId) {
    return await withDatabaseUserContext(userId, async (tx) => {
      return await tx[model].create({ data });
    });
  },

  /**
   * Find many records
   */
  async findMany(model, options, userId) {
    return await withDatabaseUserContext(userId, async (tx) => {
      return await tx[model].findMany({
        ...options,
        where: {
          ...options?.where,
          isDeleted: false,
        },
      });
    });
  },

  /**
   * Find one record by ID
   */
  async findById(model, id, options, userId) {
    return await withDatabaseUserContext(userId, async (tx) => {
      return await tx[model].findFirst({
        ...options,
        where: {
          id,
          isDeleted: false,
        },
      });
    });
  },

  /**
   * Find one record
   */
  async findOne(model, where, options, userId) {
    return await withDatabaseUserContext(userId, async (tx) => {
      return await tx[model].findFirst({
        ...options,
        where: {
          ...where,
          isDeleted: false,
        },
      });
    });
  },

  /**
   * Update a record
   */
  async update(model, id, data, userId) {
    return await withDatabaseUserContext(userId, async (tx) => {
      return await tx[model].update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    });
  },

  /**
   * Soft delete a record
   */
  async softDelete(model, id, userId) {
    return await withDatabaseUserContext(userId, async (tx) => {
      return await tx[model].update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
    });
  },

  /**
   * Hard delete a record
   */
  async hardDelete(model, id, userId) {
    return await withDatabaseUserContext(userId, async (tx) => {
      return await tx[model].delete({
        where: { id },
      });
    });
  },

  /**
   * Count records
   */
  async count(model, where, userId) {
    return await withDatabaseUserContext(userId, async (tx) => {
      return await tx[model].count({
        where: {
          ...where,
          isDeleted: false,
        },
      });
    });
  },

  /**
   * Check if record exists
   */
  async exists(model, where, userId) {
    const count = await this.count(model, where, userId);
    return count > 0;
  },

  /**
   * Batch create records
   */
  async createMany(model, data, userId) {
    return await withDatabaseUserContext(userId, async (tx) => {
      return await tx[model].createMany({
        data,
        skipDuplicates: true,
      });
    });
  },

  /**
   * Batch update records
   */
  async updateMany(model, where, data, userId) {
    return await withDatabaseUserContext(userId, async (tx) => {
      return await tx[model].updateMany({
        where: {
          ...where,
          isDeleted: false,
        },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    });
  },

  /**
   * Batch soft delete records
   */
  async softDeleteMany(model, where, userId) {
    return await withDatabaseUserContext(userId, async (tx) => {
      return await tx[model].updateMany({
        where,
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
    });
  },
};

module.exports = {
  setDatabaseUserContext,
  withDatabaseUserContext,
  retryDbOperation,
  dbUtils,
};
