import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Production security middleware
 */
export const productionSecurityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Ensure HTTPS in production
  if (process.env.NODE_ENV === 'production' && req.header('x-forwarded-proto') !== 'https') {
    return res.redirect(`https://${req.header('host')}${req.url}`);
  }

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
};

/**
 * API key validation middleware
 */
export const validateApiKeys = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    const requiredKeys = [
      'DESCOPE_PROJECT_ID',
      'DESCOPE_MANAGEMENT_KEY',
      'JWT_SECRET',
      'DATABASE_URL'
    ];

    const missingKeys = requiredKeys.filter(key => !process.env[key] || process.env[key]?.includes('demo'));
    
    if (missingKeys.length > 0) {
      logger.error('Missing or demo API keys in production:', missingKeys);
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Required API keys not configured for production'
      });
    }
  }

  next();
};

/**
 * Rate limiting for production
 */
export const productionRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 100, // Higher limit for production
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  }
};