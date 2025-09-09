'use client';

import { useState, useEffect } from 'react';
import { 
  Shield, 
  Activity, 
  Clock, 
  User, 
  Key,
  AlertTriangle,
  CheckCircle,
  Filter,
  Download,
  Search,
  Calendar,
  Lock,
  Unlock,
  Eye,
  FileText,
  Globe
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useApi } from '@/components/providers/ApiProvider';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

interface AuditLog {
  id: string;
  timestamp: string;
  event_type: string;
  agent_type: string;
  user_id?: string;
  action: string;
  resource: string;
  status: 'success' | 'failure' | 'warning';
  ip_address: string;
  user_agent: string;
  token_claims: {
    sub: string;
    scopes: string[];
    iss: string;
    exp: number;
  };
  request_details: {
    method: string;
    endpoint: string;
    payload_size: number;
    response_time: number;
  };
  security_context: {
    token_signature: string;
    scope_validation: boolean;
    rate_limit_status: string;
  };
  metadata: Record<string, any>;
}

export default function AuditPage() {
  const api = useApi();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  
  // Filters
  const [filters, setFilters] = useState({
    event_type: 'all',
    agent_type: 'all',
    status: 'all',
    timeRange: '24h',
    search: ''
  });

  // Mock audit logs data
  const mockLogs: AuditLog[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      event_type: 'agent_action',
      agent_type: 'alert_agent',
      action: 'process_alert',
      resource: '/api/agents/alert/process',
      status: 'success',
      ip_address: '192.168.1.100',
      user_agent: 'CrisisAssist-Agent/1.0',
      token_claims: {
        sub: 'agent_alert_001',
        scopes: ['alert.read', 'alert.process'],
        iss: 'https://api.descope.com',
        exp: Date.now() + 3600000
      },
      request_details: {
        method: 'POST',
        endpoint: '/api/agents/alert/process',
        payload_size: 1024,
        response_time: 245
      },
      security_context: {
        token_signature: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
        scope_validation: true,
        rate_limit_status: 'within_limits'
      },
      metadata: {
        alert_type: 'flood',
        severity: 'high',
        location: 'Indore, MP'
      }
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      event_type: 'agent_action',
      agent_type: 'scheduler_agent',
      action: 'create_event',
      resource: '/api/agents/scheduler/schedule',
      status: 'success',
      ip_address: '192.168.1.101',
      user_agent: 'CrisisAssist-Agent/1.0',
      token_claims: {
        sub: 'agent_scheduler_001',
        scopes: ['calendar.write', 'calendar.read'],
        iss: 'https://api.descope.com',
        exp: Date.now() + 3600000
      },
      request_details: {
        method: 'POST',
        endpoint: '/api/agents/scheduler/schedule',
        payload_size: 2048,
        response_time: 1200
      },
      security_context: {
        token_signature: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
        scope_validation: true,
        rate_limit_status: 'within_limits'
      },
      metadata: {
        event_title: 'Emergency Relief Camp',
        calendar_id: 'primary',
        attendees_count: 5
      }
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      event_type: 'security_event',
      agent_type: 'verifier_agent',
      action: 'verify_content',
      resource: '/api/agents/verifier/verify',
      status: 'success',
      ip_address: '192.168.1.102',
      user_agent: 'CrisisAssist-Agent/1.0',
      token_claims: {
        sub: 'agent_verifier_001',
        scopes: ['verify.document', 'verify.message'],
        iss: 'https://api.descope.com',
        exp: Date.now() + 3600000
      },
      request_details: {
        method: 'POST',
        endpoint: '/api/agents/verifier/verify',
        payload_size: 512,
        response_time: 320
      },
      security_context: {
        token_signature: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
        scope_validation: true,
        rate_limit_status: 'within_limits'
      },
      metadata: {
        content_type: 'alert_message',
        signature_algorithm: 'RS256',
        verification_status: 'valid'
      }
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      event_type: 'agent_action',
      agent_type: 'notifier_agent',
      action: 'send_notification',
      resource: '/api/agents/notifier/send',
      status: 'success',
      ip_address: '192.168.1.103',
      user_agent: 'CrisisAssist-Agent/1.0',
      token_claims: {
        sub: 'agent_notifier_001',
        scopes: ['message.send', 'notification.dispatch'],
        iss: 'https://api.descope.com',
        exp: Date.now() + 3600000
      },
      request_details: {
        method: 'POST',
        endpoint: '/api/agents/notifier/send',
        payload_size: 1536,
        response_time: 850
      },
      security_context: {
        token_signature: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
        scope_validation: true,
        rate_limit_status: 'within_limits'
      },
      metadata: {
        channels: ['slack', 'sms'],
        recipients_count: 150,
        message_priority: 'high'
      }
    },
    {
      id: '5',
      timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      event_type: 'security_event',
      agent_type: 'alert_agent',
      action: 'token_validation_failed',
      resource: '/api/agents/alert/process',
      status: 'failure',
      ip_address: '192.168.1.200',
      user_agent: 'Unknown-Client/1.0',
      token_claims: {
        sub: 'unknown',
        scopes: [],
        iss: 'unknown',
        exp: 0
      },
      request_details: {
        method: 'POST',
        endpoint: '/api/agents/alert/process',
        payload_size: 0,
        response_time: 50
      },
      security_context: {
        token_signature: 'invalid',
        scope_validation: false,
        rate_limit_status: 'blocked'
      },
      metadata: {
        error: 'Invalid token signature',
        blocked_reason: 'Security violation'
      }
    }
  ];

  useEffect(() => {
    loadAuditLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, filters]);

  const loadAuditLogs = async () => {
    try {
      setIsLoading(true);
      // In a real app, this would fetch from the API
      // const response = await api.getAuditLogs();
      
      // For demo, use mock data
      setLogs(mockLogs);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      toast.error('Failed to load audit logs');
      setLogs(mockLogs);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Event type filter
    if (filters.event_type !== 'all') {
      filtered = filtered.filter(log => log.event_type === filters.event_type);
    }

    // Agent type filter
    if (filters.agent_type !== 'all') {
      filtered = filtered.filter(log => log.agent_type === filters.agent_type);
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(log => log.status === filters.status);
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(searchLower) ||
        log.resource.toLowerCase().includes(searchLower) ||
        log.agent_type.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.metadata).toLowerCase().includes(searchLower)
      );
    }

    // Time range filter
    const now = Date.now();
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    if (filters.timeRange !== 'all') {
      const range = timeRanges[filters.timeRange as keyof typeof timeRanges];
      filtered = filtered.filter(log => 
        now - new Date(log.timestamp).getTime() <= range
      );
    }

    setFilteredLogs(filtered);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failure':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const classes = {
      success: 'bg-green-100 text-green-800',
      failure: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800'
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

  const getAgentIcon = (agentType: string) => {
    const icons = {
      alert_agent: Activity,
      scheduler_agent: Calendar,
      notifier_agent: Globe,
      verifier_agent: Shield
    };
    
    const Icon = icons[agentType as keyof typeof icons] || Activity;
    return <Icon className="h-4 w-4" />;
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('Audit logs exported successfully');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-gray-600">
              Complete security and activity trail for all agent interactions
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={exportLogs}
              className="btn-secondary flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
            <button
              onClick={loadAuditLogs}
              className="btn-primary flex items-center space-x-2"
            >
              <Activity className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center space-x-4 mb-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Type
              </label>
              <select
                value={filters.event_type}
                onChange={(e) => setFilters(prev => ({ ...prev, event_type: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Events</option>
                <option value="agent_action">Agent Actions</option>
                <option value="security_event">Security Events</option>
                <option value="user_action">User Actions</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent Type
              </label>
              <select
                value={filters.agent_type}
                onChange={(e) => setFilters(prev => ({ ...prev, agent_type: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Agents</option>
                <option value="alert_agent">Alert Agent</option>
                <option value="scheduler_agent">Scheduler Agent</option>
                <option value="notifier_agent">Notifier Agent</option>
                <option value="verifier_agent">Verifier Agent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
                <option value="warning">Warning</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Range
              </label>
              <select
                value={filters.timeRange}
                onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Search logs..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Events</p>
                <p className="text-2xl font-bold text-gray-900">{filteredLogs.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {Math.round((filteredLogs.filter(l => l.status === 'success').length / filteredLogs.length) * 100)}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Security Events</p>
                <p className="text-2xl font-bold text-orange-600">
                  {filteredLogs.filter(l => l.event_type === 'security_event').length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-orange-500" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failed Requests</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredLogs.filter(l => l.status === 'failure').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Response Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getAgentIcon(log.agent_type)}
                        <span className="text-sm text-gray-900">
                          {log.agent_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {log.action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div className="text-xs text-gray-500">
                          {log.request_details.method} {log.resource}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(log.status)}
                        {getStatusBadge(log.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.request_details.response_time}ms
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Log Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    Audit Log Details
                  </h2>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Event Information
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Timestamp:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(selectedLog.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Event Type:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedLog.event_type}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Agent:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedLog.agent_type}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Action:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedLog.action}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        {getStatusBadge(selectedLog.status)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Request Details
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Method:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedLog.request_details.method}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Endpoint:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedLog.request_details.endpoint}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Response Time:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedLog.request_details.response_time}ms
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Payload Size:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedLog.request_details.payload_size} bytes
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">IP Address:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedLog.ip_address}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Token Claims */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Token Claims
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">Subject (sub):</span>
                        <div className="text-sm font-medium text-gray-900 mt-1">
                          {selectedLog.token_claims.sub}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Issuer (iss):</span>
                        <div className="text-sm font-medium text-gray-900 mt-1">
                          {selectedLog.token_claims.iss}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Scopes:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedLog.token_claims.scopes.map((scope) => (
                            <span key={scope} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {scope}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Expires:</span>
                        <div className="text-sm font-medium text-gray-900 mt-1">
                          {new Date(selectedLog.token_claims.exp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Context */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Security Context
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Scope Validation:</span>
                        <div className="flex items-center space-x-2">
                          {selectedLog.security_context.scope_validation ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            {selectedLog.security_context.scope_validation ? 'Valid' : 'Invalid'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Rate Limit Status:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedLog.security_context.rate_limit_status}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Token Signature:</span>
                        <div className="text-xs font-mono bg-white p-2 rounded border mt-1 break-all">
                          {selectedLog.security_context.token_signature}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Metadata
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}