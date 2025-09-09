'use client';

import { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Calendar, 
  MessageSquare, 
  Shield,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Clock,
  ArrowRight,
  Activity,
  Zap,
  Users,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useApi } from '@/components/providers/ApiProvider';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

interface WorkflowStep {
  id: string;
  name: string;
  agent: string;
  icon: any;
  color: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  description: string;
  result?: any;
  duration?: number;
}

export default function SimulatorPage() {
  const api = useApi();
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [alertConfig, setAlertConfig] = useState({
    type: 'flood',
    severity: 'high',
    location: 'Indore, MP',
    description: 'Heavy rainfall causing flooding in low-lying areas',
    affectedPopulation: 50000,
    resourcesNeeded: ['rescue_boats', 'medical_supplies', 'food_packets']
  });

  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
    {
      id: 'alert',
      name: 'Process Alert',
      agent: 'Alert Agent',
      icon: AlertTriangle,
      color: 'red',
      status: 'pending',
      description: 'Analyze incoming disaster alert and determine response requirements'
    },
    {
      id: 'schedule',
      name: 'Schedule Resources',
      agent: 'Scheduler Agent',
      icon: Calendar,
      color: 'blue',
      status: 'pending',
      description: 'Create calendar events for relief coordination and resource allocation'
    },
    {
      id: 'verify',
      name: 'Verify Content',
      agent: 'Verifier Agent',
      icon: Shield,
      color: 'purple',
      status: 'pending',
      description: 'Validate alert content and generate cryptographic signature'
    },
    {
      id: 'notify',
      name: 'Send Notifications',
      agent: 'Notifier Agent',
      icon: MessageSquare,
      color: 'green',
      status: 'pending',
      description: 'Broadcast verified alerts to communities via multiple channels'
    }
  ]);

  const resetWorkflow = () => {
    setWorkflowSteps(steps => steps.map(step => ({
      ...step,
      status: 'pending',
      result: undefined,
      duration: undefined
    })));
    setCurrentStep(0);
    setIsRunning(false);
  };

  const runWorkflow = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setCurrentStep(0);
    
    try {
      for (let i = 0; i < workflowSteps.length; i++) {
        setCurrentStep(i);
        
        // Update step to running
        setWorkflowSteps(steps => steps.map((step, index) => 
          index === i ? { ...step, status: 'running' } : step
        ));

        const startTime = Date.now();
        let result: any = null;

        try {
          // Execute the actual agent action
          switch (workflowSteps[i].id) {
            case 'alert':
              result = await api.simulateAlert(alertConfig);
              break;
            case 'schedule':
              result = await api.scheduleEvent({
                title: `Emergency Relief - ${alertConfig.type.toUpperCase()}`,
                location: alertConfig.location,
                description: `Relief coordination for ${alertConfig.description}`,
                start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                attendees: ['relief_coordinator@emergency.gov', 'medical_team@hospital.com']
              });
              break;
            case 'verify':
              result = await api.verifyContent({
                content: `EMERGENCY ALERT: ${alertConfig.type.toUpperCase()} in ${alertConfig.location}. ${alertConfig.description}`,
                type: 'alert_message',
                source: 'emergency_system'
              });
              break;
            case 'notify':
              result = await api.sendNotification({
                message: `🚨 EMERGENCY ALERT: ${alertConfig.type.toUpperCase()} in ${alertConfig.location}. ${alertConfig.description}. Seek immediate shelter and follow local emergency instructions.`,
                channels: ['slack', 'sms', 'email'],
                priority: alertConfig.severity,
                location: alertConfig.location,
                alert_type: alertConfig.type
              });
              break;
          }

          const duration = Date.now() - startTime;

          // Update step to completed
          setWorkflowSteps(steps => steps.map((step, index) => 
            index === i ? { 
              ...step, 
              status: 'completed', 
              result,
              duration 
            } : step
          ));

          // Wait a bit before next step for demo effect
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`Step ${workflowSteps[i].id} failed:`, error);
          
          setWorkflowSteps(steps => steps.map((step, index) => 
            index === i ? { ...step, status: 'error', result: error } : step
          ));
          
          toast.error(`${workflowSteps[i].name} failed`);
          break;
        }
      }

      toast.success('Multi-agent workflow completed successfully!');
    } catch (error) {
      console.error('Workflow failed:', error);
      toast.error('Workflow execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  const getStepStatusIcon = (step: WorkflowStep, index: number) => {
    if (step.status === 'completed') {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (step.status === 'running') {
      return <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
    } else if (step.status === 'error') {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    } else if (index < currentStep) {
      return <CheckCircle className="h-5 w-5 text-gray-400" />;
    } else {
      return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Multi-Agent Simulator</h1>
            <p className="text-gray-600">
              Test the complete emergency response workflow with all four agents
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={resetWorkflow}
              disabled={isRunning}
              className="btn-secondary flex items-center space-x-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </button>
            <button
              onClick={runWorkflow}
              disabled={isRunning}
              className="btn-primary flex items-center space-x-2"
            >
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Start Workflow</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alert Configuration */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Emergency Scenario
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Disaster Type
                </label>
                <select
                  value={alertConfig.type}
                  onChange={(e) => setAlertConfig(prev => ({ ...prev, type: e.target.value }))}
                  disabled={isRunning}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="flood">Flood</option>
                  <option value="earthquake">Earthquake</option>
                  <option value="fire">Fire</option>
                  <option value="cyclone">Cyclone</option>
                  <option value="landslide">Landslide</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity Level
                </label>
                <select
                  value={alertConfig.severity}
                  onChange={(e) => setAlertConfig(prev => ({ ...prev, severity: e.target.value }))}
                  disabled={isRunning}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={alertConfig.location}
                    onChange={(e) => setAlertConfig(prev => ({ ...prev, location: e.target.value }))}
                    disabled={isRunning}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter location"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={alertConfig.description}
                  onChange={(e) => setAlertConfig(prev => ({ ...prev, description: e.target.value }))}
                  disabled={isRunning}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe the emergency situation"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Affected Population
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      value={alertConfig.affectedPopulation}
                      onChange={(e) => setAlertConfig(prev => ({ ...prev, affectedPopulation: parseInt(e.target.value) }))}
                      disabled={isRunning}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <div className={clsx(
                    'px-3 py-2 rounded-lg text-center font-medium',
                    alertConfig.severity === 'critical' && 'bg-red-100 text-red-800',
                    alertConfig.severity === 'high' && 'bg-orange-100 text-orange-800',
                    alertConfig.severity === 'medium' && 'bg-yellow-100 text-yellow-800',
                    alertConfig.severity === 'low' && 'bg-green-100 text-green-800'
                  )}>
                    {alertConfig.severity.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Workflow Steps */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              Agent Workflow Progress
            </h3>

            <div className="space-y-4">
              {workflowSteps.map((step, index) => (
                <div key={step.id} className="relative">
                  {/* Connection Line */}
                  {index < workflowSteps.length - 1 && (
                    <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200"></div>
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
                          <h4 className="text-sm font-semibold text-gray-900">
                            {step.name}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {step.agent}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {step.duration && (
                            <span className="text-xs text-gray-500">
                              {step.duration}ms
                            </span>
                          )}
                          {getStepStatusIcon(step, index)}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">
                        {step.description}
                      </p>

                      {/* Step Result */}
                      {step.result && step.status === 'completed' && (
                        <div className="bg-white p-3 rounded border">
                          <h5 className="text-xs font-medium text-gray-700 mb-1">Result:</h5>
                          <div className="text-xs text-gray-600">
                            {step.id === 'alert' && (
                              <div>Alert processed successfully. Risk level: {alertConfig.severity}</div>
                            )}
                            {step.id === 'schedule' && (
                              <div>Calendar event created: Emergency Relief - {alertConfig.type.toUpperCase()}</div>
                            )}
                            {step.id === 'verify' && (
                              <div>Content verified and signed. Signature: {step.result?.signature?.substring(0, 20)}...</div>
                            )}
                            {step.id === 'notify' && (
                              <div>Notifications sent via {step.result?.channels?.join(', ') || 'multiple channels'}</div>
                            )}
                          </div>
                        </div>
                      )}

                      {step.status === 'error' && (
                        <div className="bg-red-50 border border-red-200 p-3 rounded">
                          <h5 className="text-xs font-medium text-red-700 mb-1">Error:</h5>
                          <div className="text-xs text-red-600">
                            {step.result?.message || 'An error occurred during execution'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Workflow Summary */}
            {workflowSteps.every(step => step.status === 'completed') && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h4 className="text-sm font-semibold text-green-800">
                    Workflow Completed Successfully!
                  </h4>
                </div>
                <p className="text-sm text-green-700">
                  All agents have processed the emergency alert. The community has been notified 
                  and relief coordination is underway.
                </p>
                <div className="mt-3 flex items-center space-x-4 text-xs text-green-600">
                  <span>Total Steps: {workflowSteps.length}</span>
                  <span>•</span>
                  <span>Success Rate: 100%</span>
                  <span>•</span>
                  <span>
                    Total Time: {workflowSteps.reduce((acc, step) => acc + (step.duration || 0), 0)}ms
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Activity Feed */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Real-time Activity Feed
            </h3>
            <Activity className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {workflowSteps.map((step, index) => (
              <div key={`${step.id}-${step.status}`} className="flex items-center space-x-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                <span className="text-gray-500 text-xs">
                  {new Date().toLocaleTimeString()}
                </span>
                <span className="text-gray-700">
                  {step.status === 'completed' && `✅ ${step.agent} completed ${step.name.toLowerCase()}`}
                  {step.status === 'running' && `⚡ ${step.agent} is processing ${step.name.toLowerCase()}`}
                  {step.status === 'error' && `❌ ${step.agent} failed to ${step.name.toLowerCase()}`}
                  {step.status === 'pending' && `⏳ ${step.agent} waiting to ${step.name.toLowerCase()}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}