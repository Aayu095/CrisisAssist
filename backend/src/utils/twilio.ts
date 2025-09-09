import twilio from 'twilio';
import { logger } from './logger';

interface SMSMessage {
  to: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  to: string;
}

class TwilioService {
  private client: twilio.Twilio | null = null;
  private fromNumber: string;
  private isConfigured: boolean = false;

  constructor() {
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
    this.initializeClient();
  }

  private initializeClient() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken && this.fromNumber) {
      try {
        this.client = twilio(accountSid, authToken);
        this.isConfigured = true;
        logger.info('Twilio service initialized successfully');
      } catch (error) {
        logger.error('Twilio SMS sending failed:', error);
        throw new Error(`SMS sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      logger.warn('Twilio credentials not configured, SMS will be mocked');
      this.isConfigured = false;
    }
  }

  async sendSMS(message: SMSMessage): Promise<SMSResult> {
    if (!this.isConfigured || !this.client) {
      // Mock SMS sending for demo mode
      logger.info(`[DEMO] SMS would be sent to ${message.to}: ${message.message}`);
      return {
        success: true,
        messageId: `mock_${Date.now()}`,
        to: message.to
      };
    }

    try {
      const result = await this.client.messages.create({
        body: message.message,
        from: this.fromNumber,
        to: message.to
      });

      logger.info(`SMS sent successfully to ${message.to}, SID: ${result.sid}`);
      
      return {
        success: true,
        messageId: result.sid,
        to: message.to
      };
    } catch (error) {
      logger.error(`Failed to send SMS to ${message.to}:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        to: message.to
      };
    }
  }

  async sendBulkSMS(messages: SMSMessage[]): Promise<SMSResult[]> {
    const results: SMSResult[] = [];
    
    for (const message of messages) {
      const result = await this.sendSMS(message);
      results.push(result);
      
      // Add small delay between messages to avoid rate limiting
      if (this.isConfigured) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  async sendEmergencyAlert(phoneNumbers: string[], alertMessage: string): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    results: SMSResult[];
  }> {
    const messages: SMSMessage[] = phoneNumbers.map(phone => ({
      to: phone,
      message: `🚨 EMERGENCY ALERT: ${alertMessage}`,
      priority: 'urgent'
    }));

    const results = await this.sendBulkSMS(messages);
    
    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    logger.info(`Emergency SMS alert sent: ${sent} successful, ${failed} failed`);

    return {
      success: sent > 0,
      sent,
      failed,
      results
    };
  }

  isServiceConfigured(): boolean {
    return this.isConfigured;
  }

  getServiceStatus(): {
    configured: boolean;
    fromNumber: string;
    hasCredentials: boolean;
  } {
    return {
      configured: this.isConfigured,
      fromNumber: this.fromNumber,
      hasCredentials: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
    };
  }
}

// Export singleton instance
export const twilioService = new TwilioService();

// Export types
export type { SMSMessage, SMSResult };