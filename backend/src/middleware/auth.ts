import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, DescopeJWTClaims, AuthenticationError, AuthorizationError } from '../types';
import { logger, logSecurityEvent, logAuditEvent } from '../utils/logger';
import { validateAgentToken, verifyAgentScopes } from '../utils/descope-real';

/**
 * Middleware to authenticate requests using Descope JWT tokens
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logSecurityEvent({
        type: 'auth_failure',
        details: { reason: 'missing_token', ip: req.ip }
      });
      throw new AuthenticationError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Validate token with real Descope SDK
      const validationResult = await validateAgentToken(token);
      
      if (!validationResult.valid || !validationResult.claims) {
        throw new AuthenticationError(validationResult.error || 'Invalid or expired token');
      }

      // Extract claims from the validated token
      const claims = validationResult.claims;
      
      req.auth = {
        userId: claims.sub,
        sessionToken: token,
        token: token,
        scopes: claims.scope?.split(' ') || [],
        agentId: claims.agent_id,
        claims: claims
      };

      // Parse scopes from the token
      const scopes = claims.scope?.split(' ') || [];

      logSecurityEvent({
        type: 'token_validation',
        details: { 
          scopes,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          actor: claims.sub
        }
      });

      next();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        next(error);
      } else {
        logger.error('Authentication middleware error:', error);
        next(new AuthenticationError('Authentication failed'));
      }
    }
  } catch (error) {
    if (error instanceof AuthenticationError) {
      next(error);
    } else {
      logger.error('Authentication middleware error:', error);
      next(new AuthenticationError('Authentication failed'));
    }
  }
};

/**
 * Middleware to check if the authenticated user/agent has required scopes
 */
export const requireScopes = (requiredScopes: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.auth) {
        throw new AuthenticationError('Authentication required');
      }

      const { claims } = req.auth;
      
      // Check if user has all required scopes
      const hasAllScopes = requiredScopes.every(scope => 
        claims.scope?.split(' ').includes(scope) || claims.scope?.split(' ').includes('*') // '*' is admin scope
      );

      if (!hasAllScopes) {
        logSecurityEvent({
          type: 'scope_violation',
          details: { 
            required_scopes: requiredScopes,
            user_scopes: claims.scope?.split(' '),
            ip: req.ip,
            actor: claims.sub
          }
        });
        throw new AuthorizationError(`Insufficient permissions. Required scopes: ${requiredScopes.join(', ')}`);
      }

      logSecurityEvent({
        type: 'token_validation',
        details: { 
          required_scopes: requiredScopes,
          granted: true,
          ip: req.ip,
          actor: claims.sub
        }
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if the request is from a specific agent type
 */
export const requireAgentType = (allowedAgentTypes: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.auth || !req.auth.claims.agent_id) {
        throw new AuthorizationError('Agent authentication required');
      }

      // Extract agent type from agent ID or use agent_type field
      const agentType = req.auth.claims.agent_type || req.auth.claims.agent_id?.split('_')[1];
      
      if (!agentType || !allowedAgentTypes.includes(agentType)) {
        logSecurityEvent({
          type: 'scope_violation',
          details: { 
            required_agent_types: allowedAgentTypes,
            actual_agent_type: agentType,
            ip: req.ip,
            actor: req.auth.claims.sub
          }
        });
        throw new AuthorizationError(`Access denied. Allowed agent types: ${allowedAgentTypes.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to validate delegation tokens
 */
export const validateDelegation = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) {
      throw new AuthenticationError('Authentication required');
    }

    const { claims } = req.auth;
    
    // Check if this is a delegated token
    if (claims.delegation) {
      const { delegator, delegatee, consent_id } = claims.delegation;
      
      // Log delegation usage
      logSecurityEvent({
        type: 'token_validation',
        details: { 
          delegation: {
            delegator,
            delegatee,
            consent_id
          },
          ip: req.ip,
          actor: claims.sub
        }
      });

      // TODO: Validate consent is still active in database
      // This would involve checking the consent_id against stored user consents
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without auth context
      return next();
    }

    // Try to authenticate, but don't fail if it doesn't work
    await authenticate(req, res, next);
  } catch (error) {
    // Log the error but continue without auth context
    logger.warn('Optional authentication failed:', error);
    next();
  }
};

/**
 * Middleware for demo/development mode that bypasses authentication
 */
export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      // Check if we're in demo mode
      if (process.env.DEMO_MODE === 'true') {
        // In demo mode, create a mock auth object
        req.auth = {
          userId: 'demo-user-123',
          sessionToken: 'demo-session-token',
          token: 'demo-session-token',
          scopes: ['alert.read', 'alert.write', 'calendar.write', 'message.send', 'document.verify'],
          agentId: 'demo-agent-123',
          claims: {
            sub: 'demo-user-123',
            iss: 'crisisassist-demo',
            aud: 'crisisassist',
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000),
            scope: 'alert.read alert.write calendar.write message.send document.verify',
            agent_id: 'demo-agent-123',
            agent_type: 'demo'
          } as DescopeJWTClaims
        };
        
        logger.info('Demo mode: Using mock authentication');
        return next();
      }

      logSecurityEvent({
        type: 'auth_failure',
        details: { 
          reason: 'missing_token',
          resource_type: 'api_endpoint',
          resource_id: req.path,
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        }
      });
      
      throw new AuthenticationError('Access token is required');
    }
    
    try {
      // Validate token with real Descope SDK
      const validationResult = await validateAgentToken(token);
      
      if (!validationResult.valid || !validationResult.claims) {
        throw new AuthenticationError(validationResult.error || 'Invalid or expired token');
      }

      const claims = validationResult.claims;
      
      req.auth = {
        userId: claims.sub,
        sessionToken: token,
        token: token,
        scopes: claims.scope?.split(' ') || [],
        agentId: claims.agent_id,
        claims: claims
      };

      logSecurityEvent({
        type: 'token_validation',
        details: { 
          scopes: claims.scope?.split(' ') || [],
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          actor: claims.sub
        }
      });

      next();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        next(error);
      } else {
        logger.error('Authentication middleware error:', error);
        next(new AuthenticationError('Authentication failed'));
      }
    }
  } catch (error) {
    if (error instanceof AuthenticationError) {
      next(error);
    } else {
      logger.error('Authentication middleware error:', error);
      next(new AuthenticationError('Authentication failed'));
    }
  }
};

/**
 * Rate limiting per authenticated user/agent
 */
export const authRateLimit = (maxRequests: number, windowMs: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next();
    }

    const key = req.auth.claims.sub;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean up old entries
    for (const [k, v] of requests.entries()) {
      if (v.resetTime < windowStart) {
        requests.delete(k);
      }
    }
    
    const userRequests = requests.get(key);
    
    if (!userRequests) {
      requests.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (userRequests.count >= maxRequests) {
      logSecurityEvent({
        type: 'suspicious_activity',
        details: { 
          delegation_validation: 'failed',
          consent_id: req.auth.claims.delegation?.consent_id,
          ip: req.ip,
          actor: req.auth.claims.sub
        }
      });
      
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    userRequests.count++;
    next();
  };
};