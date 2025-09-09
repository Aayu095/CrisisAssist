'use client';

import { Home, Activity, MapPin, Settings, Bell } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/dashboard',
      icon: Home,
      label: 'Dashboard',
      active: pathname === '/dashboard'
    },
    {
      href: '/dashboard/alerts',
      icon: Bell,
      label: 'Alerts',
      active: pathname === '/dashboard/alerts'
    },
    {
      href: '/dashboard/agents',
      icon: Activity,
      label: 'Agents',
      active: pathname === '/dashboard/agents'
    },
    {
      href: '/dashboard/map',
      icon: MapPin,
      label: 'Map',
      active: pathname === '/dashboard/map'
    },
    {
      href: '/dashboard/settings',
      icon: Settings,
      label: 'Settings',
      active: pathname === '/dashboard/settings'
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 px-4 py-2 md:hidden z-40">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200',
                item.active
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              <Icon className={cn(
                'h-5 w-5 transition-transform duration-200',
                item.active && 'scale-110'
              )} />
              <span className="text-xs font-medium">{item.label}</span>
              {item.active && (
                <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
