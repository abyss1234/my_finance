'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ChartNoAxesCombined,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Smartphone,
  Tags,
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ReceiptText },
  { href: '/categories', label: 'Categories', icon: Tags },
  { href: '/receipts', label: 'Macro Logs', icon: Smartphone },
  { href: '/analysis', label: 'Analysis', icon: ChartNoAxesCombined },
];

type SidebarProps = {
  pathname: string;
  collapsed?: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
  onLogout: () => void;
};

function isActiveRoute(pathname: string, href: string) {
  return href === '/' ? pathname === href : pathname.startsWith(href);
}

export default function Sidebar({
  pathname,
  collapsed = false,
  mobile = false,
  onNavigate,
  onLogout,
}: SidebarProps) {
  const compact = collapsed && !mobile;

  return (
    <aside
      className={`flex h-full shrink-0 flex-col bg-white transition-[width] duration-200 motion-reduce:transition-none ${
        mobile ? 'w-full' : compact ? 'w-[68px] border-r border-zinc-200' : 'w-[220px] border-r border-zinc-200'
      }`}
    >
      <div className={`px-3 pb-2 pt-5 ${compact ? 'sr-only' : ''}`}>
        <div className="px-2 text-xs font-semibold uppercase text-zinc-500">Navigation</div>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-2" aria-label="Main navigation">
        {navItems.map((item) => {
          const active = isActiveRoute(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={compact ? item.label : undefined}
              aria-label={compact ? item.label : undefined}
              aria-current={active ? 'page' : undefined}
              onClick={onNavigate}
              className={`flex h-10 items-center rounded-md text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                compact ? 'justify-center px-0' : 'gap-3 px-3'
              } ${
                active
                  ? 'bg-zinc-950 text-white shadow-sm'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span className={compact ? 'sr-only' : 'truncate'}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-200 p-2">
        <button
          type="button"
          title={compact ? 'Logout' : undefined}
          aria-label={compact ? 'Logout' : undefined}
          onClick={onLogout}
          className={`flex h-10 w-full items-center rounded-md text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
            compact ? 'justify-center px-0' : 'gap-3 px-3'
          }`}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          <span className={compact ? 'sr-only' : ''}>Logout</span>
        </button>
      </div>
    </aside>
  );
}
