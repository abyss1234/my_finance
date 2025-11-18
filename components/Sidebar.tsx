'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NavItem = ({ href, label }: { href: string; label: string }) => {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`block rounded-md px-3 py-2 text-sm ${
        active
          ? 'bg-zinc-900 text-white'
          : 'text-zinc-700 hover:bg-zinc-100'
      }`}
    >
      {label}
    </Link>
  );
};

export default function Sidebar() {
  return (
    <aside className="sticky top-6 h-fit w-full rounded-lg border border-zinc-200 bg-white p-3 shadow-sm md:w-56">
      <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Menu
      </div>
      <nav className="space-y-1">
        <NavItem href="/" label="Home" />
        <NavItem href="/transactions" label="Transactions" />
      </nav>
    </aside>
  );
}
