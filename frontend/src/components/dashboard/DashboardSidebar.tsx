'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  Users, 
  FileText, 
  Settings, 
  Zap,
  Menu,
  X
} from 'lucide-react';
import { clsx } from 'clsx';

const navigation = [
  { name: 'Home', href: '/', icon: Shield },
  { name: 'Dashboard', href: '/dashboard', icon: Activity },
  { name: 'Simulator', href: '/dashboard/simulator', icon: Zap },
  { name: 'Agents', href: '/dashboard/agents', icon: Users },
  { name: 'Audit Logs', href: '/dashboard/audit', icon: FileText },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          type="button"
          className="bg-white p-2 rounded-lg shadow-lg border"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6 text-gray-600" />
          ) : (
            <Menu className="h-6 w-6 text-gray-600" />
          )}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={clsx(
        'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0',
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center px-6 py-4 border-b">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-bold text-gray-900">CrisisAssist</h1>
              <p className="text-xs text-gray-500">Emergency Response</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                    isActive
                      ? 'bg-primary-100 text-primary-700 border border-primary-200'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className={clsx(
                    'mr-3 h-5 w-5',
                    isActive ? 'text-primary-600' : 'text-gray-400'
                  )} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Status indicator */}
          <div className="px-4 py-4 border-t">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="ml-2 text-sm font-medium text-green-800">
                  All Systems Operational
                </span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                4 agents active • Last check: now
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-4 border-t">
            <div className="text-center">
              <p className="text-xs text-gray-500">
                CrisisAssist v1.0
              </p>
              <p className="text-xs text-gray-400">
                AI-Powered Emergency Response
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}