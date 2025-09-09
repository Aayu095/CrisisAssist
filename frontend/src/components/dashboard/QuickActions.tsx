'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Zap, 
  AlertTriangle, 
  Play, 
  FileText,
  Settings,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

interface QuickActionsProps {
  onAction: () => void;
}

export function QuickActions({ onAction }: QuickActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const actions = [
    {
      id: 'simulate-alert',
      title: 'Simulate Alert',
      description: 'Trigger a demo emergency alert',
      icon: AlertTriangle,
      color: 'red',
      action: () => router.push('/dashboard/simulator')
    },
    {
      id: 'run-workflow',
      title: 'Run Workflow',
      description: 'Execute full agent workflow',
      icon: Play,
      color: 'blue',
      action: async () => {
        setIsLoading('run-workflow');
        try {
          // Mock workflow execution
          await new Promise(resolve => setTimeout(resolve, 2000));
          toast.success('Workflow executed successfully');
          onAction();
        } catch (error) {
          toast.error('Failed to execute workflow');
        } finally {
          setIsLoading(null);
        }
      }
    },
    {
      id: 'view-logs',
      title: 'View Audit Logs',
      description: 'Check system activity',
      icon: FileText,
      color: 'green',
      action: () => router.push('/dashboard/audit')
    },
    {
      id: 'agent-status',
      title: 'Agent Status',
      description: 'Monitor agent health',
      icon: Activity,
      color: 'purple',
      action: () => router.push('/dashboard/agents')
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Configure system',
      icon: Settings,
      color: 'gray',
      action: () => router.push('/dashboard/settings')
    }
  ];

  const getColorClasses = (color: string) => {
    const classes = {
      red: {
        bg: 'bg-red-100 hover:bg-red-200',
        text: 'text-red-600',
        icon: 'text-red-600'
      },
      blue: {
        bg: 'bg-blue-100 hover:bg-blue-200',
        text: 'text-blue-600',
        icon: 'text-blue-600'
      },
      green: {
        bg: 'bg-green-100 hover:bg-green-200',
        text: 'text-green-600',
        icon: 'text-green-600'
      },
      purple: {
        bg: 'bg-purple-100 hover:bg-purple-200',
        text: 'text-purple-600',
        icon: 'text-purple-600'
      },
      gray: {
        bg: 'bg-gray-100 hover:bg-gray-200',
        text: 'text-gray-600',
        icon: 'text-gray-600'
      }
    };
    return classes[color as keyof typeof classes] || classes.gray;
  };

  return (
    <div className="grid grid-cols-1 gap-3">
      {actions.map((action) => {
        const colorClasses = getColorClasses(action.color);
        const isActionLoading = isLoading === action.id;
        
        return (
          <button
            key={action.id}
            onClick={action.action}
            disabled={isActionLoading}
            className={`
              flex items-center space-x-3 p-3 rounded-lg transition-all duration-200
              ${colorClasses.bg}
              ${isActionLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex-shrink-0">
              {isActionLoading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <action.icon className={`h-5 w-5 ${colorClasses.icon}`} />
              )}
            </div>
            <div className="flex-1 text-left">
              <h4 className={`text-sm font-medium ${colorClasses.text}`}>
                {action.title}
              </h4>
              <p className="text-xs text-gray-500">
                {action.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}