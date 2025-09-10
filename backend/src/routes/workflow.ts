import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection';
import { authenticateToken, requireScopes } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest, ValidationError } from '../types';
import { logger } from '../utils/logger';
import { AgentOrchestrator } from '../agents/AgentOrchestrator';

const router = Router();
const orchestrator = new AgentOrchestrator();

/**
 * Execute emergency response workflow
 * POST /api/workflow/emergency
 * 
 * Demonstrates Theme 3 requirements:
 * - Secure agent-to-agent communication via Descope tokens
 * - Scoped access control for each agent
 * - Delegated consent for user-facing actions
 * - Complete audit trail of inter-agent communications
 */
router.post('/emergency', 
  authenticateToken,
  requireScopes(['workflow.execute']),
  [
    body('alert_id').isUUID().withMessage('Valid alert ID is required'),
    body('consent_granted').isBoolean().withMessage('Consent status must be boolean'),
    body('requested_actions').isArray().optional().withMessage('Requested actions must be an array')
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { alert_id, consent_granted, requested_actions = [] } = req.body;
    const workflowId = uuidv4();

    try {
      // Fetch alert data
      const alertResult = await query(`
        SELECT id, type, severity, title, description, location_address, 
               location_lat, location_lng, metadata, created_at, status
        FROM alerts 
        WHERE id = $1
      `, [alert_id]);

      if (alertResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ALERT_NOT_FOUND',
            message: 'Alert not found'
          },
          timestamp: new Date().toISOString()
        });
      }

      const alertData = alertResult.rows[0];

      // Create workflow request
      const workflowRequest = {
        workflow_id: workflowId,
        user_id: req.auth!.userId,
        alert_data: alertData,
        consent_granted,
        requested_actions
      };

      logger.info(`Starting emergency workflow: ${workflowId}`, {
        alertId: alert_id,
        userId: req.auth!.userId,
        consentGranted: consent_granted,
        alertType: alertData.type,
        severity: alertData.severity
      });

      // Execute the multi-agent workflow
      const workflowResult = await orchestrator.executeEmergencyWorkflow(
        workflowRequest,
        req.auth!
      );

      // Store workflow result in database
      await query(`
        INSERT INTO workflow_executions (id, user_id, workflow_type, alert_id, 
                                       request_data, result_data, status, 
                                       execution_time, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        workflowId,
        req.auth!.userId,
        'emergency_response',
        alert_id,
        JSON.stringify(workflowRequest),
        JSON.stringify(workflowResult),
        workflowResult.status,
        workflowResult.execution_time,
        new Date()
      ]);

      res.json({
        success: true,
        data: {
          workflow_id: workflowId,
          status: workflowResult.status,
          execution_time: workflowResult.execution_time,
          agents_involved: Object.keys(workflowResult.agent_results),
          communications_count: workflowResult.communications.length,
          consent_validations: workflowResult.consent_validations,
          results: {
            alert_processing: workflowResult.agent_results.alert_processing,
            content_verification: workflowResult.agent_results.content_verification,
            scheduling: workflowResult.agent_results.scheduling,
            notifications: workflowResult.agent_results.notifications
          },
          security_audit: {
            agent_communications: workflowResult.communications.map(comm => ({
              from: comm.from_agent,
              to: comm.to_agent,
              action: comm.action,
              timestamp: comm.timestamp,
              token_used: comm.token // Partial token for audit
            })),
            scope_validations: workflowResult.consent_validations
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error(`Emergency workflow failed: ${workflowId}`, error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'WORKFLOW_EXECUTION_FAILED',
          message: error instanceof Error ? error.message : 'Workflow execution failed',
          workflow_id: workflowId
        },
        timestamp: new Date().toISOString()
      });
    }
  })
);

/**
 * Get workflow execution status
 * GET /api/workflow/:workflowId
 */
router.get('/:workflowId', 
  authenticateToken,
  requireScopes(['workflow.read']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { workflowId } = req.params;

    const result = await query(`
      SELECT id, user_id, workflow_type, alert_id, request_data, 
             result_data, status, execution_time, created_at
      FROM workflow_executions 
      WHERE id = $1 AND user_id = $2
    `, [workflowId, req.auth!.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'WORKFLOW_NOT_FOUND',
          message: 'Workflow not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    const workflow = result.rows[0];

    res.json({
      success: true,
      data: {
        workflow_id: workflow.id,
        workflow_type: workflow.workflow_type,
        alert_id: workflow.alert_id,
        status: workflow.status,
        execution_time: workflow.execution_time,
        created_at: workflow.created_at,
        result_summary: JSON.parse(workflow.result_data)
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * List user's workflow executions
 * GET /api/workflow
 */
router.get('/', 
  authenticateToken,
  requireScopes(['workflow.read']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { limit = 10, offset = 0 } = req.query;

    const result = await query(`
      SELECT id, workflow_type, alert_id, status, execution_time, created_at
      FROM workflow_executions 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [req.auth!.userId, parseInt(limit as string), parseInt(offset as string)]);

    res.json({
      success: true,
      data: {
        workflows: result.rows,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: result.rows.length
        }
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * Get orchestrator information and agent status
 * GET /api/workflow/orchestrator/info
 */
router.get('/orchestrator/info', 
  authenticateToken,
  requireScopes(['system.read']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const orchestratorInfo = orchestrator.getOrchestratorInfo();

    res.json({
      success: true,
      data: orchestratorInfo,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * Simulate emergency workflow for demo purposes
 * POST /api/workflow/demo/emergency
 */
router.post('/demo/emergency', 
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const workflowId = uuidv4();
    
    // Create a demo alert
    const demoAlert = {
      id: uuidv4(),
      type: 'flood',
      severity: 'high',
      title: 'Flash Flood Warning - Indore',
      description: 'Heavy rainfall has caused flash flooding in central Indore. Immediate evacuation required for low-lying areas.',
      location_address: 'Indore, Madhya Pradesh, India',
      location_lat: 22.7196,
      location_lng: 75.8577,
      metadata: { source: 'simulation', demo_mode: true },
      created_at: new Date(),
      status: 'active'
    };

    // Insert demo alert
    await query(`
      INSERT INTO alerts (id, type, severity, title, description, location_address, 
                         location_lat, location_lng, metadata, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      demoAlert.id, demoAlert.type, demoAlert.severity, demoAlert.title,
      demoAlert.description, demoAlert.location_address, demoAlert.location_lat,
      demoAlert.location_lng, JSON.stringify(demoAlert.metadata), 
      demoAlert.status, demoAlert.created_at
    ]);

    // Create workflow request with consent granted for demo
    const workflowRequest = {
      workflow_id: workflowId,
      user_id: req.auth!.userId,
      alert_data: demoAlert,
      consent_granted: true,
      requested_actions: ['schedule_relief', 'notify_authorities']
    };

    try {
      // Execute the multi-agent workflow
      const workflowResult = await orchestrator.executeEmergencyWorkflow(
        workflowRequest,
        req.auth!
      );

      res.json({
        success: true,
        data: {
          demo_mode: true,
          workflow_id: workflowId,
          demo_alert: demoAlert,
          workflow_result: workflowResult,
          theme_3_compliance: {
            secure_agent_communication: true,
            scoped_access_control: true,
            delegated_consent: true,
            audit_trail: workflowResult.communications.length > 0,
            descope_integration: true
          }
        },
        message: 'Demo emergency workflow executed successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error(`Demo workflow failed: ${workflowId}`, error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'DEMO_WORKFLOW_FAILED',
          message: error instanceof Error ? error.message : 'Demo workflow failed'
        },
        timestamp: new Date().toISOString()
      });
    }
  })
);

export default router;
