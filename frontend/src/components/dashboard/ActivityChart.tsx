'use client';

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

// Mock data for the chart
const data = [
  { time: '00:00', alerts: 2, events: 1, notifications: 5, verifications: 3 },
  { time: '04:00', alerts: 1, events: 0, notifications: 2, verifications: 1 },
  { time: '08:00', alerts: 5, events: 3, notifications: 12, verifications: 8 },
  { time: '12:00', alerts: 8, events: 5, notifications: 20, verifications: 15 },
  { time: '16:00', alerts: 6, events: 4, notifications: 18, verifications: 12 },
  { time: '20:00', alerts: 3, events: 2, notifications: 8, verifications: 6 },
];

export function ActivityChart() {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="alerts" 
            stroke="#ef4444" 
            strokeWidth={2}
            dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
            name="Alerts"
          />
          <Line 
            type="monotone" 
            dataKey="events" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            name="Events"
          />
          <Line 
            type="monotone" 
            dataKey="notifications" 
            stroke="#22c55e" 
            strokeWidth={2}
            dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
            name="Notifications"
          />
          <Line 
            type="monotone" 
            dataKey="verifications" 
            stroke="#8b5cf6" 
            strokeWidth={2}
            dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
            name="Verifications"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}