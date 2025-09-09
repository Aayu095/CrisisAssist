'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, TrendingUp, Zap } from 'lucide-react';

interface ChartData {
  time: string;
  alerts: number;
  responses: number;
  agents: number;
}

export function RealTimeChart() {
  const [data, setData] = useState<ChartData[]>([
    { time: '00:00', alerts: 12, responses: 10, agents: 4 },
    { time: '04:00', alerts: 8, responses: 8, agents: 4 },
    { time: '08:00', alerts: 15, responses: 14, agents: 4 },
    { time: '12:00', alerts: 23, responses: 22, agents: 4 },
    { time: '16:00', alerts: 18, responses: 17, agents: 4 },
    { time: '20:00', alerts: 31, responses: 29, agents: 4 },
    { time: 'Now', alerts: 27, responses: 25, agents: 4 }
  ]);

  const [activeMetric, setActiveMetric] = useState<'alerts' | 'responses' | 'agents'>('alerts');

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setData(prevData => {
        const newData = [...prevData];
        const lastPoint = newData[newData.length - 1];
        
        // Update the "Now" data point with slight variations
        newData[newData.length - 1] = {
          ...lastPoint,
          alerts: Math.max(0, lastPoint.alerts + Math.floor(Math.random() * 6) - 3),
          responses: Math.max(0, lastPoint.responses + Math.floor(Math.random() * 4) - 2),
          agents: 4 // Keep agents constant
        };
        
        return newData;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const metrics = [
    {
      key: 'alerts' as const,
      label: 'Active Alerts',
      icon: Activity,
      color: '#ef4444',
      gradient: 'from-red-400 to-red-600'
    },
    {
      key: 'responses' as const,
      label: 'Responses',
      icon: Zap,
      color: '#3b82f6',
      gradient: 'from-blue-400 to-blue-600'
    },
    {
      key: 'agents' as const,
      label: 'Active Agents',
      icon: TrendingUp,
      color: '#10b981',
      gradient: 'from-green-400 to-green-600'
    }
  ];

  const currentValue = data[data.length - 1]?.[activeMetric] || 0;
  const previousValue = data[data.length - 2]?.[activeMetric] || 0;
  const change = currentValue - previousValue;
  const changePercent = previousValue > 0 ? ((change / previousValue) * 100).toFixed(1) : '0';

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Real-Time System Activity</h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-500">Live</span>
        </div>
      </div>

      {/* Metric selector */}
      <div className="flex space-x-2 mb-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const isActive = activeMetric === metric.key;
          
          return (
            <button
              key={metric.key}
              onClick={() => setActiveMetric(metric.key)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                isActive
                  ? `bg-gradient-to-r ${metric.gradient} text-white shadow-lg transform scale-105`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium">{metric.label}</span>
            </button>
          );
        })}
      </div>

      {/* Current value display */}
      <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-gray-900 font-mono">
              {currentValue}
            </div>
            <div className="text-sm text-gray-600">
              Current {metrics.find(m => m.key === activeMetric)?.label}
            </div>
          </div>
          <div className={`text-right ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <div className="text-lg font-semibold">
              {change >= 0 ? '+' : ''}{change}
            </div>
            <div className="text-sm">
              {change >= 0 ? '+' : ''}{changePercent}%
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={metrics.find(m => m.key === activeMetric)?.color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={metrics.find(m => m.key === activeMetric)?.color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="time" 
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '12px'
              }}
            />
            <Area
              type="monotone"
              dataKey={activeMetric}
              stroke={metrics.find(m => m.key === activeMetric)?.color}
              strokeWidth={3}
              fill="url(#colorGradient)"
              dot={{ fill: metrics.find(m => m.key === activeMetric)?.color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: metrics.find(m => m.key === activeMetric)?.color, strokeWidth: 2, fill: 'white' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Performance indicators */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-lg font-bold text-green-600">98.7%</div>
          <div className="text-xs text-green-700">Uptime</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-lg font-bold text-blue-600">2.1s</div>
          <div className="text-xs text-blue-700">Avg Response</div>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-lg font-bold text-purple-600">4/4</div>
          <div className="text-xs text-purple-700">Agents Online</div>
        </div>
      </div>
    </div>
  );
}
