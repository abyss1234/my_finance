'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  WalletCards,
  X,
} from 'lucide-react';
import AutoLogout from '@/components/AutoLogout';
import Sidebar from '@/components/Sidebar';

const sidebarPreferenceKey = 'finance-sidebar-collapsed';
const sidebarPreferenceEvent = 'finance-sidebar-preference';
const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Simple Finance';

function defaultsToCollapsed(pathname: string) {
  return pathname.startsWith('/transactions') || pathname.startsWith('/analysis');
}

function subscribeToSidebarPreference(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(sidebarPreferenceEvent, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(sidebarPreferenceEvent, callback);
  };
}

function getSidebarPreference() {
  return window.localStorage.getItem(sidebarPreferenceKey);
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/login';
  const [mobileOpen, setMobileOpen] = useState(false);
  const savedPreference = useSyncExternalStore(
    subscribeToSidebarPreference,
    getSidebarPreference,
    () => null
  );
  const sidebarPreference =
    savedPreference === 'true' ? true : savedPreference === 'false' ? false : null;
  const collapsed = sidebarPreference ?? defaultsToCollapsed(pathname);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileOpen(false);
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileOpen]);

  function toggleSidebar() {
    const next = !collapsed;
    window.localStorage.setItem(sidebarPreferenceKey, String(next));
    window.dispatchEvent(new Event(sidebarPreferenceEvent));
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  if (isLogin) {
    return (
      <div className="min-h-screen bg-zinc-100">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6">
            <Link
              href="/"
              prefetch={false}
              className="flex min-w-0 items-center gap-2 text-zinc-950"
            >
              <WalletCards className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="truncate text-base font-semibold">{appName}</span>
            </Link>
            <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-500">
              v1
            </span>
          </div>
        </header>
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1600px] px-4 py-6 sm:px-6">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <AutoLogout />

      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="flex h-16 items-center gap-2 px-3 sm:px-4">
          <button
            type="button"
            className="icon-btn lg:hidden"
            aria-label="Open navigation"
            aria-controls="mobile-navigation"
            aria-expanded={mobileOpen}
            title="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            className="icon-btn hidden lg:inline-flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={toggleSidebar}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

          <Link href="/" className="flex min-w-0 items-center gap-2 px-1 text-zinc-950">
            <WalletCards className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="truncate text-base font-semibold">{appName}</span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-500">
              v2
            </span>
            <button
              type="button"
              className="icon-btn"
              aria-label="Logout"
              title="Logout"
              onClick={logout}
            >
              <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)] min-w-0">
        <div className="sticky top-16 hidden h-[calc(100vh-4rem)] lg:block">
          <Sidebar pathname={pathname} collapsed={collapsed} onLogout={logout} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1600px] px-3 py-5 sm:px-5 lg:px-6 xl:px-8">
            {children}
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-950/40"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <div
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="relative flex h-full w-[min(18rem,calc(100vw-3rem))] flex-col bg-white shadow-xl"
          >
            <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-4">
              <div className="flex min-w-0 items-center gap-2">
                <WalletCards className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="truncate text-sm font-semibold">{appName}</span>
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close navigation"
                title="Close navigation"
                autoFocus
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <Sidebar
                pathname={pathname}
                mobile
                onNavigate={() => setMobileOpen(false)}
                onLogout={logout}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
