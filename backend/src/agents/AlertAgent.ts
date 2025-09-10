import { query } from '../database/connection';
import { logger, logAuditEvent } from '../utils/logger';
import { AuthenticatedRequest, NotFoundError } from '../types';
import { genkitMultiAgentFramework } from '../utils/genkitAgentFramework';
import { streamingService } from '../utils/realTimeStreaming';
import axios from 'axios';
import { SlackService } from '../utils/slack';
import { twilioService } from '../utils/twilio';

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
  private slackService: SlackService;

  constructor() {
    this.slackService = new SlackService();
  }

  /**
   * 🚨 REAL WORK: Detect crisis from multiple sources and create alert
   */
  async detectAndCreateAlert(crisisData: {
    source: 'manual' | 'sensor' | 'api' | 'citizen_report';
    type: string;
    severity: string;
    title: string;
    description: string;
    location: {
      address: string;
      lat?: number;
      lng?: number;
    };
    metadata?: any;
  }, auth: NonNullable<AuthenticatedRequest['auth']>): Promise<{ alert_id: string; immediate_actions: any[] }> {
    const startTime = Date.now();
    
    try {
      // 1. Validate location using Geoapify (real geocoding)
      const validatedLocation = await this.validateAndEnhanceLocation(crisisData.location);
      
      // 2. Create alert in database
      const alertId = await this.createAlertRecord(crisisData, validatedLocation);
      
      // 3. Immediately broadcast to internal team (REAL Slack notification)
      const immediateNotifications = await this.sendImmediateAlerts(alertId, crisisData);
      
      // 4. Log the real detection
      logAuditEvent({
        actor: this.agentId,
        action: 'crisis.detect',
        resource: `alert:${alertId}`,
        result: 'success',
        details: {
          source: crisisData.source,
          type: crisisData.type,
          severity: crisisData.severity,
          location: validatedLocation.address,
          immediate_notifications: immediateNotifications.length
        }
      });

      logger.info(`🚨 CRISIS DETECTED AND ALERT CREATED: ${alertId}`, {
        agentId: this.agentId,
        source: crisisData.source,
        type: crisisData.type,
        severity: crisisData.severity,
        location: validatedLocation.address
      });

      return {
        alert_id: alertId,
        immediate_actions: immediateNotifications
      };
    } catch (error) {
      logger.error('Crisis detection failed:', error);
      throw error;
    }
  }

  /**
   * 🌍 REAL WORK: Validate location using Geoapify API
   */
  private async validateAndEnhanceLocation(location: { address: string; lat?: number; lng?: number }): Promise<{ address: string; lat: number; lng: number; formatted_address: string }> {
    try {
      // Use Geoapify for real geocoding (free tier available)
      const geoapifyKey = process.env.GEOAPIFY_API_KEY || 'demo_key';
      
      if (geoapifyKey === 'demo_key') {
        // Demo mode - return mock coordinates
        return {
          address: location.address,
          lat: location.lat || 22.7196,
          lng: location.lng || 75.8577,
          formatted_address: `${location.address}, India`
        };
      }

      const response = await axios.get(`https://api.geoapify.com/v1/geocode/search`, {
        params: {
          text: location.address,
          apiKey: geoapifyKey,
          limit: 1
        }
      });

      if (response.data.features && response.data.features.length > 0) {
        const feature = response.data.features[0];
        return {
          address: location.address,
          lat: feature.geometry.coordinates[1],
          lng: feature.geometry.coordinates[0],
          formatted_address: feature.properties.formatted
        };
      }

      // Fallback to provided coordinates or defaults
      return {
        address: location.address,
        lat: location.lat || 22.7196,
        lng: location.lng || 75.8577,
        formatted_address: location.address
      };
    } catch (error) {
      logger.warn('Geoapify geocoding failed, using fallback:', error);
      return {
        address: location.address,
        lat: location.lat || 22.7196,
        lng: location.lng || 75.8577,
        formatted_address: location.address
      };
    }
  }

  /**
   * 💾 REAL WORK: Create alert record in database
   */
  private async createAlertRecord(crisisData: any, location: any): Promise<string> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await query(`
      INSERT INTO alerts (id, type, severity, title, description, location_address, location_lat, location_lng, metadata, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    `, [
      alertId,
      crisisData.type,
      crisisData.severity,
      crisisData.title,
      crisisData.description,
      location.formatted_address,
      location.lat,
      location.lng,
      JSON.stringify({ source: crisisData.source, ...crisisData.metadata }),
      'active'
    ]);

    return alertId;
  }

  /**
   * 📢 REAL WORK: Send immediate alerts to internal team via Slack and SMS
   */
  private async sendImmediateAlerts(alertId: string, crisisData: any): Promise<any[]> {
    const notifications = [];

    try {
      // 1. REAL Slack notification to emergency channel
      const slackMessage = `🚨 **EMERGENCY ALERT DETECTED** 🚨

**Type:** ${crisisData.type.toUpperCase()}
**Severity:** ${crisisData.severity.toUpperCase()}
**Location:** ${crisisData.location.address}
**Source:** ${crisisData.source}

**Description:** ${crisisData.description}

**Alert ID:** ${alertId}
**Time:** ${new Date().toLocaleString()}

⚡ **IMMEDIATE ACTION REQUIRED** ⚡
CrisisAssist AI has detected this emergency and is initiating response protocols.`;

      const slackResult = await this.slackService.sendMessage({
        channel: '#emergency-alerts',
        text: slackMessage,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `🚨 ${crisisData.severity.toUpperCase()} ${crisisData.type.toUpperCase()} ALERT`
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Location:*\n${crisisData.location.address}`
              },
              {
                type: 'mrkdwn',
                text: `*Source:*\n${crisisData.source}`
              },
              {
                type: 'mrkdwn',
                text: `*Alert ID:*\n${alertId}`
              },
              {
                type: 'mrkdwn',
                text: `*Time:*\n${new Date().toLocaleString()}`
              }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Description:*\n${crisisData.description}`
            }
          }
        ]
      });

      notifications.push({
        type: 'slack',
        status: 'sent',
        message_id: slackResult.ts,
        channel: '#emergency-alerts'
      });

      // 2. REAL SMS notification to emergency contacts
      const smsMessage = `🚨 CRISIS ALERT: ${crisisData.type.toUpperCase()} - ${crisisData.severity.toUpperCase()}
Location: ${crisisData.location.address}
Time: ${new Date().toLocaleString()}
Alert ID: ${alertId}
Immediate response required!`;

      const emergencyContacts = ['+1234567890']; // Demo number
      for (const contact of emergencyContacts) {
        try {
          const smsResult = await twilioService.sendSMS({
            to: contact,
            message: smsMessage,
            priority: 'urgent'
          });

          notifications.push({
            type: 'sms',
            status: smsResult.success ? 'sent' : 'failed',
            message_id: smsResult.messageId,
            recipient: contact,
            error: smsResult.error
          });
        } catch (smsError) {
          notifications.push({
            type: 'sms',
            status: 'failed',
            recipient: contact,
            error: smsError instanceof Error ? smsError.message : 'Unknown error'
          });
        }
      }

    } catch (error) {
      logger.error('Failed to send immediate alerts:', error);
      notifications.push({
        type: 'error',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return notifications;
  }

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