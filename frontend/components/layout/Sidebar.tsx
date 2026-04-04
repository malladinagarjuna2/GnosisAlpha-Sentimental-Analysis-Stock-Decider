'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  TrendingUp,
  Bell,
  Settings,
  GitBranch,
  FlaskConical,
  Bot,
  UserCog,
  Sparkles,
  Briefcase,
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
  {
    label: 'Portfolio',
    href: '/dashboard/portfolio',
    icon: Briefcase,
  },
];

const intelligenceItems = [
  {
    label: 'Backtest',
    href: '/dashboard/backtest',
    icon: FlaskConical,
    badge: 'NEW',
  },
  {
    label: 'AI Strategies',
    href: '/dashboard/strategies',
    icon: Sparkles,
    badge: 'AI',
  },
  {
    label: 'Agents',
    href: '/dashboard/agents',
    icon: Bot,
  },
];

const settingsItems = [
  {
    label: 'Profile',
    href: '/dashboard/profile',
    icon: UserCog,
  },
  {
    label: 'Strategy Config',
    href: '/dashboard/settings/strategy',
    icon: Settings,
  },
  {
    label: 'Channels',
    href: '/dashboard/settings/channels',
    icon: Settings,
  },
];

export const Sidebar = () => {
  const pathname = usePathname();

  const renderLink = (item: { label: string; href: string; icon: any; badge?: string }) => {
    const Icon = item.icon;
    const isActive =
      item.href === '/dashboard'
        ? pathname === '/dashboard'
        : pathname === item.href || pathname.startsWith(item.href + '/');

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-accent text-accent-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-card/50 hover:translate-x-0.5'
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="flex-1">{item.label}</span>
        {item.badge && (
          <span className={cn(
            'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
            item.badge === 'NEW'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-violet-500/20 text-violet-400'
          )}>
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className="w-64 border-r border-border/20 bg-card/30 backdrop-blur-sm h-[calc(100vh-4rem)] overflow-y-auto flex flex-col">
      <nav className="p-4 space-y-1 flex-1">
        {navItems.map(renderLink)}

        {/* Intelligence Section */}
        <div className="pt-4">
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground/60 px-4 py-2 uppercase">
            Intelligence
          </p>
          <div className="space-y-1">
            {intelligenceItems.map(renderLink)}
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-border/20 space-y-1">
        <p className="text-[10px] font-bold tracking-widest text-muted-foreground/60 px-4 py-2 uppercase">
          Settings
        </p>
        {settingsItems.map(renderLink)}
      </div>
    </aside>
  );
};
