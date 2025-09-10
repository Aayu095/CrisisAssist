import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';
import { logger } from './utils/logger';
import { connectDatabase } from './database/connection';

// Import routes
const alertRoutes = require('./routes/alerts');
const agentRoutes = require('./routes/agents');
const auditRoutes = require('./routes/audit');
const healthRoutes = require('./routes/health');
const workflowRoutes = require('./routes/workflow');
import realWorkflowRoutes from './routes/realWorkflowRoutes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Logging middleware
app.use(morgan(process.env.LOG_FORMAT || 'combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint (no auth required)
app.use('/api/health', healthRoutes);

// API routes with authentication
app.use('/api/alerts', authenticateToken, alertRoutes);
app.use('/api/agents', authenticateToken, agentRoutes);
app.use('/api/audit', authenticateToken, auditRoutes);
app.use('/api/workflow', authenticateToken, workflowRoutes);
app.use('/api/real-workflow', realWorkflowRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'CrisisAssist API - Secure Multi-Agent Emergency Response System',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      alerts: '/api/alerts',
      agents: '/api/agents',
      audit: '/api/audit',
      workflow: '/api/workflow'
    }
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The requested endpoint ${req.originalUrl} does not exist`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');

    // Start HTTP server
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 CrisisAssist API server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 API Base URL: ${process.env.API_BASE_URL || `http://localhost:${PORT}`}`);
      logger.info(`🛡️  Security: Descope authentication enabled`);
      logger.info(`📝 Logging: ${process.env.LOG_LEVEL || 'info'} level`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();