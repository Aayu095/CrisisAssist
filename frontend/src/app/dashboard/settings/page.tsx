'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, 
  Shield, 
  Key, 
  Globe, 
  Bell,
  Calendar,
  MessageSquare,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Copy,
  Trash2
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useApi } from '@/components/providers/ApiProvider';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

interface IntegrationConfig {
  id: string;
  name: string;
  type: string;
  icon: any;
  color: string;
  status: 'connected' | 'disconnected' | 'error';
  description: string;
  settings: Record<string, any>;
  lastSync?: string;
  endpoints?: string[];
}

export default function SettingsPage() {
  const api = useApi();
  const [activeTab, setActiveTab] = useState('descope');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // Descope Configuration
  const [descopeConfig, setDescopeConfig] = useState({
    projectId: 'P32MRE2ZmteTfJbXE3AK1wNIx2uC',
    managementKey: '',
    baseUrl: 'https://api.descope.com',
    inboundApps: [
      {
        id: 'alert-agent',
        name: 'Alert Agent',
        scopes: ['alert.read', 'alert.process'],
        status: 'active'
      },
      {
        id: 'scheduler-agent',
        name: 'Scheduler Agent',
        scopes: ['calendar.write', 'calendar.read'],
        status: 'active'
      },
      {
        id: 'notifier-agent',
        name: 'Notifier Agent',
        scopes: ['message.send', 'notification.dispatch'],
        status: 'active'
      },
      {
        id: 'verifier-agent',
        name: 'Verifier Agent',
        scopes: ['verify.document', 'verify.message'],
        status: 'active'
      }
    ]
  });

  // External Integrations
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      type: 'calendar',
      icon: Calendar,
      color: 'blue',
      status: 'connected',
      description: 'Schedule relief coordination events and resource allocation',
      settings: {
        clientId: 'your-google-client-id',
        clientSecret: '••••••••••••••••',
        redirectUri: 'https://your-app.com/auth/google/callback',
        scopes: ['https://www.googleapis.com/auth/calendar']
      },
      lastSync: new Date().toISOString(),
      endpoints: ['https://www.googleapis.com/calendar/v3']
    },
    {
      id: 'slack',
      name: 'Slack',
      type: 'messaging',
      icon: MessageSquare,
      color: 'green',
      status: 'connected',
      description: 'Send emergency notifications to community channels',
      settings: {
        clientId: 'your-slack-client-id',
        clientSecret: '••••••••••••••••',
        botToken: '••••••••••••••••',
        signingSecret: '••••••••••••••••',
        channels: ['#emergency-alerts', '#general']
      },
      lastSync: new Date().toISOString(),
      endpoints: ['https://slack.com/api']
    },
    {
      id: 'twilio',
      name: 'Twilio SMS',
      type: 'sms',
      icon: Bell,
      color: 'red',
      status: 'connected',
      description: 'Send SMS alerts to emergency contacts and communities',
      settings: {
        accountSid: 'your-twilio-account-sid',
        authToken: '••••••••••••••••',
        phoneNumber: '+1234567890',
        webhookUrl: 'https://your-app.com/webhooks/twilio'
      },
      lastSync: new Date().toISOString(),
      endpoints: ['https://api.twilio.com']
    }
  ]);

  // System Settings
  const [systemSettings, setSystemSettings] = useState({
    rateLimiting: {
      enabled: true,
      requestsPerMinute: 100,
      burstLimit: 200
    },
    security: {
      tokenExpiration: 3600,
      requireHttps: true,
      enableAuditLogging: true,
      maxFailedAttempts: 5
    },
    notifications: {
      emailAlerts: true,
      slackAlerts: true,
      smsAlerts: false,
      webhookUrl: ''
    }
  });

  const tabs = [
    { id: 'descope', name: 'Descope Auth', icon: Shield },
    { id: 'integrations', name: 'Integrations', icon: Globe },
    { id: 'system', name: 'System', icon: Settings }
  ];

  const saveDescopeConfig = async () => {
    try {
      setIsSaving(true);
      // In a real app, this would save to the backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Descope configuration saved successfully');
    } catch (error) {
      toast.error('Failed to save Descope configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const testIntegration = async (integrationId: string) => {
    try {
      const integration = integrations.find(i => i.id === integrationId);
      toast.loading(`Testing ${integration?.name} connection...`);
      
      // Simulate API test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.dismiss();
      toast.success(`${integration?.name} connection test successful`);
      
      // Update integration status
      setIntegrations(prev => prev.map(i => 
        i.id === integrationId 
          ? { ...i, status: 'connected', lastSync: new Date().toISOString() }
          : i
      ));
    } catch (error) {
      toast.dismiss();
      toast.error(`${integrations.find(i => i.id === integrationId)?.name} connection test failed`);
    }
  };

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const classes = {
      connected: 'bg-green-100 text-green-800',
      disconnected: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={clsx(
        'px-2 py-1 text-xs font-medium rounded-full',
        classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800'
      )}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">
              Configure authentication, integrations, and system settings
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm',
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Descope Configuration */}
            {activeTab === 'descope' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Descope Authentication Configuration
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Configure your Descope project settings for secure agent-to-agent authentication.
                  </p>
                </div>

                {/* Basic Configuration */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">
                    Project Configuration
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Project ID
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={descopeConfig.projectId}
                          onChange={(e) => setDescopeConfig(prev => ({ ...prev, projectId: e.target.value }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your Descope Project ID"
                        />
                        <button
                          onClick={() => copyToClipboard(descopeConfig.projectId)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Management Key
                      </label>
                      <div className="relative">
                        <input
                          type={showSecrets['managementKey'] ? 'text' : 'password'}
                          value={descopeConfig.managementKey}
                          onChange={(e) => setDescopeConfig(prev => ({ ...prev, managementKey: e.target.value }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your Management Key"
                        />
                        <button
                          onClick={() => toggleSecretVisibility('managementKey')}
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                        >
                          {showSecrets['managementKey'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Base URL
                      </label>
                      <input
                        type="url"
                        value={descopeConfig.baseUrl}
                        onChange={(e) => setDescopeConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://api.descope.com"
                      />
                    </div>

                    <div className="flex items-center justify-center">
                      <button
                        onClick={saveDescopeConfig}
                        disabled={isSaving}
                        className="btn-primary flex items-center space-x-2"
                      >
                        {isSaving ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inbound Apps */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">
                    Inbound Apps (Agent Authentication)
                  </h4>
                  
                  <div className="space-y-4">
                    {descopeConfig.inboundApps.map((app) => (
                      <div key={app.id} className="bg-white p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h5 className="text-sm font-semibold text-gray-900">{app.name}</h5>
                            <p className="text-xs text-gray-500">ID: {app.id}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(app.status)}
                            <button className="text-blue-600 hover:text-blue-800 text-sm">
                              Configure
                            </button>
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-xs text-gray-600">Scopes:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {app.scopes.map((scope) => (
                              <span key={scope} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {scope}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Setup Guide */}
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
                  <h4 className="text-md font-semibold text-blue-900 mb-3">
                    Quick Setup Guide
                  </h4>
                  <div className="space-y-2 text-sm text-blue-800">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <span>1. Create a Descope project at descope.com</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <span>2. Configure Inbound Apps for each agent type</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <span>3. Set up Outbound Apps for external integrations</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <span>4. Copy your Project ID and Management Key here</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <a
                      href="https://docs.descope.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      <span>View Documentation</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* External Integrations */}
            {activeTab === 'integrations' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    External Service Integrations
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Configure external services that your agents will interact with. All authentication is managed through Descope Outbound Apps.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {integrations.map((integration) => (
                    <div key={integration.id} className="bg-gray-50 p-6 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className={clsx(
                            'w-12 h-12 rounded-lg flex items-center justify-center',
                            integration.color === 'blue' && 'bg-blue-100',
                            integration.color === 'green' && 'bg-green-100',
                            integration.color === 'red' && 'bg-red-100'
                          )}>
                            <integration.icon className={clsx(
                              'h-6 w-6',
                              integration.color === 'blue' && 'text-blue-600',
                              integration.color === 'green' && 'text-green-600',
                              integration.color === 'red' && 'text-red-600'
                            )} />
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">
                              {integration.name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {integration.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(integration.status)}
                          {getStatusBadge(integration.status)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {Object.entries(integration.settings).map(([key, value]) => (
                          <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </label>
                            <div className="relative">
                              <input
                                type={key.toLowerCase().includes('secret') || key.toLowerCase().includes('token') ? 
                                  (showSecrets[`${integration.id}-${key}`] ? 'text' : 'password') : 'text'}
                                value={value}
                                onChange={(e) => {
                                  setIntegrations(prev => prev.map(i => 
                                    i.id === integration.id 
                                      ? { ...i, settings: { ...i.settings, [key]: e.target.value } }
                                      : i
                                  ));
                                }}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                placeholder={`Enter ${key}`}
                              />
                              {(key.toLowerCase().includes('secret') || key.toLowerCase().includes('token')) && (
                                <button
                                  onClick={() => toggleSecretVisibility(`${integration.id}-${key}`)}
                                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                                >
                                  {showSecrets[`${integration.id}-${key}`] ? 
                                    <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-sm text-gray-500">
                          {integration.lastSync && (
                            <span>Last sync: {new Date(integration.lastSync).toLocaleString()}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => testIntegration(integration.id)}
                            className="btn-secondary text-sm"
                          >
                            Test Connection
                          </button>
                          <button className="btn-primary text-sm">
                            Save Settings
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Settings */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    System Configuration
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Configure system-wide settings for security, rate limiting, and notifications.
                  </p>
                </div>

                {/* Security Settings */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">
                    Security Settings
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Token Expiration (seconds)
                      </label>
                      <input
                        type="number"
                        value={systemSettings.security.tokenExpiration}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          security: { ...prev.security, tokenExpiration: parseInt(e.target.value) }
                        }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Failed Attempts
                      </label>
                      <input
                        type="number"
                        value={systemSettings.security.maxFailedAttempts}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          security: { ...prev.security, maxFailedAttempts: parseInt(e.target.value) }
                        }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="requireHttps"
                        checked={systemSettings.security.requireHttps}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          security: { ...prev.security, requireHttps: e.target.checked }
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="requireHttps" className="text-sm font-medium text-gray-700">
                        Require HTTPS
                      </label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="enableAuditLogging"
                        checked={systemSettings.security.enableAuditLogging}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          security: { ...prev.security, enableAuditLogging: e.target.checked }
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="enableAuditLogging" className="text-sm font-medium text-gray-700">
                        Enable Audit Logging
                      </label>
                    </div>
                  </div>
                </div>

                {/* Rate Limiting */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">
                    Rate Limiting
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="enableRateLimit"
                        checked={systemSettings.rateLimiting.enabled}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          rateLimiting: { ...prev.rateLimiting, enabled: e.target.checked }
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="enableRateLimit" className="text-sm font-medium text-gray-700">
                        Enable Rate Limiting
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Requests per Minute
                      </label>
                      <input
                        type="number"
                        value={systemSettings.rateLimiting.requestsPerMinute}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          rateLimiting: { ...prev.rateLimiting, requestsPerMinute: parseInt(e.target.value) }
                        }))}
                        disabled={!systemSettings.rateLimiting.enabled}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Burst Limit
                      </label>
                      <input
                        type="number"
                        value={systemSettings.rateLimiting.burstLimit}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          rateLimiting: { ...prev.rateLimiting, burstLimit: parseInt(e.target.value) }
                        }))}
                        disabled={!systemSettings.rateLimiting.enabled}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Notifications */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">
                    System Notifications
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="emailAlerts"
                          checked={systemSettings.notifications.emailAlerts}
                          onChange={(e) => setSystemSettings(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, emailAlerts: e.target.checked }
                          }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="emailAlerts" className="text-sm font-medium text-gray-700">
                          Email Alerts
                        </label>
                      </div>

                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="slackAlerts"
                          checked={systemSettings.notifications.slackAlerts}
                          onChange={(e) => setSystemSettings(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, slackAlerts: e.target.checked }
                          }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="slackAlerts" className="text-sm font-medium text-gray-700">
                          Slack Alerts
                        </label>
                      </div>

                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="smsAlerts"
                          checked={systemSettings.notifications.smsAlerts}
                          onChange={(e) => setSystemSettings(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, smsAlerts: e.target.checked }
                          }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="smsAlerts" className="text-sm font-medium text-gray-700">
                          SMS Alerts
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Webhook URL
                      </label>
                      <input
                        type="url"
                        value={systemSettings.notifications.webhookUrl}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, webhookUrl: e.target.value }
                        }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://your-webhook-url.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setIsSaving(true);
                      setTimeout(() => {
                        setIsSaving(false);
                        toast.success('System settings saved successfully');
                      }, 1000);
                    }}
                    disabled={isSaving}
                    className="btn-primary flex items-center space-x-2"
                  >
                    {isSaving ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>{isSaving ? 'Saving...' : 'Save All Settings'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}