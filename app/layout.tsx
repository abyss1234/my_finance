import './globals.css';
import AppShell from '@/components/AppShell';

export const metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || 'Simple Finance',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-100 text-zinc-900 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
