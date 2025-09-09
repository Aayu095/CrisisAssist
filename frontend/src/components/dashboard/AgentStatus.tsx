'use client';

import { useState } from 'react';
import { 
  Activity, 
  Calendar, 
  MessageSquare, 
  Shield, 
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { clsx } from 'clsx';

interface AgentStatusProps {
  status: any;
  onRefresh: () => void;
}

const agentConfig = {
  alert_agent: {
    name: 'Alert Agent',
    icon: Activity,
    color: 'red',
    description: 'Processes disaster alerts'
  },
  scheduler_agent: {
    name: 'Scheduler Agent',
    icon: Calendar,
    color: 'blue',
    description: 'Manages calendar events'
  },
  notifier_agent: {
    name: 'Notifier Agent',
    icon: MessageSquare,
    color: 'green',
    description: 'Sends notifications'
  },
  verifier_agent: {
    name: 'Verifier Agent',
    icon: Shield,
    color: 'purple',
    description: 'Validates content'
  }
};

export function AgentStatus({ status, onRefresh }: AgentStatusProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Agent Status</h3>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
        >
          <RefreshCw className={clsx(
            'h-4 w-4',
            isRefreshing && 'animate-spin'
          )} />
        </button>
      </div>

      <div className="space-y-4">
        {Object.entries(agentConfig).map(([key, config]) => {
          const agentStatus = status?.[key];
          const isActive = agentStatus?.status === 'active';
          
          return (
            <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={clsx(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  config.color === 'red' && 'bg-red-100',
                  config.color === 'blue' && 'bg-blue-100',
                  config.color === 'green' && 'bg-green-100',
                  config.color === 'purple' && 'bg-purple-100'
                )}>
                  <config.icon className={clsx(
                    'h-5 w-5',
                    config.color === 'red' && 'text-red-600',
                    config.color === 'blue' && 'text-blue-600',
                    config.color === 'green' && 'text-green-600',
                    config.color === 'purple' && 'text-purple-600'
                  )} />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {config.name}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {config.description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {isActive ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <span className={clsx(
                  'text-xs font-medium px-2 py-1 rounded-full',
                  isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                )}>
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Agent Activity Summary */}
      <div className="mt-6 pt-4 border-t">
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          Today's Activity
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-600">
              {status?.alert_agent?.processed_alerts_today || 0}
            </div>
            <div className="text-xs text-blue-600">Alerts Processed</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-600">
              {status?.scheduler_agent?.scheduled_events_today || 0}
            </div>
            <div className="text-xs text-green-600">Events Scheduled</div>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded-lg">
            <div className="text-lg font-bold text-purple-600">
              {status?.notifier_agent?.sent_notifications_today || 0}
            </div>
            <div className="text-xs text-purple-600">Notifications Sent</div>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded-lg">
            <div className="text-lg font-bold text-orange-600">
              {status?.verifier_agent?.verified_content_today || 0}
            </div>
            <div className="text-xs text-orange-600">Content Verified</div>
          </div>
        </div>
      </div>
    </div>
  );
}