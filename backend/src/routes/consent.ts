import { Router } from 'express';
import { AuthenticatedRequest } from '../types';
import { authenticateToken, requireScopes } from '../middleware/auth';
import { requestUserConsent, validateDelegationChain, createAgentDelegation, revokeConsent } from '../utils/delegation';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Request user consent for agent delegation
 * POST /api/consent/request
 */
router.post('/request', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { delegateeAgentId, requestedScopes, purpose, expiresIn } = req.body;
    
    if (!delegateeAgentId || !requestedScopes || !purpose) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'delegateeAgentId, requestedScopes, and purpose are required'
        }
      });
    }

    const consentRequest = {
      userId: req.auth!.claims.sub,
      delegatorAgentId: req.auth!.claims.agent_id || req.auth!.claims.sub,
      delegateeAgentId,
      requestedScopes: Array.isArray(requestedScopes) ? requestedScopes : [requestedScopes],
      purpose,
      expiresIn
    };

    const consentResponse = await requestUserConsent(consentRequest);

    logger.info('Consent request processed', {
      consentId: consentResponse.consentId,
      userId: req.auth!.claims.sub,
      granted: consentResponse.granted
    });

    return res.json({
      success: true,
      data: consentResponse
    });
  } catch (error) {
    logger.error('Consent request failed:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CONSENT_REQUEST_FAILED',
        message: error instanceof Error ? error.message : 'Failed to process consent request'
      }
    });
  }
});

/**
 * Validate delegation chain for a token
 * POST /api/consent/validate
 */
router.post('/validate', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Token is required for validation'
        }
      });
    }

    const validation = await validateDelegationChain(token);

    return res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    logger.error('Delegation validation failed:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to validate delegation'
      }
    });
  }
});

/**
 * Create agent-to-agent delegation
 * POST /api/consent/delegate
 */
router.post('/delegate', 
  authenticateToken, 
  requireScopes(['delegation.create']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { toAgentId, scopes, purpose } = req.body;
      
      if (!toAgentId || !scopes) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'toAgentId and scopes are required'
          }
        });
      }

      const fromAgentId = req.auth!.claims.agent_id || req.auth!.claims.sub;
      const userId = req.auth!.claims.user_id;

      const delegatedToken = await createAgentDelegation(
        fromAgentId,
        toAgentId,
        Array.isArray(scopes) ? scopes : [scopes],
        userId,
        purpose
      );

      return res.json({
        success: true,
        data: {
          delegatedToken,
          fromAgent: fromAgentId,
          toAgent: toAgentId,
          scopes: Array.isArray(scopes) ? scopes : [scopes],
          createdAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Agent delegation failed:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'DELEGATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create delegation'
        }
      });
    }
  }
);

/**
 * Revoke consent
 * POST /api/consent/revoke
 */
router.post('/revoke', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { consentId } = req.body;
    
    if (!consentId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CONSENT_ID',
          message: 'consentId is required'
        }
      });
    }

    const revoked = await revokeConsent(consentId, req.auth!.claims.sub);

    return res.json({
      success: true,
      data: {
        consentId,
        revoked,
        revokedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Consent revocation failed:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'REVOCATION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to revoke consent'
      }
    });
  }
});

/**
 * Get user's active consents
 * GET /api/consent/active
 */
router.get('/active', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    // In a real implementation, this would query the database for active consents
    const mockConsents = [
      {
        consentId: 'consent_123',
        delegateeAgent: 'scheduler_agent_001',
        scopes: ['calendar.write', 'event.create'],
        purpose: 'Emergency event scheduling',
        grantedAt: new Date(Date.now() - 3600000).toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        status: 'active'
      },
      {
        consentId: 'consent_456',
        delegateeAgent: 'notifier_agent_001',
        scopes: ['message.send'],
        purpose: 'Emergency notifications',
        grantedAt: new Date(Date.now() - 1800000).toISOString(),
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        status: 'active'
      }
    ];

    return res.json({
      success: true,
      data: {
        userId: req.auth!.claims.sub,
        activeConsents: mockConsents,
        totalCount: mockConsents.length
      }
    });
  } catch (error) {
    logger.error('Failed to retrieve active consents:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'RETRIEVAL_FAILED',
        message: 'Failed to retrieve active consents'
      }
    });
  }
});

module.exports = router;
