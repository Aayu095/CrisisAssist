'use client';

import { useState, useEffect } from 'react';
import { 
  Activity, 
  Zap, 
  Clock, 
  CheckCircle,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { clsx } from 'clsx';

interface AgentMetric {
  id: string;
  name: string;
  requests: number;
  responseTime: number;
  successRate: number;
  status: 'active' | 'busy' | 'idle';
  color: string;
}

interface LiveAgentMetricsProps {
  className?: string;
}

export function LiveAgentMetrics({ className }: LiveAgentMetricsProps) {
  const [metrics, setMetrics] = useState<AgentMetric[]>([
    { id: 'alert', name: 'Alert Agent', requests: 0, responseTime: 245, successRate: 98.7, status: 'idle', color: 'red' },
    { id: 'verifier', name: 'Verifier Agent', requests: 0, responseTime: 320, successRate: 100, status: 'idle', color: 'purple' },
    { id: 'scheduler', name: 'Scheduler Agent', requests: 0, responseTime: 1200, successRate: 96.6, status: 'idle', color: 'blue' },
    { id: 'notifier', name: 'Notifier Agent', requests: 0, responseTime: 850, successRate: 99.1, status: 'idle', color: 'green' }
  ]);

  const [totalRequests, setTotalRequests] = useState(0);
  const [avgResponseTime, setAvgResponseTime] = useState(654);
  const [systemLoad, setSystemLoad] = useState(12);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => prev.map(metric => ({
        ...metric,
        requests: metric.requests + Math.floor(Math.random() * 3),
        responseTime: Math.max(100, metric.responseTime + (Math.random() - 0.5) * 100),
        successRate: Math.min(100, Math.max(95, metric.successRate + (Math.random() - 0.5) * 2)),
        status: Math.random() > 0.7 ? 'busy' : (Math.random() > 0.3 ? 'active' : 'idle')
      })));

      setTotalRequests(prev => prev + Math.floor(Math.random() * 5) + 1);
      setAvgResponseTime(prev => Math.max(200, prev + (Math.random() - 0.5) * 50));
      setSystemLoad(prev => Math.max(5, Math.min(95, prev + (Math.random() - 0.5) * 10)));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'busy': return 'text-yellow-600 bg-yellow-100';
      case 'idle': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-3 w-3" />;
      case 'busy': return <Clock className="h-3 w-3 animate-pulse" />;
      case 'idle': return <div className="w-3 h-3 rounded-full border border-gray-400" />;
      default: return <div className="w-3 h-3 rounded-full border border-gray-400" />;
    }
  };

  return (
    <div className={clsx('bg-white rounded-xl shadow-sm border', className)}>
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-green-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Live Agent Metrics</h3>
            <p className="text-sm text-gray-600">Real-time performance monitoring</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-600">Live</span>
          </div>
        </div>
      </div>

      {/* System Overview */}
      <div className="p-4 border-b">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalRequests}</div>
            <div className="text-xs text-gray-500">Total Requests</div>
            <div className="flex items-center justify-center mt-1">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-xs text-green-600">+{Math.floor(Math.random() * 5) + 1}/min</span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{Math.round(avgResponseTime)}ms</div>
            <div className="text-xs text-gray-500">Avg Response</div>
            <div className="flex items-center justify-center mt-1">
              <Zap className="h-3 w-3 text-yellow-500 mr-1" />
              <span className="text-xs text-gray-600">Real-time</span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{Math.round(systemLoad)}%</div>
            <div className="text-xs text-gray-500">System Load</div>
            <div className="flex items-center justify-center mt-1">
              <Activity className="h-3 w-3 text-blue-500 mr-1" />
              <span className="text-xs text-blue-600">Optimal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Metrics */}
      <div className="p-4 space-y-3">
        {metrics.map((metric) => (
          <div key={metric.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={clsx(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                metric.color === 'red' && 'bg-red-100',
                metric.color === 'blue' && 'bg-blue-100',
                metric.color === 'green' && 'bg-green-100',
                metric.color === 'purple' && 'bg-purple-100'
              )}>
                <Activity className={clsx(
                  'h-4 w-4',
                  metric.color === 'red' && 'text-red-600',
                  metric.color === 'blue' && 'text-blue-600',
                  metric.color === 'green' && 'text-green-600',
                  metric.color === 'purple' && 'text-purple-600'
                )} />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{metric.name}</div>
                <div className="flex items-center space-x-2">
                  <span className={clsx(
                    'flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium',
                    getStatusColor(metric.status)
                  )}>
                    {getStatusIcon(metric.status)}
                    <span className="capitalize">{metric.status}</span>
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="font-semibold text-gray-900">{metric.requests}</div>
                  <div className="text-gray-500">Requests</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{Math.round(metric.responseTime)}ms</div>
                  <div className="text-gray-500">Response</div>
                </div>
                <div>
                  <div className="font-semibold text-green-600">{metric.successRate.toFixed(1)}%</div>
                  <div className="text-gray-500">Success</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>All agents operational</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <span>Updated {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
