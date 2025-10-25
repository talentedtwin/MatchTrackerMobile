/**
 * Health Check API Route
 * GET /api/health - Basic health check
 */
import { healthCheck  } from '../../lib/prisma.js';

async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Check database health
      const dbHealth = await healthCheck();

      const health = {
        status: dbHealth.status === 'healthy' ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        database: dbHealth,
        environment: process.env.NODE_ENV || 'development',
      };

      const statusCode = health.status === 'ok' ? 200 : 503;

      return res.status(statusCode).json(health);
    } catch (error) {
      console.error('Health check error:', error);

      return res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        database: {
          status: 'error',
          error: error.message,
        },
      });
    }
  }

  return res.status(405).json({
    error: 'Method not allowed',
  });
}

export default handler;
