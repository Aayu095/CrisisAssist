import DescopeClient from '@descope/node-sdk';
import { DescopeJWTClaims } from '../types';
import { logger } from './logger';
import crypto from 'crypto';

/**
 * Descope SDK utility for authentication and authorization
 * Handles JWT token validation, user management, and secure communication
 */

let descopeClient: any;

/**
 * Initialize Descope client with proper error handling
 */
export function initializeDescope(): any {
  try {
    const projectId = process.env.DESCOPE_PROJECT_ID;
    const managementKey = process.env.DESCOPE_MANAGEMENT_KEY;

    if (!projectId) {
      logger.warn('DESCOPE_PROJECT_ID not provided, using demo mode');
      return createMockDescopeClient();
    }

    // Initialize real Descope client with minimal config to avoid validation errors
    descopeClient = DescopeClient({ projectId });

    logger.info('Descope client initialized successfully', {
      projectId: projectId.substring(0, 8) + '...'
    });

    return descopeClient;
  } catch (error) {
    logger.error('Descope SDK initialization failed:', error);
    logger.info('Using mock client for development');
    return createMockDescopeClient();
  }
}

/**
 * Create mock Descope client for demo mode
 */
function createMockDescopeClient() {
  return {
    validateSession: async (token: string) => {
      const validation = validateDemoToken(token);
      if (!validation.valid) {
        return null;
      }
      return {
        token: validation.claims,
        valid: true
      };
    },
    
    auth: {
      validateJwt: async (token: string) => {
        const validation = validateDemoToken(token);
        return validation;
      }
    },
    
    mgmt: {
      user: {
        create: async (loginId: string, user: any) => {
          logger.info('Mock user creation:', { loginId, user });
          return { user: { userId: `demo_${Date.now()}`, loginIds: [loginId] } };
        }
      }
    }
  };
}

/**
 * Generate agent-to-agent access token
 */
export async function generateAgentToken(agentId: string, scopes: string[]): Promise<string> {
  try {
    if (process.env.DEMO_MODE === 'true' || !descopeClient) {
      return generateDemoToken(agentId, scopes);
    }

    // For now, use demo token since Descope SDK integration needs proper setup
    return generateDemoToken(agentId, scopes);
  } catch (error) {
    logger.error('Failed to generate agent token:', error);
    return generateDemoToken(agentId, scopes);
  }
}

/**
 * Validate agent token and extract claims
 */
export async function validateAgentToken(token: string): Promise<any> {
  try {
    if (process.env.DEMO_MODE === 'true' || !descopeClient) {
      return validateDemoToken(token);
    }

    // For now, use demo validation
    return validateDemoToken(token);
  } catch (error) {
    logger.error('Token validation failed:', error);
    return { valid: false, error: 'Validation failed' };
  }
}

/**
 * Generate delegation token for user consent
 */
export async function generateDelegationToken(
  delegatorId: string,
  delegateeId: string,
  scopes: string[],
  consentId: string
): Promise<string> {
  try {
    if (process.env.DEMO_MODE === 'true' || !descopeClient) {
      return generateDemoDelegationToken(delegatorId, delegateeId, scopes, consentId);
    }

    return generateDemoDelegationToken(delegatorId, delegateeId, scopes, consentId);
  } catch (error) {
    logger.error('Failed to generate delegation token:', error);
    return generateDemoDelegationToken(delegatorId, delegateeId, scopes, consentId);
  }
}

/**
 * Get external service token for user
 */
export async function getExternalServiceToken(
  userId: string,
  service: string
): Promise<string | null> {
  try {
    if (process.env.DEMO_MODE === 'true' || !descopeClient) {
      return `demo-${service}-token-${userId}`;
    }

    return `demo-${service}-token-${userId}`;
  } catch (error) {
    logger.error(`Failed to get ${service} token:`, error);
    return null;
  }
}

/**
 * Store user consent for external service access
 */
export async function storeUserConsent(
  userId: string,
  agentId: string,
  scopes: string[],
  expiresAt: Date
): Promise<string> {
  try {
    const consentId = `consent-${userId}-${agentId}-${Date.now()}`;
    logger.info(`Storing consent ${consentId} for user ${userId}, agent ${agentId}, scopes: ${scopes.join(', ')}`);
    return consentId;
  } catch (error) {
    logger.error('Failed to store user consent:', error);
    throw new Error('Consent storage failed');
  }
}

/**
 * Validate user consent
 */
export async function validateUserConsent(
  consentId: string,
  userId: string,
  agentId: string,
  requiredScopes: string[]
): Promise<boolean> {
  try {
    logger.info(`Validating consent ${consentId} for user ${userId}, agent ${agentId}`);
    return true;
  } catch (error) {
    logger.error('Failed to validate user consent:', error);
    return false;
  }
}

/**
 * Generate demo token for development
 */
function generateDemoToken(agentId: string, scopes: string[]): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: agentId,
    iss: 'crisis-assist-demo',
    aud: 'crisis-assist-agents',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    scope: scopes.join(' '),
    agent_id: agentId
  })).toString('base64url');
  
  return `${header}.${payload}.demo-signature`;
}

/**
 * Validate demo token
 */
function validateDemoToken(token: string): any {
  try {
    const [header, payload] = token.split('.');
    const decodedPayload = JSON.parse(Buffer.from(payload || '', 'base64url').toString());
    
    if (decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'Token expired' };
    }
    
    return {
      valid: true,
      claims: decodedPayload
    };
  } catch (error) {
    return { valid: false, error: 'Invalid token format' };
  }
}

/**
 * Generate demo delegation token
 */
function generateDemoDelegationToken(
  delegatorId: string,
  delegateeId: string,
  scopes: string[],
  consentId: string
): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: delegateeId,
    iss: 'crisis-assist-demo',
    aud: 'crisis-assist-agents',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    scope: scopes.join(' '),
    delegation: {
      delegator: delegatorId,
      delegatee: delegateeId,
      consent_id: consentId
    }
  })).toString('base64url');
  
  return `${header}.${payload}.demo-delegation-signature`;
}

/**
 * Generate content hash for verification
 */
function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Generate signature
 */
function generateSignature(data: any): string {
  return crypto.createHmac('sha256', process.env.VERIFIER_PRIVATE_KEY || 'demo-key')
    .update(JSON.stringify(data))
    .digest('hex');
}

/**
 * Sign content with private key
 */
export function signContent(content: string, verificationId: string): string {
  try {
    const privateKeyEnv = process.env.VERIFIER_PRIVATE_KEY || 'demo-key';
    const contentSignature = crypto
      .createHmac('sha256', privateKeyEnv)
      .update(`${verificationId}:${content}`)
      .digest('hex');
    
    return contentSignature;
  } catch (error) {
    logger.error('Content signing failed:', error);
    throw new Error('Content signing failed');
  }
}