'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/categories', label: 'Categories' },
  { href: '/receipts', label: 'Phone Receipts' },
  { href: '/analysis', label: 'Analysis' },
];

const NavItem = ({ href, label, pathname }: { href: string; label: string; pathname: string }) => {
  const active = href === '/' ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
        active
          ? 'bg-zinc-950 text-white shadow-sm'
          : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950'
      }`}
    >
      {label}
    </Link>
  );
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <aside className="sticky top-5 h-fit w-full rounded-lg border border-zinc-200 bg-white p-3 shadow-sm md:w-56">
      <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Menu
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => (
          <NavItem key={item.href} href={item.href} label={item.label} pathname={pathname} />
        ))}
      </nav>
      <button className="mt-4 w-full text-left text-sm font-medium text-zinc-500 hover:text-zinc-950" onClick={logout}>
        Logout
      </button>
    </aside>
  );
}
