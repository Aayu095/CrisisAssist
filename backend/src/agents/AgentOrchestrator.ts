import { v4 as uuidv4 } from 'uuid';
import { logger, logAuditEvent } from '../utils/logger';
import { AuthenticatedRequest } from '../types';
import { generateAgentAccessToken, createDelegatedToken, validateAgentToken, verifyAgentScopes } from '../utils/descope-real';
import { AlertAgent } from './AlertAgent';
import { VerifierAgent } from './VerifierAgent';
import { SchedulerAgent } from './SchedulerAgent';
import { NotifierAgent } from './NotifierAgent';

export interface WorkflowRequest {
  workflow_id: string;
  user_id: string;
  alert_data: any;
  consent_granted: boolean;
  requested_actions: string[];
}

export interface AgentCommunication {
  from_agent: string;
  to_agent: string;
  action: string;
  data: any;
  token: string;
  timestamp: Date;
}

export interface WorkflowResult {
  workflow_id: string;
  status: 'completed' | 'failed' | 'partial';
  agent_results: Record<string, any>;
  communications: AgentCommunication[];
  consent_validations: Array<{
    agent: string;
    action: string;
    consent_required: boolean;
    consent_granted: boolean;
  }>;
  execution_time: number;
}

/**
 * Multi-Agent Orchestrator implementing Theme 3 requirements:
 * - Secure agent-to-agent communication via Descope tokens
 * - Scoped access control for each agent
 * - Delegated consent for user-facing actions
 * - Audit trail of all inter-agent communications
 */
export class AgentOrchestrator {
  private readonly orchestratorId = 'orchestrator_001';
  private alertAgent: AlertAgent;
  private verifierAgent: VerifierAgent;
  private schedulerAgent: SchedulerAgent;
  private notifierAgent: NotifierAgent;

  constructor() {
    this.alertAgent = new AlertAgent();
    this.verifierAgent = new VerifierAgent();
    this.schedulerAgent = new SchedulerAgent();
    this.notifierAgent = new NotifierAgent();
  }

