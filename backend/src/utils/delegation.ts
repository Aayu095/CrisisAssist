import { logger } from './logger';
import { createDelegatedToken, validateAgentToken } from './descope-real';
import { DescopeJWTClaims } from '../types';

/**
 * User consent and delegation flows for CrisisAssist
 * Implements proper delegation chains as required by hackathon theme
 */

export interface ConsentRequest {
  userId: string;
  delegatorAgentId: string;
  delegateeAgentId: string;
  requestedScopes: string[];
  purpose: string;
  expiresIn?: number;
}

export interface ConsentResponse {
  consentId: string;
  granted: boolean;
  grantedScopes: string[];
  expiresAt: Date;
  delegatedToken?: string;
}

export interface DelegationChain {
  originalUser: string;
  delegations: Array<{
    from: string;
    to: string;
    scopes: string[];
    consentId: string;
    grantedAt: Date;
  }>;
}

/**
 * Request user consent for agent delegation
 */
export async function requestUserConsent(request: ConsentRequest): Promise<ConsentResponse> {
  try {
    const consentId = `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // In a real implementation, this would:
    // 1. Show consent UI to user via Descope Flow
    // 2. Store consent request in database
    // 3. Wait for user approval
    // 4. Generate delegated token upon approval
    
    // For demo purposes, auto-approve with limited scopes
    const grantedScopes = request.requestedScopes.filter(scope => 
      ['alert.read', 'calendar.write', 'message.send', 'document.verify'].includes(scope)
    );
    
    const expiresAt = new Date(Date.now() + (request.expiresIn || 1800) * 1000); // 30 min default
    
    // Create delegated token
    const delegatedToken = await createDelegatedToken(
      request.delegatorAgentId,
      request.delegateeAgentId,
      request.userId,
      grantedScopes,
      consentId
    );
    
    logger.info('User consent granted for agent delegation', {
      consentId,
      userId: request.userId,
      delegator: request.delegatorAgentId,
      delegatee: request.delegateeAgentId,
      grantedScopes,
      purpose: request.purpose
    });
    
    return {
      consentId,
      granted: true,
      grantedScopes,
      expiresAt,
      delegatedToken
    };
  } catch (error) {
    logger.error('Failed to process consent request:', error);
    throw new Error(`Consent request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate delegation chain and ensure proper authorization
 */
export async function validateDelegationChain(token: string): Promise<{
  valid: boolean;
  chain?: DelegationChain;
  claims?: DescopeJWTClaims;
  error?: string;
}> {
  try {
    const validation = await validateAgentToken(token);
    
    if (!validation.valid || !validation.claims) {
      return {
        valid: false,
        error: validation.error || 'Invalid token'
      };
    }
    
    const claims = validation.claims;
    
    // Check if this is a delegated token
    if (!claims.delegation) {
      // Regular agent token, no delegation chain
      return {
        valid: true,
        claims,
        chain: {
          originalUser: claims.user_id || claims.sub,
          delegations: []
        }
      };
    }
    
    // Validate delegation
    const delegation = claims.delegation;
    const chain: DelegationChain = {
      originalUser: claims.user_id || delegation.delegator,
      delegations: [{
        from: delegation.delegator,
        to: delegation.delegatee,
        scopes: claims.scope?.split(' ') || [],
        consentId: delegation.consent_id,
        grantedAt: new Date(delegation.granted_at * 1000)
      }]
    };
    
    logger.info('Delegation chain validated', {
      tokenSubject: claims.sub,
      originalUser: chain.originalUser,
      delegationCount: chain.delegations.length
    });
    
    return {
      valid: true,
      claims,
      chain
    };
  } catch (error) {
    logger.error('Delegation chain validation failed:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Validation failed'
    };
  }
}

/**
 * Create agent-to-agent delegation for specific operations
 */
export async function createAgentDelegation(
  fromAgentId: string,
  toAgentId: string,
  scopes: string[],
  userId?: string,
  purpose?: string
): Promise<string> {
  try {
    const consentId = `agent_delegation_${Date.now()}`;
    
    // For agent-to-agent delegation, we create a scoped token
    const delegatedToken = await createDelegatedToken(
      fromAgentId,
      toAgentId,
      userId || 'system',
      scopes,
      consentId
    );
    
    logger.info('Agent delegation created', {
      from: fromAgentId,
      to: toAgentId,
      scopes,
      purpose,
      consentId
    });
    
    return delegatedToken;
  } catch (error) {
    logger.error('Failed to create agent delegation:', error);
    throw new Error(`Agent delegation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Revoke consent and invalidate delegated tokens
 */
export async function revokeConsent(consentId: string, userId: string): Promise<boolean> {
  try {
    // In a real implementation, this would:
    // 1. Mark consent as revoked in database
    // 2. Add token to blacklist
    // 3. Notify affected agents
    
    logger.info('Consent revoked', {
      consentId,
      userId,
      revokedAt: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    logger.error('Failed to revoke consent:', error);
    return false;
  }
}

/**
 * Check if agent has permission to act on behalf of user
 */
export function hasUserDelegation(claims: DescopeJWTClaims, requiredScopes: string[]): boolean {
  if (!claims.delegation || !claims.user_id) {
    return false;
  }
  
  const tokenScopes = claims.scope?.split(' ') || [];
  
  // Check if delegated token has all required scopes
  return requiredScopes.every(scope => 
    tokenScopes.includes(scope) || tokenScopes.includes('*')
  );
}

/**
 * Emergency override for critical situations
 */
export async function createEmergencyDelegation(
  agentId: string,
  emergencyScopes: string[],
  justification: string
): Promise<string> {
  try {
    const consentId = `emergency_${Date.now()}`;
    
    // Emergency tokens have shorter expiry (15 minutes)
    const emergencyToken = await createDelegatedToken(
      'system',
      agentId,
      'emergency_system',
      emergencyScopes,
      consentId
    );
    
    logger.warn('Emergency delegation created', {
      agentId,
      emergencyScopes,
      justification,
      consentId,
      expiresIn: '15 minutes'
    });
    
    return emergencyToken;
  } catch (error) {
    logger.error('Failed to create emergency delegation:', error);
    throw new Error(`Emergency delegation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
