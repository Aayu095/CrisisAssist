'use client';

import { useState, useEffect } from 'react';
import { 
  Activity, 
  Calendar, 
  MessageSquare, 
  Shield,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Settings,
  RefreshCw,
  Play,
  Pause,
  BarChart3,
  Key,
  Users,
  Globe
} from 'lucide-react';
import { useApi } from '@/components/providers/ApiProvider';
import { AgentChat } from '@/components/agents/AgentChat';
import { WorkflowStatus } from '@/components/agents/WorkflowStatus';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

interface Agent {
  id: string;
  name: string;
  type: string;
  icon: any;
  color: string;
  status: 'active' | 'inactive' | 'error';
  description: string;
  scopes: string[];
  lastActivity: string;
  metrics: {
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
    todayActivity: number;
  };
  endpoints: string[];
  dependencies: string[];
}

export default function AgentsPage() {
  const api = useApi();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null);
  const [workflowActive, setWorkflowActive] = useState(false);

  const agentConfigs: Agent[] = [
    {
      id: 'alert_agent',
      name: 'Alert Agent',
      type: 'alert_agent',
      icon: Activity,
      color: 'red',
      status: 'active',
      description: 'Processes incoming disaster alerts, analyzes risk levels, and determines response requirements.',
      scopes: ['alert.read', 'alert.process', 'risk.analyze'],
      lastActivity: new Date().toISOString(),
      metrics: {
        totalRequests: 156,
        successRate: 98.7,
        avgResponseTime: 245,
        todayActivity: 12
      },
      endpoints: [
        'POST /api/agents/alert/process',
        'GET /api/agents/alert/status',
        'POST /api/agents/alert/analyze'
      ],
      dependencies: ['Weather API', 'Government Alert System', 'Risk Assessment DB']
    },
    {
      id: 'scheduler_agent',
      name: 'Scheduler Agent',
      type: 'scheduler_agent',
      icon: Calendar,
      color: 'blue',
      status: 'active',
      description: 'Creates calendar events for relief coordination, manages resource allocation and volunteer assignments.',
      scopes: ['calendar.write', 'calendar.read', 'resource.allocate'],
      lastActivity: new Date().toISOString(),
      metrics: {
        totalRequests: 89,
        successRate: 96.6,
        avgResponseTime: 1200,
        todayActivity: 8
      },
      endpoints: [
        'POST /api/agents/scheduler/schedule',
        'GET /api/agents/scheduler/events',
        'PUT /api/agents/scheduler/update'
      ],
      dependencies: ['Google Calendar API', 'Resource Management System', 'Volunteer Database']
    },
    {
      id: 'notifier_agent',
      name: 'Notifier Agent',
      type: 'notifier_agent',
      icon: MessageSquare,
      color: 'green',
      status: 'active',
      description: 'Sends verified alerts to communities via multiple channels including Slack, SMS, and email.',
      scopes: ['message.send', 'notification.dispatch', 'channel.manage'],
      lastActivity: new Date().toISOString(),
      metrics: {
        totalRequests: 234,
        successRate: 99.1,
        avgResponseTime: 850,
        todayActivity: 18
      },
      endpoints: [
        'POST /api/agents/notifier/send',
        'GET /api/agents/notifier/channels',
        'POST /api/agents/notifier/broadcast'
      ],
      dependencies: ['Slack API', 'Twilio SMS', 'Email Service', 'WhatsApp Business API']
    },
    {
      id: 'verifier_agent',
      name: 'Verifier Agent',
      type: 'verifier_agent',
      icon: Shield,
      color: 'purple',
      status: 'active',
      description: 'Validates content authenticity, prevents misinformation, and generates cryptographic signatures.',
      scopes: ['verify.document', 'verify.message', 'crypto.sign'],
      lastActivity: new Date().toISOString(),
      metrics: {
        totalRequests: 178,
        successRate: 100,
        avgResponseTime: 320,
        todayActivity: 15
      },
      endpoints: [
        'POST /api/agents/verifier/verify',
        'POST /api/agents/verifier/sign',
        'GET /api/agents/verifier/validate'
      ],
      dependencies: ['Cryptographic Service', 'Content Analysis API', 'Signature Validation']
    }
  ];

  useEffect(() => {
    loadAgentData();
  }, []);

  const loadAgentData = async () => {
    try {
      setIsLoading(true);
      // In a real app, this would fetch from the API
      // const response = await api.getAgentStatus();
      
      // For demo, use the static config with some randomization
      const agentsWithStatus = agentConfigs.map(agent => ({
        ...agent,
        metrics: {
          ...agent.metrics,
          todayActivity: Math.floor(Math.random() * 20) + 5,
          avgResponseTime: Math.floor(Math.random() * 500) + 200
        },
        lastActivity: new Date(Date.now() - Math.random() * 3600000).toISOString()
      }));
      
      setAgents(agentsWithStatus);
    } catch (error) {
      console.error('Failed to load agent data:', error);
      toast.error('Failed to load agent data');
      setAgents(agentConfigs);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAgentData = async () => {
    setIsRefreshing(true);
    await loadAgentData();
    setTimeout(() => setIsRefreshing(false), 1000);
    toast.success('Agent data refreshed');
  };

  const testAgent = async (agentId: string) => {
    try {
      toast.loading(`Testing ${agents.find(a => a.id === agentId)?.name}...`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.dismiss();
      toast.success(`${agents.find(a => a.id === agentId)?.name} test completed successfully`);
    } catch (error) {
      toast.dismiss();
      toast.error(`${agents.find(a => a.id === agentId)?.name} test failed`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'inactive':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const classes = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-yellow-100 text-yellow-800',
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const selectedAgentData = selectedAgent ? agents.find(a => a.id === selectedAgent) : null;

  return (
    <div className="space-y-6 animate-fadeIn page-transition-enter-active">
        {/* Header with distinct purple theme */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-100 rounded-xl p-6 border border-purple-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Multi-Agent Control Center</h1>
              <p className="text-gray-600 text-lg">
                Monitor and control your AI-powered emergency response agents
              </p>
              <div className="flex items-center mt-3 space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">4 Agents Active</span>
                </div>
                <div className="text-sm text-gray-500">
                  Agent coordination enabled
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
            <button
              onClick={refreshAgentData}
              disabled={isRefreshing}
              className="btn-secondary flex items-center space-x-2"
            >
              <RefreshCw className={clsx('h-4 w-4', isRefreshing && 'animate-spin')} />
              <span>Refresh</span>
            </button>
            <button className="btn-primary flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Configure</span>
            </button>
            </div>
          </div>
        </div>

        {/* Agent Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {agents.map((agent) => (
            <div
              key={agent.id}
              onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
              className={clsx(
                'bg-white p-6 rounded-xl shadow-sm border cursor-pointer transition-all duration-200',
                selectedAgent === agent.id 
                  ? 'ring-2 ring-blue-500 border-blue-200' 
                  : 'hover:shadow-md hover:border-gray-300'
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={clsx(
                  'w-12 h-12 rounded-lg flex items-center justify-center',
                  agent.color === 'red' && 'bg-red-100',
                  agent.color === 'blue' && 'bg-blue-100',
                  agent.color === 'green' && 'bg-green-100',
                  agent.color === 'purple' && 'bg-purple-100'
                )}>
                  <agent.icon className={clsx(
                    'h-6 w-6',
                    agent.color === 'red' && 'text-red-600',
                    agent.color === 'blue' && 'text-blue-600',
                    agent.color === 'green' && 'text-green-600',
                    agent.color === 'purple' && 'text-purple-600'
                  )} />
                </div>
                {getStatusIcon(agent.status)}
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {agent.name}
              </h3>
              
              <div className="flex items-center justify-between mb-3">
                {getStatusBadge(agent.status)}
                <span className="text-xs text-gray-500">
                  {agent.metrics.todayActivity} today
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Success Rate</span>
                  <span className="font-medium text-green-600">
                    {agent.metrics.successRate}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Avg Response</span>
                  <span className="font-medium text-blue-600">
                    {agent.metrics.avgResponseTime}ms
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    testAgent(agent.id);
                  }}
                  className="w-full flex items-center justify-center space-x-2 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                >
                  <Play className="h-4 w-4" />
                  <span>Test Agent</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Agent View */}
        {selectedAgentData && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={clsx(
                    'w-16 h-16 rounded-xl flex items-center justify-center',
                    selectedAgentData.color === 'red' && 'bg-red-100',
                    selectedAgentData.color === 'blue' && 'bg-blue-100',
                    selectedAgentData.color === 'green' && 'bg-green-100',
                    selectedAgentData.color === 'purple' && 'bg-purple-100'
                  )}>
                    <selectedAgentData.icon className={clsx(
                      'h-8 w-8',
                      selectedAgentData.color === 'red' && 'text-red-600',
                      selectedAgentData.color === 'blue' && 'text-blue-600',
                      selectedAgentData.color === 'green' && 'text-green-600',
                      selectedAgentData.color === 'purple' && 'text-purple-600'
                    )} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedAgentData.name}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {selectedAgentData.description}
                    </p>
                    <div className="flex items-center space-x-3 mt-2">
                      {getStatusBadge(selectedAgentData.status)}
                      <span className="text-sm text-gray-500">
                        Last active: {new Date(selectedAgentData.lastActivity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => testAgent(selectedAgentData.id)}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <Play className="h-4 w-4" />
                    <span>Test</span>
                  </button>
                  <button className="btn-primary flex items-center space-x-2">
                    <Settings className="h-4 w-4" />
                    <span>Configure</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Metrics */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Performance Metrics
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Total Requests</span>
                        <BarChart3 className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {selectedAgentData.metrics.totalRequests.toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Success Rate</span>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        {selectedAgentData.metrics.successRate}%
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Avg Response Time</span>
                        <Zap className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedAgentData.metrics.avgResponseTime}ms
                      </div>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Today's Activity</span>
                        <Activity className="h-4 w-4 text-purple-500" />
                      </div>
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedAgentData.metrics.todayActivity}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scopes & Endpoints */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Security & Access
                  </h3>
                  
                  <div className="mb-6">
                    <div className="flex items-center space-x-2 mb-3">
                      <Key className="h-4 w-4 text-gray-400" />
                      <h4 className="text-sm font-medium text-gray-700">OAuth Scopes</h4>
                    </div>
                    <div className="space-y-2">
                      {selectedAgentData.scopes.map((scope) => (
                        <div key={scope} className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {scope}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <h4 className="text-sm font-medium text-gray-700">API Endpoints</h4>
                    </div>
                    <div className="space-y-2">
                      {selectedAgentData.endpoints.map((endpoint) => (
                        <div key={endpoint} className="text-xs font-mono bg-gray-50 p-2 rounded">
                          {endpoint}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Dependencies */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Dependencies
                  </h3>
                  
                  <div className="space-y-3">
                    {selectedAgentData.dependencies.map((dependency) => (
                      <div key={dependency} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-gray-700">{dependency}</span>
                        </div>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <h4 className="text-sm font-semibold text-green-800">
                        All Systems Operational
                      </h4>
                    </div>
                    <p className="text-sm text-green-700">
                      All dependencies are healthy and responding normally.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Agent Chat Interface & Workflow Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <AgentChat className="h-[500px]" />
            
            {/* Real-time Workflow Visualization */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Live Agent Coordination</h3>
                  <p className="text-sm text-gray-600">Watch agents collaborate in real-time during emergency response</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setActiveWorkflow(`workflow_${Date.now()}`);
                      setWorkflowActive(!workflowActive);
                      if (!workflowActive) {
                        toast.success('🚨 Emergency workflow simulation started!');
                      } else {
                        toast.success('Workflow simulation stopped');
                      }
                    }}
                    className={clsx(
                      'px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200',
                      workflowActive 
                        ? 'bg-red-500 hover:bg-red-600 text-white' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    )}
                  >
                    {workflowActive ? '⏹️ Stop Demo' : '▶️ Start Demo Workflow'}
                  </button>
                </div>
              </div>
              
              <WorkflowStatus 
                workflowId={activeWorkflow || undefined}
                isActive={workflowActive}
                className="border-0 shadow-none bg-transparent"
              />
            </div>
          </div>
          
          {/* System Overview */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Multi-Agent System Health
              </h3>
              <p className="text-gray-600 text-sm">
                All agents are operational and communicating securely via Descope authentication
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="text-center p-3 bg-white/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">4/4</div>
                <div className="text-xs text-gray-500">Agents Active</div>
              </div>
              <div className="text-center p-3 bg-white/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">99.2%</div>
                <div className="text-xs text-gray-500">Avg Success Rate</div>
              </div>
              <div className="text-center p-3 bg-white/50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">654ms</div>
                <div className="text-xs text-gray-500">Avg Response Time</div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">System Ready</span>
                </div>
                <p className="text-xs text-green-700">
                  Chat interface active. Send instructions to coordinate emergency response.
                </p>
              </div>
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Real-time Demo</span>
                </div>
                <p className="text-xs text-blue-700">
                  Click "Start Demo Workflow" to see agents coordinate a simulated emergency response.
                </p>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}