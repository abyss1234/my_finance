'use client';

import { usePathname } from 'next/navigation';
import AutoLogout from '@/components/AutoLogout';
import Sidebar from '@/components/Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';

  if (isLogin) {
    return <div className="flex flex-1 justify-center">{children}</div>;
  }

  return (
    <>
      <AutoLogout />
      <div className="grid flex-1 gap-6 md:grid-cols-[14rem_1fr]">
        <Sidebar />
        <div className="min-w-0 space-y-6">{children}</div>
      </div>
    </>
  );
}
