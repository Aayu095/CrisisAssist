'use client';

import { Plus, Zap, AlertTriangle, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface FloatingActionButtonProps {
  onAction: (action: string) => void;
}

export function FloatingActionButton({ onAction }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    {
      id: 'emergency',
      icon: AlertTriangle,
      label: 'Emergency Alert',
      color: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
      delay: 'animation-delay-100'
    },
    {
      id: 'quick-response',
      icon: Zap,
      label: 'Quick Response',
      color: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
      delay: 'animation-delay-200'
    },
    {
      id: 'broadcast',
      icon: MessageSquare,
      label: 'Broadcast Message',
      color: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
      delay: 'animation-delay-300'
    }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Action buttons */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 space-y-3">
          {actions.map((action, index) => (
            <div
              key={action.id}
              className={cn(
                "transform transition-all duration-300 ease-out",
                isOpen ? "translate-y-0 opacity-100 scale-100" : "translate-y-4 opacity-0 scale-95",
                action.delay
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <button
                onClick={() => {
                  onAction(action.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-full text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group",
                  action.color
                )}
              >
                <action.icon className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                <span className="text-sm font-medium whitespace-nowrap">{action.label}</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center group relative overflow-hidden",
          isOpen && "rotate-45"
        )}
      >
        <div className="absolute inset-0 bg-white/20 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300"></div>
        <Plus className="h-6 w-6 relative z-10 transition-transform duration-300" />
        
        {/* Pulse effect */}
        <div className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-20"></div>
      </button>
    </div>
  );
}