  /**
   * Execute emergency response workflow with secure agent coordination
   */
  async executeEmergencyWorkflow(request: WorkflowRequest, auth: NonNullable<AuthenticatedRequest['auth']>): Promise<WorkflowResult> {
    const startTime = Date.now();
    const communications: AgentCommunication[] = [];
    const agentResults: Record<string, any> = {};
    const consentValidations: Array<{
      agent: string;
      action: string;
      consent_required: boolean;
      consent_granted: boolean;
    }> = [];

    try {
      logger.info(`Starting emergency workflow: ${request.workflow_id}`, {
        orchestratorId: this.orchestratorId,
        userId: request.user_id,
        alertType: request.alert_data.type
      });

      // Step 1: Alert Agent processes the emergency alert
      const alertResult = await this.executeAgentTask(
        'alert_agent',
        'processAlert',
        { alertId: request.alert_data.id },
        ['alert.read', 'alert.process'],
        auth,
        communications
      );
      agentResults.alert_processing = alertResult;

      // Step 2: Verifier Agent validates the alert content
      const verificationResult = await this.executeAgentTask(
        'verifier_agent',
        'verifyContent',
        {
          content_type: 'alert',
          content: request.alert_data,
          verification_rules: ['source_verification', 'urgency_validation', 'location_validation']
        },
        ['document.verify', 'content.validate'],
        auth,
        communications
      );
      agentResults.content_verification = verificationResult;

      // Step 3: Check if user consent is required for scheduling and notifications
      const requiresScheduling = alertResult.next_steps?.schedule_relief;
      const requiresNotification = alertResult.next_steps?.notify_authorities;

      if (requiresScheduling) {
        const consentValidation = {
          agent: 'scheduler_agent',
          action: 'calendar.write',
          consent_required: true,
          consent_granted: request.consent_granted
        };
        consentValidations.push(consentValidation);

        if (request.consent_granted) {
          // Step 4: Scheduler Agent creates relief coordination events (with user consent)
          const schedulingResult = await this.executeAgentTaskWithDelegation(
            'scheduler_agent',
            'scheduleRelief',
            {
              alert_id: request.alert_data.id,
              required_resources: alertResult.analysis?.required_resources || [],
              urgency: alertResult.analysis?.risk_level || 'medium'
            },
            ['calendar.write', 'event.create'],
            auth,
            request.user_id,
            'emergency_response_consent',
            communications
          );
          agentResults.scheduling = schedulingResult;
        } else {
          agentResults.scheduling = { error: 'User consent required for calendar operations' };
        }
      }

      if (requiresNotification) {
        const consentValidation = {
          agent: 'notifier_agent',
          action: 'message.send',
          consent_required: true,
          consent_granted: request.consent_granted
        };
        consentValidations.push(consentValidation);

        if (request.consent_granted) {
          // Step 5: Notifier Agent sends alerts (with user consent)
          const notificationResult = await this.executeAgentTaskWithDelegation(
            'notifier_agent',
            'sendEmergencyNotifications',
            {
              alert_data: request.alert_data,
              analysis: alertResult.analysis,
              verification: verificationResult,
              channels: ['slack', 'sms', 'email']
            },
            ['message.send', 'notification.create'],
            auth,
            request.user_id,
            'emergency_notification_consent',
            communications
          );
          agentResults.notifications = notificationResult;
        } else {
          agentResults.notifications = { error: 'User consent required for notification operations' };
        }
      }

      const executionTime = Date.now() - startTime;
      const status = this.determineWorkflowStatus(agentResults);

      const result: WorkflowResult = {
        workflow_id: request.workflow_id,
        status,
        agent_results: agentResults,
        communications,
        consent_validations: consentValidations,
        execution_time: executionTime
      };

      // Log workflow completion
      logAuditEvent({
        actor: this.orchestratorId,
        action: 'workflow.execute',
        resource: `workflow:${request.workflow_id}`,
        result: status === 'completed' ? 'success' : 'failure',
        details: {
          workflow_type: 'emergency_response',
          agents_involved: Object.keys(agentResults).length,
          communications_count: communications.length,
          consent_validations: consentValidations.length,
          execution_time: executionTime
        }
      });

      logger.info(`Emergency workflow completed: ${request.workflow_id}`, {
        status,
        executionTime,
        agentsInvolved: Object.keys(agentResults)
      });

      return result;
    } catch (error) {
      logger.error(`Emergency workflow failed: ${request.workflow_id}`, error);
      
      logAuditEvent({
        actor: this.orchestratorId,
        action: 'workflow.execute',
        resource: `workflow:${request.workflow_id}`,
        result: 'failure',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          execution_time: Date.now() - startTime
        }
      });

      throw error;
    }
  }

  /**
   * Execute agent task with scoped token authentication
   */
  private async executeAgentTask(
    agentType: string,
    action: string,
    data: any,
    requiredScopes: string[],
    auth: NonNullable<AuthenticatedRequest['auth']>,
    communications: AgentCommunication[]
  ): Promise<any> {
    try {
      // Generate scoped token for the agent
      const agentToken = await generateAgentAccessToken(
        `${agentType}_${Date.now()}`,
        requiredScopes,
        1800 // 30 minutes
      );

      // Validate the token has required scopes
      const validation = await validateAgentToken(agentToken);
      if (!validation.valid || !validation.claims) {
        throw new Error(`Agent token validation failed: ${validation.error}`);
      }

      const hasScopes = verifyAgentScopes(requiredScopes, validation.claims.scope?.split(' ') || []);
      if (!hasScopes) {
        throw new Error(`Agent lacks required scopes: ${requiredScopes.join(', ')}`);
      }

      // Log the agent communication
      const communication: AgentCommunication = {
        from_agent: this.orchestratorId,
        to_agent: agentType,
        action,
        data,
        token: agentToken.substring(0, 20) + '...', // Log partial token for security
        timestamp: new Date()
      };
      communications.push(communication);

      // Execute the agent task based on type
      let result: any;
      const agentAuth = { ...auth, token: agentToken, claims: validation.claims };

      switch (agentType) {
        case 'alert_agent':
          result = await this.alertAgent.processAlert(data.alertId, agentAuth);
          break;
        case 'verifier_agent':
          result = await this.verifierAgent.verifyContent(data, agentAuth);
          break;
        case 'scheduler_agent':
          result = await this.schedulerAgent.scheduleRelief(data, agentAuth);
          break;
        case 'notifier_agent':
          result = await this.notifierAgent.sendEmergencyNotifications(data, agentAuth);
          break;
        default:
          throw new Error(`Unknown agent type: ${agentType}`);
      }

      logger.info(`Agent task completed: ${agentType}.${action}`, {
        agentType,
        action,
        scopes: requiredScopes,
        success: true
      });

      return result;
    } catch (error) {
      logger.error(`Agent task failed: ${agentType}.${action}`, error);
      throw error;
    }
  }

  /**
   * Execute agent task with delegated user consent
   */
  private async executeAgentTaskWithDelegation(
    agentType: string,
    action: string,
    data: any,
    requiredScopes: string[],
    auth: NonNullable<AuthenticatedRequest['auth']>,
    userId: string,
    consentId: string,
    communications: AgentCommunication[]
  ): Promise<any> {
    try {
      // Create delegated token with user consent
      const delegatedToken = await createDelegatedToken(
        this.orchestratorId,
        `${agentType}_${Date.now()}`,
        userId,
        requiredScopes,
        consentId
      );

      // Validate the delegated token
      const validation = await validateAgentToken(delegatedToken);
      if (!validation.valid || !validation.claims) {
        throw new Error(`Delegated token validation failed: ${validation.error}`);
      }

      // Verify delegation is valid
      if (!validation.claims.delegation) {
        throw new Error('Token missing delegation information');
      }

      // Log the delegated communication
      const communication: AgentCommunication = {
        from_agent: this.orchestratorId,
        to_agent: agentType,
        action: `${action} (delegated)`,
        data: { ...data, delegation: validation.claims.delegation },
        token: delegatedToken.substring(0, 20) + '...', // Log partial token for security
        timestamp: new Date()
      };
      communications.push(communication);

      // Execute the agent task with delegated authority
      let result: any;
      const delegatedAuth = { ...auth, token: delegatedToken, claims: validation.claims };

      switch (agentType) {
        case 'scheduler_agent':
          result = await this.schedulerAgent.scheduleRelief(data, delegatedAuth);
          break;
        case 'notifier_agent':
          result = await this.notifierAgent.sendEmergencyNotifications(data, delegatedAuth);
          break;
        default:
          throw new Error(`Agent type ${agentType} does not support delegation`);
      }

      logger.info(`Delegated agent task completed: ${agentType}.${action}`, {
        agentType,
        action,
        userId,
        consentId,
        scopes: requiredScopes,
        success: true
      });

      return result;
    } catch (error) {
      logger.error(`Delegated agent task failed: ${agentType}.${action}`, error);
      throw error;
    }
  }

  /**
   * Determine overall workflow status based on agent results
   */
  private determineWorkflowStatus(agentResults: Record<string, any>): 'completed' | 'failed' | 'partial' {
    const results = Object.values(agentResults);
    const hasErrors = results.some(result => result.error || result.status === 'failed');
    const hasSuccess = results.some(result => !result.error && result.status !== 'failed');

    if (hasErrors && hasSuccess) {
      return 'partial';
    } else if (hasErrors) {
      return 'failed';
    } else {
      return 'completed';
    }
  }

  /**
   * Get orchestrator information
   */
  getOrchestratorInfo() {
    return {
      id: this.orchestratorId,
      name: 'Multi-Agent Emergency Response Orchestrator',
      description: 'Coordinates secure communication between specialized emergency response agents',
      agents: [
        this.alertAgent.getAgentInfo(),
        this.verifierAgent.getAgentInfo(),
        this.schedulerAgent.getAgentInfo(),
        this.notifierAgent.getAgentInfo()
      ],
      capabilities: [
        'secure_agent_communication',
        'scoped_access_control',
        'delegated_consent_management',
        'workflow_orchestration',
        'audit_trail_generation'
      ],
      security_features: [
        'descope_token_validation',
        'scope_enforcement',
        'delegation_support',
        'consent_verification',
        'cryptographic_signatures'
      ],
      status: 'active'
    };
  }
}
