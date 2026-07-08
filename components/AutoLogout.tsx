'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { sessionMaxAgeSeconds } from '@/lib/session';

const activityEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];

export default function AutoLogout() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === '/login') return;

    let lastActivity = Date.now();
    let timeoutId: number;

    async function logout() {
      await fetch('/api/logout', { method: 'POST' }).catch(() => null);
      router.replace('/login');
      router.refresh();
    }

    function schedule() {
      window.clearTimeout(timeoutId);
      const remainingMs = Math.max(0, sessionMaxAgeSeconds * 1000 - (Date.now() - lastActivity));
      timeoutId = window.setTimeout(logout, remainingMs);
    }

    function recordActivity() {
      lastActivity = Date.now();
      schedule();
    }

    function checkVisibility() {
      if (document.visibilityState === 'visible' && Date.now() - lastActivity >= sessionMaxAgeSeconds * 1000) {
        void logout();
      }
    }

    activityEvents.forEach((event) => window.addEventListener(event, recordActivity, { passive: true }));
    document.addEventListener('visibilitychange', checkVisibility);
    schedule();

    return () => {
      window.clearTimeout(timeoutId);
      activityEvents.forEach((event) => window.removeEventListener(event, recordActivity));
      document.removeEventListener('visibilitychange', checkVisibility);
    };
  }, [pathname, router]);

  return null;
}
