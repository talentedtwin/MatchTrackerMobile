const { PrismaClient } = require('@prisma/client');

/**
 * Prisma client with connection management and retry logic
 */
class PrismaManager {
  constructor() {
    this.prisma = null;
    this.isConnected = false;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Get or create Prisma client instance
   */
  getInstance() {
    if (!this.prisma) {
      this.prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        errorFormat: 'pretty',
      });
    }
    return this.prisma;
  }

  /**
   * Connect to database with retry logic
   */
  async connect() {
    if (this.isConnected) {
      return this.getInstance();
    }

    const client = this.getInstance();
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await client.$connect();
        this.isConnected = true;
        console.log('Database connected successfully');
        return client;
      } catch (error) {
        lastError = error;
        console.error(`Database connection attempt ${attempt} failed:`, error.message);
        
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * attempt;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed to connect to database after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    if (this.prisma && this.isConnected) {
      await this.prisma.$disconnect();
      this.isConnected = false;
      console.log('Database disconnected');
    }
  }

  /**
   * Execute a database operation with retry logic
   */
  async executeWithRetry(operation, retries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.error(`Operation attempt ${attempt} failed:`, error.message);
        
        // Check if error is recoverable
        const isRecoverable = 
          error.code === 'P2024' || // Connection pool timeout
          error.code === 'P1001' || // Can't reach database server
          error.code === 'P1002' || // Database server timeout
          error.message.includes('Connection') ||
          error.message.includes('timeout');

        if (!isRecoverable || attempt === retries) {
          throw error;
        }

        // Wait before retry
        const delay = this.retryDelay * attempt;
        console.log(`Retrying operation in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));

        // Reconnect if needed
        if (!this.isConnected) {
          await this.connect();
        }
      }
    }

    throw lastError;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const client = this.getInstance();
      await client.$queryRaw`SELECT 1`;
      return { status: 'healthy', connected: this.isConnected };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        connected: this.isConnected,
        error: error.message 
      };
    }
  }
}

// Global instance
const prismaManager = new PrismaManager();

// Export the manager and convenience methods
module.exports = {
  prismaManager,
  getPrisma: () => prismaManager.getInstance(),
  connectDb: () => prismaManager.connect(),
  disconnectDb: () => prismaManager.disconnect(),
  executeWithRetry: (operation, retries) => prismaManager.executeWithRetry(operation, retries),
  healthCheck: () => prismaManager.healthCheck(),
};

// Handle process termination
process.on('beforeExit', async () => {
  await prismaManager.disconnect();
});

process.on('SIGINT', async () => {
  await prismaManager.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prismaManager.disconnect();
  process.exit(0);
});
