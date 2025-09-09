import { WebClient } from '@slack/web-api';
import { logger } from './logger';
import axios from 'axios';

export interface SlackMessage {
  channel: string;
  text: string;
  blocks?: any[];
  attachments?: any[];
  thread_ts?: string;
}

export interface SlackMessageResponse {
  ok: boolean;
  channel: string;
  ts: string;
  message?: any;
  error?: string;
}

export class SlackService {
  private readonly baseUrl = 'https://slack.com/api';
  private accessToken: string | null = null;

  constructor() {
    // In a real implementation, this would get the access token from Descope Outbound
    // For demo purposes, we'll simulate the integration
    this.accessToken = process.env.SLACK_BOT_TOKEN || null;
  }

  /**
   * Send a message to a Slack channel
   */
  async sendMessage(message: SlackMessage): Promise<SlackMessageResponse> {
    try {
      // In demo mode, simulate successful message sending
      if (process.env.DEMO_MODE === 'true') {
        return this.simulateSlackMessage(message);
      }

      if (!this.accessToken) {
        throw new Error('Slack access token not available. Please connect your Slack workspace.');
      }

      const response = await axios.post(
        `${this.baseUrl}/chat.postMessage`,
        {
          channel: message.channel,
          text: message.text,
          blocks: message.blocks,
          attachments: message.attachments,
          thread_ts: message.thread_ts
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      logger.info('Slack message sent successfully', {
        channel: message.channel,
        ts: response.data.ts
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message;
        
        logger.error('Slack API error:', {
          message: errorMessage,
          channel: message.channel
        });

        throw new Error(`Slack API error: ${errorMessage}`);
      }
      
      logger.error('Unexpected error sending Slack message:', error);
      throw new Error('Failed to send Slack message');
    }
  }

  /**
   * Update a Slack message
   */
  async updateMessage(channel: string, ts: string, message: Partial<SlackMessage>): Promise<SlackMessageResponse> {
    try {
      if (process.env.DEMO_MODE === 'true') {
        return this.simulateSlackMessage({ channel, text: message.text || '', ...message });
      }

      if (!this.accessToken) {
        throw new Error('Slack access token not available');
      }

      const response = await axios.post(
        `${this.baseUrl}/chat.update`,
        {
          channel,
          ts,
          text: message.text,
          blocks: message.blocks,
          attachments: message.attachments
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      logger.info('Slack message updated successfully', {
        channel,
        ts: response.data.ts
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message;
        
        logger.error('Slack API error:', {
          message: errorMessage,
          channel,
          ts
        });

        throw new Error(`Slack API error: ${errorMessage}`);
      }
      
      logger.error('Unexpected error updating Slack message:', error);
      throw new Error('Failed to update Slack message');
    }
  }

  /**
   * Delete a Slack message
   */
  async deleteMessage(channel: string, ts: string): Promise<void> {
    try {
      if (process.env.DEMO_MODE === 'true') {
        logger.info('Demo mode: Slack message deletion simulated', { channel, ts });
        return;
      }

      if (!this.accessToken) {
        throw new Error('Slack access token not available');
      }

      const response = await axios.post(
        `${this.baseUrl}/chat.delete`,
        {
          channel,
          ts
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      logger.info('Slack message deleted successfully', { channel, ts });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message;
        
        logger.error('Slack API error:', {
          message: errorMessage,
          channel,
          ts
        });

        throw new Error(`Slack API error: ${errorMessage}`);
      }
      
      logger.error('Unexpected error deleting Slack message:', error);
      throw new Error('Failed to delete Slack message');
    }
  }

  /**
   * Get channel information
   */
  async getChannelInfo(channel: string): Promise<any> {
    try {
      if (process.env.DEMO_MODE === 'true') {
        return {
          ok: true,
          channel: {
            id: 'C1234567890',
            name: 'emergency-alerts',
            is_channel: true,
            is_group: false,
            is_im: false
          }
        };
      }

      if (!this.accessToken) {
        throw new Error('Slack access token not available');
      }

      const response = await axios.get(
        `${this.baseUrl}/conversations.info`,
        {
          params: { channel },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          },
          timeout: 10000
        }
      );

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message;
        
        logger.error('Slack API error:', {
          message: errorMessage,
          channel
        });

        throw new Error(`Slack API error: ${errorMessage}`);
      }
      
      logger.error('Unexpected error getting channel info:', error);
      throw new Error('Failed to get channel information');
    }
  }

  /**
   * Simulate Slack message for demo mode
   */
  private simulateSlackMessage(message: SlackMessage): SlackMessageResponse {
    const simulatedResponse: SlackMessageResponse = {
      ok: true,
      channel: message.channel,
      ts: `${Date.now()}.${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
      message: {
        text: message.text,
        user: 'U1234567890',
        ts: `${Date.now()}.${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
        type: 'message'
      }
    };

    logger.info('Demo mode: Slack message simulated', {
      channel: message.channel,
      ts: simulatedResponse.ts,
      text: message.text.substring(0, 100) + (message.text.length > 100 ? '...' : '')
    });

    return simulatedResponse;
  }

  /**
   * Set access token (would be called by Descope integration)
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!this.accessToken || process.env.DEMO_MODE === 'true';
  }

  /**
   * Validate channel format
   */
  isValidChannel(channel: string): boolean {
    // Channel ID (C1234567890), channel name (#general), or DM (@user)
    return /^[#@C][A-Za-z0-9_-]+$/.test(channel) || /^[A-Z0-9]{9,11}$/.test(channel);
  }
}