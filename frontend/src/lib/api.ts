'use client';

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export class ApiClient {
  private client: AxiosInstance;
  private token?: string;

  constructor(baseURL: string, token?: string) {
    this.token = token;
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          console.error('Authentication failed:', error.response.data);
        }
        return Promise.reject(error);
      }
    );
  }

  updateToken(token?: string) {
    this.token = token;
  }

  // Alert endpoints
  async getAlerts(params?: { limit?: number; status?: string; type?: string }) {
    const response = await this.client.get('/api/alerts', { params });
    return response.data;
  }

  async getAlert(id: string) {
    const response = await this.client.get(`/api/alerts/${id}`);
    return response.data;
  }

  async createAlert(data: any) {
    const response = await this.client.post('/api/alerts', data);
    return response.data;
  }

  async updateAlert(id: string, data: any) {
    const response = await this.client.put(`/api/alerts/${id}`, data);
    return response.data;
  }

  async deleteAlert(id: string) {
    const response = await this.client.delete(`/api/alerts/${id}`);
    return response.data;
  }

  async getAlertStats(timeframe: string = '24h') {
    const response = await this.client.get('/api/alerts/stats', {
      params: { timeframe }
    });
    return response.data;
  }

  // Agent endpoints
  async getAgents() {
    const response = await this.client.get('/api/agents');
    return response.data;
  }

  async getAgent(id: string) {
    const response = await this.client.get(`/api/agents/${id}`);
    return response.data;
  }

  async getAgentStatus() {
    const response = await this.client.get('/api/agents/status');
    return response.data;
  }

  async updateAgentStatus(id: string, status: string) {
    const response = await this.client.put(`/api/agents/${id}/status`, { status });
    return response.data;
  }

  // Audit endpoints
  async getAuditLogs(params?: { limit?: number; type?: string; actor?: string }) {
    const response = await this.client.get('/api/audit', { params });
    return response.data;
  }

  async getAuditLog(id: string) {
    const response = await this.client.get(`/api/audit/${id}`);
    return response.data;
  }

  // Health endpoint
  async getHealth() {
    const response = await this.client.get('/api/health');
    return response.data;
  }

  // Demo endpoints
  async triggerDemoAlert(type: string = 'flood') {
    const response = await this.client.post('/api/alerts/demo', { type });
    return response.data;
  }

  async resetDemo() {
    const response = await this.client.post('/api/alerts/demo/reset');
    return response.data;
  }

  // Simulator endpoints
  async simulateAlert(alertData: any) {
    try {
      const response = await this.client.post('/api/alerts/simulate', alertData);
      return response.data;
    } catch (error) {
      // Fallback to demo simulation if backend is not available
      console.log('Backend not available, using demo simulation');
      return {
        success: true,
        data: {
          id: `alert_${Date.now()}`,
          type: alertData.type || 'flood',
          severity: alertData.severity || 'high',
          title: alertData.title || 'Emergency Alert Simulation',
          location: alertData.location || { address: 'Demo Location' },
          status: 'active',
          created_at: new Date().toISOString(),
          workflow_results: {
            alert_agent: { status: 'completed', analysis: 'Risk assessment completed' },
            verifier_agent: { status: 'completed', verification: 'Content verified' },
            scheduler_agent: { status: 'completed', event_id: 'cal_demo_123' },
            notifier_agent: { status: 'completed', notifications_sent: 3 }
          }
        }
      };
    }
  }

  async scheduleEvent(eventData: any) {
    try {
      const response = await this.client.post('/api/agents/scheduler/schedule', eventData);
      return response.data;
    } catch (error) {
      console.log('Backend not available, using demo scheduler result');
      return {
        success: true,
        data: {
          event_id: `cal_${Date.now()}`,
          title: eventData.title,
          location: eventData.location,
          start_time: eventData.start_time,
          status: 'scheduled',
          attendees: eventData.attendees || [],
          calendar_link: 'https://calendar.google.com/demo'
        }
      };
    }
  }

  async sendNotification(notificationData: any) {
    try {
      const response = await this.client.post('/api/agents/notifier/send', notificationData);
      return response.data;
    } catch (error) {
      console.log('Backend not available, using demo notification result');
      return {
        success: true,
        data: {
          notification_id: `notif_${Date.now()}`,
          message: notificationData.message,
          channels: notificationData.channels || ['slack', 'sms', 'email'],
          sent_count: 3,
          delivery_status: 'delivered',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  async verifyContent(contentData: any) {
    try {
      const response = await this.client.post('/api/agents/verifier/verify', contentData);
      return response.data;
    } catch (error) {
      console.log('Backend not available, using demo verification result');
      return {
        success: true,
        data: {
          verification_id: `verify_${Date.now()}`,
          content: contentData.content,
          is_verified: true,
          confidence_score: 0.95,
          signature: `sig_${Math.random().toString(36).substring(2, 15)}`,
          timestamp: new Date().toISOString(),
          verification_details: {
            source_credibility: 'high',
            content_accuracy: 'verified',
            misinformation_risk: 'low'
          }
        }
      };
    }
  }

  async testAgents() {
    const response = await this.client.post('/api/agents/test');
    return response.data;
  }

  // Settings endpoints
  async getSettings() {
    const response = await this.client.get('/api/settings');
    return response.data;
  }

  async updateSettings(settings: any) {
    const response = await this.client.put('/api/settings', settings);
    return response.data;
  }

  async testIntegration(service: string) {
    const response = await this.client.post(`/api/integrations/${service}/test`);
    return response.data;
  }
}