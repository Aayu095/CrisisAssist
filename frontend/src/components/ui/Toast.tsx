'use client';

import { CheckCircle, AlertCircle, XCircle, Info, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

export function Toast({ id, type, title, message, duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info
  };

  const styles = {
    success: {
      container: 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-800',
      icon: 'text-green-600',
      progress: 'bg-green-500'
    },
    error: {
      container: 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200 text-red-800',
      icon: 'text-red-600',
      progress: 'bg-red-500'
    },
    warning: {
      container: 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 text-yellow-800',
      icon: 'text-yellow-600',
      progress: 'bg-yellow-500'
    },
    info: {
      container: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-800',
      icon: 'text-blue-600',
      progress: 'bg-blue-500'
    }
  };

  const Icon = icons[type];
  const style = styles[type];

  return (
    <div
      className={cn(
        'relative max-w-sm w-full border rounded-xl shadow-lg backdrop-blur-sm transform transition-all duration-300 ease-out overflow-hidden',
        style.container,
        isVisible && !isExiting ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'
      )}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={cn('h-5 w-5', style.icon)} />
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-semibold">{title}</p>
            {message && (
              <p className="mt-1 text-sm opacity-90">{message}</p>
            )}
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleClose}
              className="inline-flex text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
        <div 
          className={cn('h-full transition-all duration-linear', style.progress)}
          style={{ 
            animation: `shrink ${duration}ms linear forwards`,
            transformOrigin: 'left'
          }}
        />
      </div>
      
      <style jsx>{`
        @keyframes shrink {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Array<{
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
  }>;
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          duration={toast.duration}
          onClose={onClose}
        />
      ))}
    </div>
  );
}
