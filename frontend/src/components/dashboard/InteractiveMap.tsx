'use client';

import { useState, useEffect } from 'react';
import { MapPin, AlertTriangle, Users, Clock } from 'lucide-react';

interface AlertLocation {
  id: string;
  lat: number;
  lng: number;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  timestamp: string;
  affected: number;
}

export function InteractiveMap() {
  const [alerts, setAlerts] = useState<AlertLocation[]>([
    {
      id: '1',
      lat: 22.7196,
      lng: 75.8577,
      type: 'flood',
      severity: 'high',
      title: 'Flash Flood Warning',
      timestamp: '2 min ago',
      affected: 1247
    },
    {
      id: '2',
      lat: 19.0760,
      lng: 72.8777,
      type: 'earthquake',
      severity: 'critical',
      title: 'Seismic Activity Detected',
      timestamp: '5 min ago',
      affected: 5632
    },
    {
      id: '3',
      lat: 28.7041,
      lng: 77.1025,
      type: 'fire',
      severity: 'medium',
      title: 'Industrial Fire',
      timestamp: '12 min ago',
      affected: 423
    }
  ]);

  const [selectedAlert, setSelectedAlert] = useState<AlertLocation | null>(null);

  const severityColors = {
    low: 'bg-yellow-400 border-yellow-500',
    medium: 'bg-orange-400 border-orange-500',
    high: 'bg-red-400 border-red-500',
    critical: 'bg-purple-600 border-purple-700'
  };

  const severityPulse = {
    low: 'animate-pulse',
    medium: 'animate-pulse',
    high: 'animate-ping',
    critical: 'animate-ping'
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <MapPin className="h-5 w-5 mr-2 text-blue-600" />
            Live Alert Map
          </h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Real-time</span>
          </div>
        </div>
      </div>

      <div className="relative h-96 bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Simulated map background */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 400 300">
            {/* India outline (simplified) */}
            <path
              d="M100 50 L150 40 L200 60 L250 50 L300 80 L320 120 L300 180 L280 220 L250 240 L200 250 L150 240 L120 220 L100 180 L80 140 L100 100 Z"
              fill="currentColor"
              className="text-gray-300"
            />
          </svg>
        </div>

        {/* Alert markers */}
        {alerts.map((alert, index) => (
          <div
            key={alert.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
            style={{
              left: `${30 + index * 25}%`,
              top: `${40 + index * 15}%`
            }}
            onClick={() => setSelectedAlert(alert)}
          >
            {/* Pulse rings */}
            <div className={`absolute inset-0 rounded-full ${severityColors[alert.severity]} ${severityPulse[alert.severity]} opacity-30`}></div>
            <div className={`absolute inset-0 rounded-full ${severityColors[alert.severity]} animate-ping opacity-20 scale-150`}></div>
            
            {/* Main marker */}
            <div className={`w-6 h-6 rounded-full ${severityColors[alert.severity]} border-2 border-white shadow-lg group-hover:scale-125 transition-transform duration-300 relative z-10`}>
              <div className="absolute inset-0 rounded-full bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>

            {/* Tooltip on hover */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
              <div className="font-semibold">{alert.title}</div>
              <div className="text-gray-300">{alert.timestamp}</div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <div className="text-xs font-semibold text-gray-700 mb-2">Alert Severity</div>
          <div className="space-y-1">
            {Object.entries(severityColors).map(([severity, color]) => (
              <div key={severity} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${color}`}></div>
                <span className="text-xs text-gray-600 capitalize">{severity}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alert details panel */}
      {selectedAlert && (
        <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 border-t border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h4 className="font-semibold text-gray-900">{selectedAlert.title}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${severityColors[selectedAlert.severity]}`}>
                  {selectedAlert.severity.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{selectedAlert.timestamp}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>{selectedAlert.affected.toLocaleString()} affected</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedAlert(null)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
