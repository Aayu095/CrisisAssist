'use client';

import { useState, useEffect } from 'react';
import { 
  Activity, 
  Calendar, 
  MessageSquare, 
  Shield,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Zap
} from 'lucide-react';
import { clsx } from 'clsx';

interface WorkflowStep {
  id: string;
  agent: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  duration?: number;
  result?: string;
  icon: any;
  color: string;
}

interface WorkflowStatusProps {
  workflowId?: string;
  isActive?: boolean;
  className?: string;
}

export function WorkflowStatus({ workflowId, isActive = false, className }: WorkflowStatusProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>([
    {
      id: 'alert',
      agent: 'Alert Agent',
      name: 'Process Emergency Alert',
      status: 'pending',
      icon: Activity,
      color: 'red'
    },
    {
      id: 'verify',
      agent: 'Verifier Agent', 
      name: 'Verify Content Authenticity',
      status: 'pending',
      icon: Shield,
      color: 'purple'
    },
    {
      id: 'schedule',
      agent: 'Scheduler Agent',
      name: 'Coordinate Response Resources',
      status: 'pending',
      icon: Calendar,
      color: 'blue'
    },
    {
      id: 'notify',
      agent: 'Notifier Agent',
      name: 'Broadcast Emergency Alerts',
      status: 'pending',
      icon: MessageSquare,
      color: 'green'
    }
  ]);

  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setSteps(prevSteps => {
        const newSteps = [...prevSteps];
        const activeStepIndex = newSteps.findIndex(step => step.status === 'processing');
        
        if (activeStepIndex >= 0) {
          // Complete current processing step
          newSteps[activeStepIndex] = {
            ...newSteps[activeStepIndex],
            status: 'completed',
            duration: Math.floor(Math.random() * 2000) + 500,
            result: getStepResult(newSteps[activeStepIndex].id)
          };
          
          // Start next step if available
          if (activeStepIndex + 1 < newSteps.length) {
            newSteps[activeStepIndex + 1] = {
              ...newSteps[activeStepIndex + 1],
              status: 'processing'
            };
            setCurrentStep(activeStepIndex + 1);
          }
        } else {
          // Start first step if none are processing
          const firstPendingIndex = newSteps.findIndex(step => step.status === 'pending');
          if (firstPendingIndex >= 0) {
            newSteps[firstPendingIndex] = {
              ...newSteps[firstPendingIndex],
              status: 'processing'
            };
            setCurrentStep(firstPendingIndex);
          }
        }
        
        return newSteps;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [isActive]);

  const getStepResult = (stepId: string): string => {
    const results = {
      alert: 'Risk level: HIGH • Affected area: 2.5km radius • Resources required: 15 units',
      verify: 'Content verified ✓ • Source credible ✓ • No misinformation detected ✓',
      schedule: 'Emergency meeting scheduled • 8 responders assigned • Resources allocated',
      notify: 'Alerts sent via Slack, SMS, Email • 156 recipients reached • All channels active'
    };
    return results[stepId as keyof typeof results] || 'Task completed successfully';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Clock className="h-4 w-4 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing':
        return 'text-blue-600 bg-blue-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-400 bg-gray-100';
    }
  };

  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  return (
    <div className={clsx('bg-white rounded-xl shadow-sm border', className)}>
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Multi-Agent Workflow</h3>
            <p className="text-sm text-gray-600">Real-time emergency response coordination</p>
          </div>
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium text-gray-700">
              {isActive ? 'Active' : 'Ready'}
            </span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{completedSteps}/{steps.length} completed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="p-4 space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className="relative">
            {/* Connection Line */}
            {index < steps.length - 1 && (
              <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200" />
            )}
            
            <div className={clsx(
              'flex items-start space-x-4 p-3 rounded-lg transition-all duration-300',
              step.status === 'processing' && 'bg-blue-50 border border-blue-200',
              step.status === 'completed' && 'bg-green-50 border border-green-200',
              step.status === 'error' && 'bg-red-50 border border-red-200',
              step.status === 'pending' && 'bg-gray-50'
            )}>
              {/* Agent Icon */}
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
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold text-gray-900">
                    {step.name}
                  </h4>
                  <div className={clsx(
                    'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
                    getStatusColor(step.status)
                  )}>
                    {getStatusIcon(step.status)}
                    <span className="capitalize">{step.status}</span>
                  </div>
                </div>
                
                <p className="text-xs text-gray-600 mb-2">{step.agent}</p>
                
                {step.result && (
                  <div className="text-xs text-gray-700 bg-white p-2 rounded border">
                    {step.result}
                  </div>
                )}
                
                {step.duration && (
                  <div className="text-xs text-gray-500 mt-1">
                    Completed in {step.duration}ms
                  </div>
                )}
              </div>

              {/* Arrow for active step */}
              {step.status === 'processing' && (
                <div className="flex items-center">
                  <ArrowRight className="h-4 w-4 text-blue-500 animate-pulse" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Secure agent communication</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Descope authentication</span>
            </div>
          </div>
          {workflowId && (
            <span className="font-mono">ID: {workflowId}</span>
          )}
        </div>
      </div>
    </div>
  );
}
