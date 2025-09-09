'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink,
  MapPin,
  Clock
} from 'lucide-react';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';

interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  location: {
    address: string;
  };
  status: string;
  created_at: string;
}

interface RecentAlertsProps {
  alerts: Alert[];
  onRefresh: () => void;
}

const severityConfig = {
  critical: {
    color: 'red',
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200'
  },
  high: {
    color: 'orange',
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-200'
  },
  medium: {
    color: 'yellow',
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200'
  },
  low: {
    color: 'blue',
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200'
  }
};

const statusConfig = {
  active: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    dot: 'bg-red-500'
  },
  processing: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    dot: 'bg-blue-500'
  },
  resolved: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    dot: 'bg-green-500'
  },
  cancelled: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    dot: 'bg-gray-500'
  }
};

export function RecentAlerts({ alerts, onRefresh }: RecentAlertsProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Recent Alerts</h3>
        <div className="flex items-center space-x-2">
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
          <Link
            href="/dashboard/alerts"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-1"
          >
            <span>View all</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No recent alerts</h4>
          <p className="text-gray-500">
            When alerts are triggered, they'll appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const severityStyle = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.medium;
            const statusStyle = statusConfig[alert.status as keyof typeof statusConfig] || statusConfig.active;
            
            return (
              <div
                key={alert.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={clsx(
                        'px-2 py-1 text-xs font-medium rounded-full',
                        severityStyle.bg,
                        severityStyle.text
                      )}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">
                        {alert.type}
                      </span>
                      <div className="flex items-center space-x-1">
                        <div className={clsx('w-2 h-2 rounded-full', statusStyle.dot)}></div>
                        <span className={clsx(
                          'text-xs font-medium px-2 py-0.5 rounded-full',
                          statusStyle.bg,
                          statusStyle.text
                        )}>
                          {alert.status}
                        </span>
                      </div>
                    </div>
                    
                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                      {alert.title}
                    </h4>
                    
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {alert.description}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span>{alert.location.address}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Link
                    href={`/dashboard/alerts/${alert.id}`}
                    className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}