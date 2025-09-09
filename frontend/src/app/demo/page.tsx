'use client';

import { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  MessageSquare,
  Shield,
  Activity,
  ArrowRight,
  Clock,
  MapPin,
  Users,
  Zap,
  Globe,
  Key,
  Eye
} from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';

interface DemoStep {
  id: string;
  title: string;
  description: string;
  agent: string;
  icon: any;
  color: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  duration?: number;
  details?: any;
}

export default function DemoPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [demoSteps, setDemoSteps] = useState<DemoStep[]>([
    {
      id: 'alert',
      title: 'Emergency Alert Received',
      description: 'Alert Agent processes incoming flood alert for Indore region',
      agent: 'Alert Agent',
      icon: AlertTriangle,
      color: 'red',
      status: 'pending'
    },
    {
      id: 'schedule',
      title: 'Relief Coordination Scheduled',
      description: 'Scheduler Agent creates calendar events for emergency response',
      agent: 'Scheduler Agent',
      icon: Calendar,
      color: 'blue',
      status: 'pending'
    },
    {
      id: 'verify',
      title: 'Content Verification',
      description: 'Verifier Agent validates and signs the emergency message',
      agent: 'Verifier Agent',
      icon: Shield,
      color: 'purple',
      status: 'pending'
    },
    {
      id: 'notify',
      title: 'Community Notification',
      description: 'Notifier Agent broadcasts verified alert to all channels',
      agent: 'Notifier Agent',
      icon: MessageSquare,
      color: 'green',
      status: 'pending'
    }
  ]);

  const [demoData] = useState({
    alert: {
      type: 'Flood',
      severity: 'High',
      location: 'Indore, Madhya Pradesh',
      description: 'Heavy rainfall causing flooding in low-lying areas',
      affectedPopulation: '50,000+',
      timestamp: new Date().toISOString()
    },
    security: {
      tokenValidation: true,
      scopeEnforcement: true,
      auditLogging: true,
      encryption: 'AES-256'
    }
  });

  const runDemo = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setCurrentStep(0);
    
    // Reset all steps
    setDemoSteps(steps => steps.map(step => ({
      ...step,
      status: 'pending',
      duration: undefined,
      details: undefined
    })));

    try {
      for (let i = 0; i < demoSteps.length; i++) {
        setCurrentStep(i);
        
        // Update step to running
        setDemoSteps(steps => steps.map((step, index) => 
          index === i ? { ...step, status: 'running' } : step
        ));

        const startTime = Date.now();
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
        
        const duration = Date.now() - startTime;
        
        // Mock response data based on step
        let details = {};
        switch (demoSteps[i].id) {
          case 'alert':
            details = {
              riskLevel: 'HIGH',
              resourcesRequired: ['Rescue boats', 'Medical supplies', 'Food packets'],
              estimatedImpact: '50,000 people affected'
            };
            break;
          case 'schedule':
            details = {
              eventCreated: 'Emergency Relief Camp Setup',
              location: 'Community Center, Indore',
              attendees: ['Relief Coordinator', 'Medical Team', 'Volunteer Coordinator'],
              startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toLocaleString()
            };
            break;
          case 'verify':
            details = {
              contentHash: 'sha256:a1b2c3d4e5f6...',
              signature: 'RS256:eyJhbGciOiJSUzI1NiIs...',
              verificationStatus: 'VALID',
              timestamp: new Date().toISOString()
            };
            break;
          case 'notify':
            details = {
              channels: ['Slack', 'SMS', 'Email', 'WhatsApp'],
              recipientCount: 1247,
              deliveryStatus: 'SUCCESS',
              messageId: 'msg_' + Math.random().toString(36).substr(2, 9)
            };
            break;
        }

        // Update step to completed
        setDemoSteps(steps => steps.map((step, index) => 
          index === i ? { 
            ...step, 
            status: 'completed', 
            duration,
            details 
          } : step
        ));

        // Wait before next step
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Demo failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const resetDemo = () => {
    setDemoSteps(steps => steps.map(step => ({
      ...step,
      status: 'pending',
      duration: undefined,
      details: undefined
    })));
    setCurrentStep(0);
    setIsRunning(false);
  };

  const getStepIcon = (step: DemoStep, index: number) => {
    if (step.status === 'completed') {
      return <CheckCircle className="h-6 w-6 text-green-500" />;
    } else if (step.status === 'running') {
      return <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
    } else if (step.status === 'error') {
      return <AlertTriangle className="h-6 w-6 text-red-500" />;
    } else {
      return <Clock className="h-6 w-6 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">CrisisAssist Demo</h1>
                <p className="text-gray-600">Multi-Agent Emergency Response System</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                href="/auth/login"
                className="btn-secondary"
              >
                Access Dashboard
              </Link>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live Demo</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Demo Introduction */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-6">
            🏆 Global MCP Hackathon - Theme 3: Secure Agent-to-Agent Communication
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            See Multi-Agent Coordination in Action
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Watch how our four specialized agents work together to coordinate emergency response 
            with secure authentication, scoped permissions, and complete audit trails.
          </p>
          
          <div className="flex justify-center space-x-4">
            <button
              onClick={runDemo}
              disabled={isRunning}
              className="btn-primary flex items-center space-x-2 text-lg px-8 py-3"
            >
              {isRunning ? (
                <>
                  <Pause className="h-5 w-5" />
                  <span>Running Demo...</span>
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  <span>Start Demo</span>
                </>
              )}
            </button>
            <button
              onClick={resetDemo}
              disabled={isRunning}
              className="btn-secondary flex items-center space-x-2 text-lg px-8 py-3"
            >
              <RotateCcw className="h-5 w-5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Emergency Scenario */}
          <div className="bg-white rounded-xl shadow-lg border p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Emergency Scenario</h3>
            </div>
            
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-800">FLOOD ALERT</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium text-gray-900">{demoData.alert.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Severity:</span>
                    <span className="font-medium text-red-600">{demoData.alert.severity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium text-gray-900">{demoData.alert.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Affected:</span>
                    <span className="font-medium text-gray-900">{demoData.alert.affectedPopulation}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                <p className="text-sm text-gray-600">{demoData.alert.description}</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Security Features</h4>
                <div className="space-y-2 text-sm">
                  {Object.entries(demoData.security).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-blue-700">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                      </span>
                      <div className="flex items-center space-x-1">
                        {typeof value === 'boolean' ? (
                          value ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )
                        ) : (
                          <span className="font-medium text-blue-900">{value}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Workflow Steps */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Multi-Agent Workflow</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Activity className="h-4 w-4" />
                <span>Step {currentStep + 1} of {demoSteps.length}</span>
              </div>
            </div>

            <div className="space-y-6">
              {demoSteps.map((step, index) => (
                <div key={step.id} className="relative">
                  {/* Connection Line */}
                  {index < demoSteps.length - 1 && (
                    <div className="absolute left-6 top-16 w-0.5 h-12 bg-gray-200"></div>
                  )}
                  
                  <div className={clsx(
                    'flex items-start space-x-4 p-4 rounded-lg transition-all duration-300',
                    step.status === 'running' && 'bg-blue-50 border border-blue-200',
                    step.status === 'completed' && 'bg-green-50 border border-green-200',
                    step.status === 'error' && 'bg-red-50 border border-red-200',
                    step.status === 'pending' && 'bg-gray-50 border border-gray-200'
                  )}>
                    {/* Step Icon */}
                    <div className={clsx(
                      'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
                      step.color === 'red' && 'bg-red-100',
                      step.color === 'blue' && 'bg-blue-100',
                      step.color === 'green' && 'bg-green-100',
                      step.color === 'purple' && 'bg-purple-100'
                    )}>
                      <step.icon className={clsx(
                        'h-6 w-6',
                        step.color === 'red' && 'text-red-600',
                        step.color === 'blue' && 'text-blue-600',
                        step.color === 'green' && 'text-green-600',
                        step.color === 'purple' && 'text-purple-600'
                      )} />
                    </div>

                    {/* Step Content */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">
                            {step.title}
                          </h4>
                          <p className="text-sm text-gray-500">{step.agent}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {step.duration && (
                            <span className="text-xs text-gray-500">
                              {step.duration}ms
                            </span>
                          )}
                          {getStepIcon(step, index)}
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{step.description}</p>

                      {/* Step Details */}
                      {step.details && step.status === 'completed' && (
                        <div className="bg-white border rounded-lg p-3">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Result Details:</h5>
                          <div className="space-y-1 text-xs">
                            {Object.entries(step.details).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-gray-500">
                                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                                </span>
                                <span className="font-medium text-gray-700 max-w-xs truncate">
                                  {Array.isArray(value) ? value.join(', ') : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Completion Status */}
            {demoSteps.every(step => step.status === 'completed') && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <h4 className="text-lg font-semibold text-green-800">
                    Emergency Response Coordinated Successfully!
                  </h4>
                </div>
                <p className="text-green-700 mb-3">
                  All agents have completed their tasks. The community has been notified and 
                  relief coordination is underway with full security compliance.
                </p>
                <div className="flex items-center space-x-4 text-sm text-green-600">
                  <span>✅ Secure Authentication</span>
                  <span>✅ Scoped Permissions</span>
                  <span>✅ Complete Audit Trail</span>
                  <span>✅ Real-time Coordination</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Technical Details */}
        <div className="mt-12 bg-gradient-to-r from-gray-900 to-blue-900 rounded-xl text-white p-8">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold mb-6 text-center">
              Built for Global MCP Hackathon 2025
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold mb-2">Theme 3 Compliance</h4>
                <p className="text-white/80 text-sm">
                  Secure agent-to-agent communication with Descope authentication
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold mb-2">Multi-Agent Architecture</h4>
                <p className="text-white/80 text-sm">
                  Four specialized agents with distinct roles and permissions
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Globe className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold mb-2">Real-world Impact</h4>
                <p className="text-white/80 text-sm">
                  Emergency response coordination that saves lives
                </p>
              </div>
            </div>

            <div className="text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center space-x-2 bg-white text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors duration-200"
              >
                <span>Explore Full Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}