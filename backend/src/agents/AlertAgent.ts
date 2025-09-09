import { query } from '../database/connection';
import { logger, logAuditEvent } from '../utils/logger';
import { AuthenticatedRequest, NotFoundError } from '../types';
import { genkitMultiAgentFramework } from '../utils/genkitAgentFramework';
import { streamingService } from '../utils/realTimeStreaming';

export interface AlertProcessingResult {
  alert_id: string;
  status: 'processed' | 'failed';
  analysis: {
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    affected_population: number;
    required_resources: string[];
    recommended_actions: string[];
  };
  next_steps: {
    schedule_relief: boolean;
    notify_authorities: boolean;
    evacuate_area: boolean;
  };
  processing_time: number;
}

export class AlertAgent {
  private readonly agentId = 'agent_alert_001';
  private readonly agentType = 'alert';

  /**
   * Process an incoming alert and determine response actions
   */
  async processAlert(alertId: string, _auth: NonNullable<AuthenticatedRequest['auth']>): Promise<AlertProcessingResult> {
    const startTime = Date.now();
    
    try {
      // Fetch alert from database
      const alertResult = await query(`
        SELECT id, type, severity, title, description, location_address, location_lat, location_lng, metadata, status
        FROM alerts 
        WHERE id = $1
      `, [alertId]);

      if (alertResult.rows.length === 0) {
        throw new NotFoundError(`Alert with ID ${alertId} not found`);
      }

      const alert = alertResult.rows[0];
      
      // Update alert status to processing
      await query('UPDATE alerts SET status = $1, updated_at = NOW() WHERE id = $2', ['processing', alertId]);

      // Analyze alert and determine response
      const analysis = await this.analyzeAlert(alert);
      const nextSteps = this.determineNextSteps(alert, analysis);

      const processingTime = Date.now() - startTime;

      const result: AlertProcessingResult = {
        alert_id: alertId,
        status: 'processed',
        analysis,
        next_steps: nextSteps,
        processing_time: processingTime
      };

      // Log audit event
      logAuditEvent({
        actor: this.agentId,
        action: 'alert.process',
        resource: `alert:${alertId}`,
        result: 'success',
        details: {
          alert_type: alert.type,
          severity: alert.severity,
          risk_level: analysis.risk_level,
          processing_time: processingTime
        }
      });

      logger.info(`Alert processed successfully: ${alertId}`, {
        agentId: this.agentId,
        alertType: alert.type,
        severity: alert.severity,
        riskLevel: analysis.risk_level,
        processingTime
      });

      return result;
    } catch (error) {
      // Update alert status to failed processing
      await query('UPDATE alerts SET status = $1, updated_at = NOW() WHERE id = $2', ['active', alertId]);

      logAuditEvent({
        actor: this.agentId,
        action: 'alert.process',
        resource: `alert:${alertId}`,
        result: 'failure',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          processing_time: Date.now() - startTime
        }
      });

      logger.error(`Alert processing failed: ${alertId}`, error);
      throw error;
    }
  }

  /**
   * Analyze alert to determine risk level and required resources
   */
  private async analyzeAlert(alert: any): Promise<AlertProcessingResult['analysis']> {
    const { type, severity, location_address, title, description } = alert;

    // Try Genkit agent framework analysis first, fallback to rule-based
    try {
      return await this.genkitFrameworkAnalysis(alert);
    } catch (error) {
      logger.warn('Genkit framework analysis failed, falling back to rule-based analysis:', error);
    }

    // Rule-based analysis (existing logic)
    return this.ruleBasedAnalysis(alert);
  }

  /**
   * Genkit-powered alert analysis
   */
  private async genkitFrameworkAnalysis(alert: any): Promise<AlertProcessingResult['analysis']> {
    try {
      const analysisResult = await genkitMultiAgentFramework.executeTask('alert_analysis', alert);
      
      if (analysisResult && analysisResult.alert_analysis) {
        const analysis = analysisResult.alert_analysis;
        return {
          risk_level: analysis.risk_level || 'medium',
          affected_population: analysis.affected_population || 0,
          required_resources: analysis.required_resources || [],
          recommended_actions: analysis.recommended_actions || []
        };
      }
      
      throw new Error('Genkit framework returned invalid result');
    } catch (error) {
      logger.error('Genkit framework analysis failed:', error);
      throw error;
    }
  }

  /**
   * Rule-based alert analysis (fallback)
   */
  private ruleBasedAnalysis(alert: any): AlertProcessingResult['analysis'] {
    const { type, severity, location_address } = alert;

    // Risk level calculation based on type and severity
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    
    if (severity === 'critical') {
      riskLevel = 'critical';
    } else if (severity === 'high') {
      riskLevel = type === 'fire' || type === 'earthquake' ? 'critical' : 'high';
    } else if (severity === 'medium') {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    // Estimate affected population (simplified logic)
    let affectedPopulation = 100; // Default estimate
    if (location_address.toLowerCase().includes('mumbai') || location_address.toLowerCase().includes('delhi')) {
      affectedPopulation = 5000; // High density urban areas
    } else if (location_address.toLowerCase().includes('city') || location_address.toLowerCase().includes('town')) {
      affectedPopulation = 1000; // Urban areas
    } else {
      affectedPopulation = 500; // Rural areas
    }

    // Adjust based on severity
    const severityMultiplier: Record<string, number> = {
      'low': 0.5,
      'medium': 1,
      'high': 2,
      'critical': 5
    };
    affectedPopulation = Math.floor(affectedPopulation * (severityMultiplier[severity] || 1));

    // Determine required resources based on alert type
    const requiredResources = this.getRequiredResources(type, severity);
    
    // Generate recommended actions
    const recommendedActions = this.getRecommendedActions(type, severity, riskLevel);

    return {
      risk_level: riskLevel,
      affected_population: affectedPopulation,
      required_resources: requiredResources,
      recommended_actions: recommendedActions
    };
  }

  /**
   * Determine required resources based on alert type and severity
   */
  private getRequiredResources(type: string, severity: string): string[] {
    const baseResources: Record<string, string[]> = {
      flood: ['rescue_boats', 'water_pumps', 'emergency_shelters', 'medical_supplies'],
      fire: ['fire_trucks', 'firefighters', 'water_tankers', 'evacuation_buses'],
      earthquake: ['search_rescue_teams', 'medical_teams', 'heavy_machinery', 'emergency_shelters'],
      storm: ['emergency_shelters', 'power_restoration_crews', 'medical_supplies', 'communication_equipment'],
      medical: ['ambulances', 'medical_teams', 'hospital_beds', 'medical_supplies'],
      security: ['police_units', 'security_personnel', 'communication_equipment', 'evacuation_routes']
    };

    let resources = baseResources[type] || ['emergency_response_team'];

    // Add additional resources for high severity incidents
    if (severity === 'high' || severity === 'critical') {
      resources.push('helicopter_support', 'additional_personnel', 'mobile_command_center');
    }

    return resources;
  }

  /**
   * Generate recommended actions based on alert analysis
   */
  private getRecommendedActions(type: string, severity: string, riskLevel: string): string[] {
    const actions: string[] = [];

    // Base actions for all alerts
    actions.push('notify_local_authorities', 'activate_emergency_protocols');

    // Type-specific actions
    switch (type) {
      case 'flood':
        actions.push('issue_evacuation_warning', 'deploy_rescue_teams', 'setup_relief_camps');
        break;
      case 'fire':
        actions.push('deploy_fire_suppression', 'evacuate_surrounding_areas', 'establish_safety_perimeter');
        break;
      case 'earthquake':
        actions.push('search_and_rescue_operations', 'structural_damage_assessment', 'medical_triage_setup');
        break;
      case 'storm':
        actions.push('secure_loose_objects', 'power_grid_protection', 'shelter_in_place_advisory');
        break;
      case 'medical':
        actions.push('deploy_medical_teams', 'quarantine_if_necessary', 'contact_health_authorities');
        break;
      case 'security':
        actions.push('deploy_security_forces', 'establish_secure_perimeter', 'investigate_threat');
        break;
    }

    // Severity-based additional actions
    if (severity === 'critical' || riskLevel === 'critical') {
      actions.push('declare_emergency_state', 'request_external_assistance', 'media_communication');
    }

    return actions;
  }

  /**
   * Determine next steps in the workflow
   */
  private determineNextSteps(alert: any, analysis: AlertProcessingResult['analysis']): AlertProcessingResult['next_steps'] {
    const { type, severity } = alert;
    const { risk_level } = analysis;

    return {
      schedule_relief: risk_level === 'high' || risk_level === 'critical',
      notify_authorities: true, // Always notify authorities
      evacuate_area: (type === 'fire' || type === 'flood' || type === 'earthquake') && 
                     (severity === 'high' || severity === 'critical')
    };
  }

  /**
   * Get agent information
   */
  getAgentInfo() {
    return {
      id: this.agentId,
      type: this.agentType,
      name: 'Alert Processing Agent',
      description: 'Processes incoming disaster alerts and determines appropriate response actions',
      capabilities: [
        'alert_analysis',
        'risk_assessment',
        'resource_planning',
        'action_recommendation'
      ],
      status: 'active'
    };
  }
}