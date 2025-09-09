import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection';
import { logger, logAuditEvent, logExternalApiCall } from '../utils/logger';
import { AuthenticatedRequest, ExternalServiceError } from '../types';
import { SlackService } from '../utils/slack';
import { twilioService } from '../utils/twilio';
import { genkitMultiAgentFramework } from '../utils/genkitAgentFramework';

export interface NotificationRequest {
  event_id?: string;
  alert_id?: string;
  channel_type: 'slack' | 'sms' | 'email' | 'whatsapp';
  recipients: string[];
  message: {
    subject?: string;
    content: string;
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface NotificationResult {
  message_id: string;
  channel_type: string;
  recipients_count: number;
  sent_count: number;
  failed_count: number;
  status: 'sent' | 'partial' | 'failed';
  delivery_results: Array<{
    recipient: string;
    status: 'sent' | 'failed';
    message_id?: string;
    error?: string;
  }>;
  external_service_results: {
    slack?: {
      success: boolean;
      message_id?: string;
      error?: string;
    };
    twilio?: {
      success: boolean;
      message_id?: string;
      error?: string;
    };
  };
}

export class NotifierAgent {
  private readonly agentId = 'agent_notifier_001';
  private readonly agentType = 'notifier';
  private slackService: SlackService;

  constructor() {
    this.slackService = new SlackService();
  }

  /**
   * Send notification to specified recipients
   */
  async sendNotification(request: NotificationRequest, _auth: NonNullable<AuthenticatedRequest['auth']>): Promise<NotificationResult> {
    const messageId = uuidv4();
    
    try {
      // Validate request
      await this.validateNotificationRequest(request);

      // Get context information (alert/event details)
      const context = await this.getNotificationContext(request);
      
      // Enhance message with context
      const enhancedMessage = await this.enhanceMessage(request.message, context);

      // Send notifications based on channel type
      const deliveryResults = await this.sendByChannel(request.channel_type, request.recipients, enhancedMessage, request.priority);

      // Calculate results
      const sentCount = deliveryResults.filter(r => r.status === 'sent').length;
      const failedCount = deliveryResults.filter(r => r.status === 'failed').length;
      
      let overallStatus: 'sent' | 'partial' | 'failed' = 'sent';
      if (failedCount > 0) {
        overallStatus = sentCount > 0 ? 'partial' : 'failed';
      }

      // Store notification records in database
      await this.storeNotificationRecords(messageId, request, deliveryResults, context);

      const result: NotificationResult = {
        message_id: messageId,
        channel_type: request.channel_type,
        recipients_count: request.recipients.length,
        sent_count: sentCount,
        failed_count: failedCount,
        status: overallStatus,
        delivery_results: deliveryResults,
        external_service_results: this.getExternalServiceResults(deliveryResults)
      };

      // Log audit event
      logAuditEvent({
        actor: this.agentId,
        action: 'notification.send',
        resource: `message:${messageId}`,
        result: overallStatus === 'failed' ? 'failure' : 'success',
        details: {
          channel_type: request.channel_type,
          recipients_count: request.recipients.length,
          sent_count: sentCount,
          failed_count: failedCount,
          priority: request.priority,
          alert_id: request.alert_id,
          event_id: request.event_id
        }
      });

      logger.info(`Notification sent: ${messageId}`, {
        agentId: this.agentId,
        channelType: request.channel_type,
        recipientsCount: request.recipients.length,
        sentCount,
        failedCount,
        status: overallStatus
      });

      return result;
    } catch (error) {
      logAuditEvent({
        actor: this.agentId,
        action: 'notification.send',
        resource: `message:${messageId}`,
        result: 'failure',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          channel_type: request.channel_type,
          recipients_count: request.recipients.length
        }
      });

      logger.error(`Notification sending failed: ${messageId}`, error);
      throw error;
    }
  }

  /**
   * Validate notification request
   */
  private async validateNotificationRequest(request: NotificationRequest): Promise<void> {
    if (!request.recipients || request.recipients.length === 0) {
      throw new Error('At least one recipient is required');
    }

    if (!request.message.content || request.message.content.trim().length === 0) {
      throw new Error('Message content is required');
    }

    // Validate recipients based on channel type
    for (const recipient of request.recipients) {
      if (!this.isValidRecipient(recipient, request.channel_type)) {
        throw new Error(`Invalid recipient format for ${request.channel_type}: ${recipient}`);
      }
    }
  }

  /**
   * Validate recipient format based on channel type
   */
  private isValidRecipient(recipient: string, channelType: string): boolean {
    switch (channelType) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient);
      case 'sms':
      case 'whatsapp':
        return /^\+?[1-9]\d{1,14}$/.test(recipient);
      case 'slack':
        return recipient.startsWith('#') || recipient.startsWith('@') || recipient.includes('@');
      default:
        return true;
    }
  }

  /**
   * Get notification context (alert/event details)
   */
  private async getNotificationContext(request: NotificationRequest): Promise<any> {
    const context: any = {};

    if (request.alert_id) {
      const alertResult = await query(`
        SELECT id, type, severity, title, description, location_address, status
        FROM alerts 
        WHERE id = $1
      `, [request.alert_id]);

      if (alertResult.rows.length > 0) {
        context.alert = alertResult.rows[0];
      }
    }

    if (request.event_id) {
      const eventResult = await query(`
        SELECT id, title, description, start_time, end_time, location, assignees, resources, status
        FROM events 
        WHERE id = $1
      `, [request.event_id]);

      if (eventResult.rows.length > 0) {
        context.event = eventResult.rows[0];
      }
    }

    return context;
  }

  /**
   * Enhance message with context information
   */
  private async enhanceMessage(message: { subject?: string; content: string }, context: any): Promise<{ subject?: string; content: string }> {
    // Try Genkit-powered message enhancement first
    try {
      const enhancementResult = await genkitMultiAgentFramework.executeTask('message_enhancement', {
        message: message.content,
        target_audience: context.channel_type || 'general',
        urgency_level: context.urgency_level || 'medium'
      });

      if (enhancementResult && enhancementResult.message_enhancement) {
        return {
          subject: message.subject,
          content: enhancementResult.message_enhancement.enhanced_message || message.content
        };
      }
    } catch (error) {
      logger.warn('Genkit message enhancement failed, using original message:', error);
    }

    // Fallback to template-based enhancement
    return this.templateBasedEnhancement(message, context);
  }

  /**
   * AI-powered message enhancement (deprecated - using Genkit framework)
   */
  private async aiPoweredMessageEnhancement(message: { subject?: string; content: string }, context: any): Promise<{ subject?: string; content: string }> {
    // This method is deprecated - using Genkit framework instead
    logger.warn('aiPoweredMessageEnhancement method is deprecated, falling back to template-based enhancement');
    return this.templateBasedEnhancement(message, context);
  }

  /**
   * Template-based message enhancement (fallback)
   */
  private templateBasedEnhancement(message: { subject?: string; content: string }, context: any): { subject?: string; content: string } {
    let enhancedContent = message.content;
    let enhancedSubject = message.subject;

    // Add alert context
    if (context.alert) {
      const alert = context.alert;
      enhancedContent += `\n\n📍 Alert Details:\n`;
      enhancedContent += `• Type: ${alert.type.toUpperCase()}\n`;
      enhancedContent += `• Severity: ${alert.severity.toUpperCase()}\n`;
      enhancedContent += `• Location: ${alert.location_address}\n`;
      enhancedContent += `• Status: ${alert.status}\n`;

      if (!enhancedSubject) {
        enhancedSubject = `🚨 ${alert.severity.toUpperCase()} ${alert.type.toUpperCase()} ALERT - ${alert.title}`;
      }
    }

    // Add event context
    if (context.event) {
      const event = context.event;
      enhancedContent += `\n\n📅 Event Details:\n`;
      enhancedContent += `• Event: ${event.title}\n`;
      enhancedContent += `• Start: ${new Date(event.start_time).toLocaleString()}\n`;
      enhancedContent += `• Location: ${event.location}\n`;
      enhancedContent += `• Status: ${event.status}\n`;

      if (event.assignees && event.assignees.length > 0) {
        enhancedContent += `• Assigned: ${event.assignees.join(', ')}\n`;
      }
    }

    // Add footer
    enhancedContent += `\n\n---\nCrisisAssist Emergency Response System\nTimestamp: ${new Date().toLocaleString()}`;

    const result: { subject?: string; content: string } = {
      content: enhancedContent
    };
    
    if (enhancedSubject) {
      result.subject = enhancedSubject;
    }
    
    return result;
  }

  /**
   * Send notifications by channel type
   */
  private async sendByChannel(channelType: string, recipients: string[], message: { subject?: string; content: string }, priority: string): Promise<Array<{ recipient: string; status: 'sent' | 'failed'; message_id?: string; error?: string }>> {

    switch (channelType) {
      case 'slack':
        return await this.sendSlackNotifications(recipients, message, priority);
      case 'sms':
        return await this.sendSMSNotifications(recipients, message, priority);
      case 'email':
        return await this.sendEmailNotifications(recipients, message, priority);
      case 'whatsapp':
        return await this.sendWhatsAppNotifications(recipients, message, priority);
      default:
        throw new Error(`Unsupported channel type: ${channelType}`);
    }
  }

  /**
   * Send Slack notifications
   */
  private async sendSlackNotifications(recipients: string[], message: { subject?: string; content: string }, priority: string): Promise<Array<{ recipient: string; status: 'sent' | 'failed'; message_id?: string; error?: string }>> {
    const results: Array<{ recipient: string; status: 'sent' | 'failed'; message_id?: string; error?: string }> = [];

    for (const recipient of recipients) {
      try {
        const slackMessage = await this.slackService.sendMessage({
          channel: recipient,
          text: message.content,
          blocks: this.createSlackBlocks(message, priority)
        });

        results.push({
          recipient,
          status: 'sent',
          message_id: slackMessage.ts
        });

        logExternalApiCall({
          service: 'slack',
          endpoint: '/api/chat.postMessage',
          method: 'POST',
          statusCode: 200,
          duration: 0,
          success: true
        });
      } catch (error) {
        results.push({
          recipient,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        logExternalApiCall({
          service: 'slack',
          endpoint: '/api/chat.postMessage',
          method: 'POST',
          statusCode: 500,
          duration: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Send SMS notifications
   */
  private async sendSMSNotifications(recipients: string[], message: { subject?: string; content: string }, priority: string): Promise<Array<{ recipient: string; status: 'sent' | 'failed'; message_id?: string; error?: string }>> {
    const results: Array<{ recipient: string; status: 'sent' | 'failed'; message_id?: string; error?: string }> = [];

    for (const recipient of recipients) {
      try {
        const smsResult = await twilioService.sendSMS({
          to: recipient,
          message: this.truncateForSMS(message.content),
          priority: priority as any
        });

        const resultItem: { recipient: string; status: 'sent' | 'failed'; message_id?: string; error?: string } = {
          recipient,
          status: smsResult.success ? 'sent' : 'failed'
        };
        
        if (smsResult.messageId) {
          resultItem.message_id = smsResult.messageId;
        }
        
        if (smsResult.error) {
          resultItem.error = smsResult.error;
        }
        
        results.push(resultItem);

        logExternalApiCall({
          service: 'twilio',
          endpoint: '/2010-04-01/Accounts/.../Messages.json',
          method: 'POST',
          statusCode: 201,
          duration: 0,
          success: true
        });
      } catch (error) {
        results.push({
          recipient,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        logExternalApiCall({
          service: 'twilio',
          endpoint: '/2010-04-01/Accounts/.../Messages.json',
          method: 'POST',
          statusCode: 500,
          duration: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Send email notifications (placeholder - would integrate with email service)
   */
  private async sendEmailNotifications(recipients: string[], _message: { subject?: string; content: string }, _priority: string): Promise<Array<{ recipient: string; status: 'sent' | 'failed'; message_id?: string; error?: string }>> {
    // In demo mode, simulate email sending
    if (process.env.DEMO_MODE === 'true') {
      return recipients.map(recipient => ({
        recipient,
        status: 'sent' as const,
        message_id: `demo_email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));
    }

    // TODO: Implement actual email service integration (SendGrid, AWS SES, etc.)
    throw new ExternalServiceError('Email service not implemented');
  }

  /**
   * Send WhatsApp notifications (placeholder)
   */
  private async sendWhatsAppNotifications(recipients: string[], _message: { subject?: string; content: string }, _priority: string): Promise<Array<{ recipient: string; status: 'sent' | 'failed'; message_id?: string; error?: string }>> {
    // In demo mode, simulate WhatsApp sending
    if (process.env.DEMO_MODE === 'true') {
      return recipients.map(recipient => ({
        recipient,
        status: 'sent' as const,
        message_id: `demo_whatsapp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));
    }

    // TODO: Implement WhatsApp Business API integration
    throw new ExternalServiceError('WhatsApp service not implemented');
  }

  /**
   * Create Slack message blocks for rich formatting
   */
  private createSlackBlocks(message: { subject?: string; content: string }, priority: string): any[] {
    const priorityEmojis = {
      urgent: '🚨',
      high: '⚠️',
      medium: '📢',
      low: 'ℹ️'
    };

    const blocks = [];

    // Header block
    if (message.subject) {
      blocks.push({
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${priorityEmojis[priority as keyof typeof priorityEmojis] || '📢'} ${message.subject}`
        }
      });
    }

    // Content block
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: message.content
      }
    });

    // Priority indicator
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Priority: *${priority.toUpperCase()}* | CrisisAssist Emergency Response`
        }
      ]
    });

    return blocks;
  }

  /**
   * Truncate message content for SMS (160 character limit)
   */
  private truncateForSMS(content: string): string {
    const maxLength = 1600; // Allow for longer SMS (multiple parts)
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength - 3) + '...';
  }

  /**
   * Store notification records in database
   */
  private async storeNotificationRecords(_messageId: string, request: NotificationRequest, deliveryResults: any[], _context: any): Promise<void> {
    for (const result of deliveryResults) {
      await query(`
        INSERT INTO messages (id, event_id, alert_id, channel_type, channel_id, recipient, subject, content, message_id, status, sent_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        uuidv4(),
        request.event_id || null,
        request.alert_id || null,
        request.channel_type,
        result.recipient,
        result.recipient,
        request.message.subject || null,
        request.message.content,
        result.message_id || null,
        result.status,
        result.status === 'sent' ? new Date() : null
      ]);
    }
  }

  /**
   * Extract external service results from delivery results
   */
  private getExternalServiceResults(deliveryResults: any[]): NotificationResult['external_service_results'] {
    const results: NotificationResult['external_service_results'] = {};

    // This is a simplified version - in reality, you'd track service-specific results
    const hasSuccess = deliveryResults.some(r => r.status === 'sent');
    const hasFailure = deliveryResults.some(r => r.status === 'failed');

    if (deliveryResults.length > 0) {
      const firstResult = deliveryResults[0];
      if (firstResult.recipient.startsWith('#') || firstResult.recipient.startsWith('@')) {
        const slackResult: { success: boolean; message_id?: string; error?: string } = {
          success: hasSuccess
        };
        if (hasSuccess && firstResult.message_id) {
          slackResult.message_id = firstResult.message_id;
        }
        if (hasFailure) {
          slackResult.error = 'Some messages failed to send';
        }
        results.slack = slackResult;
      } else if (firstResult.recipient.startsWith('+')) {
        const twilioResult: { success: boolean; message_id?: string; error?: string } = {
          success: hasSuccess
        };
        if (hasSuccess && firstResult.message_id) {
          twilioResult.message_id = firstResult.message_id;
        }
        if (hasFailure) {
          twilioResult.error = 'Some messages failed to send';
        }
        results.twilio = twilioResult;
      }
    }

    return results;
  }

  /**
   * Get agent information
   */
  getAgentInfo() {
    return {
      id: this.agentId,
      type: this.agentType,
      name: 'Notification Agent',
      description: 'Sends verified alerts and updates to communities and stakeholders via multiple channels',
      capabilities: [
        'multi_channel_messaging',
        'message_enhancement',
        'delivery_tracking',
        'priority_handling'
      ],
      supported_channels: [
        'slack',
        'sms',
        'email',
        'whatsapp'
      ],
      integrations: [
        'slack_api',
        'twilio',
        'sendgrid',
        'whatsapp_business'
      ],
      status: 'active'
    };
  }
}