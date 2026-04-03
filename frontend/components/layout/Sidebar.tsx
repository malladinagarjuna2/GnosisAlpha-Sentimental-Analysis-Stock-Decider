'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  TrendingUp,
  Bell,
  Settings,
  GitBranch,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3,
  },
  {
    label: 'Assets',
    href: '/dashboard/assets',
    icon: TrendingUp,
  },
  {
    label: 'Posts',
    href: '/dashboard/posts',
    icon: GitBranch,
  },
  {
    label: 'Alerts',
    href: '/dashboard/alerts',
    icon: Bell,
  },
];

const settingsItems = [
  {
    label: 'Strategy',
    href: '/dashboard/settings/strategy',
  },
  {
    label: 'Channels',
    href: '/dashboard/settings/channels',
  },
];

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border/20 bg-card/30 backdrop-blur-sm h-[calc(100vh-4rem)] overflow-y-auto flex flex-col">
      <nav className="p-4 space-y-2 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/20 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground px-4 py-2">SETTINGS</p>
        {settingsItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
              )}
            >
              <Settings className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
};
