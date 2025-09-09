import { Router, Request, Response } from 'express';
import { getPool } from '../database/connection';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Health check endpoint
 * GET /api/health
 */
router.get('/', async (req: Request, res: Response) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    services: {
      database: 'unknown',
      descope: 'unknown'
    }
  };

  try {
    // Check database connection
    const pool = getPool();
    const dbResult = await pool.query('SELECT NOW()');
    healthCheck.services.database = 'healthy';
  } catch (error) {
    healthCheck.services.database = 'unhealthy';
    healthCheck.status = 'degraded';
    logger.error('Database health check failed:', error);
  }

  // Check Descope connection (basic check)
  try {
    if (process.env.DESCOPE_PROJECT_ID && process.env.DESCOPE_MANAGEMENT_KEY) {
      healthCheck.services.descope = 'configured';
    } else {
      healthCheck.services.descope = 'not_configured';
    }
  } catch (error) {
    healthCheck.services.descope = 'error';
    logger.error('Descope health check failed:', error);
  }

  const statusCode = healthCheck.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

/**
 * Detailed health check endpoint
 * GET /api/health/detailed
 */
router.get('/detailed', async (req: Request, res: Response) => {
  const detailedHealth = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    system: {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version
    },
    services: {
      database: {
        status: 'unknown',
        responseTime: 0,
        connections: 0
      },
      descope: {
        status: 'unknown',
        configured: false
      }
    },
    agents: {
      alert: 'unknown',
      scheduler: 'unknown',
      notifier: 'unknown',
      verifier: 'unknown'
    }
  };

  try {
    // Database health check with timing
    const dbStart = Date.now();
    const pool = getPool();
    await pool.query('SELECT NOW()');
    const dbEnd = Date.now();
    
    detailedHealth.services.database = {
      status: 'healthy',
      responseTime: dbEnd - dbStart,
      connections: pool.totalCount
    };

    // Check agent records in database
    const agentResult = await pool.query('SELECT type, status FROM agents');
    agentResult.rows.forEach((agent: any) => {
      detailedHealth.agents[agent.type as keyof typeof detailedHealth.agents] = agent.status;
    });

  } catch (error) {
    detailedHealth.services.database.status = 'unhealthy';
    detailedHealth.status = 'degraded';
    logger.error('Detailed database health check failed:', error);
  }

  // Descope configuration check
  try {
    detailedHealth.services.descope = {
      status: process.env.DESCOPE_PROJECT_ID && process.env.DESCOPE_MANAGEMENT_KEY ? 'configured' : 'not_configured',
      configured: !!(process.env.DESCOPE_PROJECT_ID && process.env.DESCOPE_MANAGEMENT_KEY)
    };
  } catch (error) {
    detailedHealth.services.descope.status = 'error';
    logger.error('Descope configuration check failed:', error);
  }

  const statusCode = detailedHealth.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(detailedHealth);
});

/**
 * Readiness probe endpoint
 * GET /api/health/ready
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if all critical services are ready
    const pool = getPool();
    await pool.query('SELECT 1');
    
    // Check if required environment variables are set
    const requiredEnvVars = [
      'DESCOPE_PROJECT_ID',
      'DESCOPE_MANAGEMENT_KEY',
      'DATABASE_URL'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      return res.status(503).json({
        status: 'not_ready',
        message: 'Missing required environment variables',
        missing: missingEnvVars,
        timestamp: new Date().toISOString()
      });
    }

    return res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    return res.status(503).json({
      status: 'not_ready',
      message: 'Service not ready',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Liveness probe endpoint
 * GET /api/health/live
 */
router.get('/live', (req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;