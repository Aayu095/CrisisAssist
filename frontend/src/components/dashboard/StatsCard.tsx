'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface StatsCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  color?: 'red' | 'blue' | 'green' | 'orange' | 'purple';
}

export function StatsCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon: Icon,
  color = 'blue'
}: StatsCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [animatedValue, setAnimatedValue] = useState('0');

  useEffect(() => {
    setIsVisible(true);
    // Animate number counting
    const numericValue = parseInt(value.replace(/[^\d]/g, ''));
    if (!isNaN(numericValue)) {
      let current = 0;
      const increment = numericValue / 30;
      const timer = setInterval(() => {
        current += increment;
        if (current >= numericValue) {
          setAnimatedValue(value);
          clearInterval(timer);
        } else {
          setAnimatedValue(Math.floor(current).toString() + value.replace(/\d/g, '').slice(-1));
        }
      }, 50);
      return () => clearInterval(timer);
    } else {
      setAnimatedValue(value);
    }
  }, [value]);

  const colorClasses = {
    red: 'bg-gradient-to-br from-red-50 to-red-100 text-red-600 border-red-200',
    blue: 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 border-blue-200',
    green: 'bg-gradient-to-br from-green-50 to-green-100 text-green-600 border-green-200',
    orange: 'bg-gradient-to-br from-orange-50 to-orange-100 text-orange-600 border-orange-200',
    purple: 'bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600 border-purple-200'
  };

  const changeClasses = {
    positive: 'text-green-600 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200',
    negative: 'text-red-600 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200',
    neutral: 'text-gray-600 bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200'
  };

  const iconColorClasses = {
    red: 'bg-gradient-to-br from-red-400 to-red-600 text-white shadow-red-200',
    blue: 'bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-blue-200',
    green: 'bg-gradient-to-br from-green-400 to-green-600 text-white shadow-green-200',
    orange: 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-orange-200',
    purple: 'bg-gradient-to-br from-purple-400 to-purple-600 text-white shadow-purple-200'
  };

  return (
    <div className={cn(
      "bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-500 transform hover:scale-105 group relative overflow-hidden",
      isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
    )}>
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <div className="flex items-center justify-between relative z-10">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2 group-hover:text-gray-700 transition-colors">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-2 font-mono tracking-tight">{animatedValue}</p>
          {change && (
            <div className={cn(
              'text-xs px-3 py-1.5 rounded-full inline-flex items-center font-medium shadow-sm',
              changeClasses[changeType]
            )}>
              <div className={cn(
                "w-1.5 h-1.5 rounded-full mr-2 animate-pulse",
                changeType === 'positive' ? 'bg-green-500' : 
                changeType === 'negative' ? 'bg-red-500' : 'bg-gray-500'
              )}></div>
              {change}
            </div>
          )}
        </div>
        <div className={cn(
          'w-14 h-14 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300 relative',
          iconColorClasses[color]
        )}>
          <Icon className="h-7 w-7 group-hover:rotate-12 transition-transform duration-300" />
          <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>
      </div>

      {/* Pulse effect for real-time data */}
      <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg"></div>
    </div>
  );
}