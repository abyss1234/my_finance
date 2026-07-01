import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || 'Simple Finance',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-zinc-100 text-zinc-900 antialiased">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-5 sm:px-6">
          <header className="mb-6 flex items-center justify-between border-b border-zinc-200 pb-4">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
              {process.env.NEXT_PUBLIC_APP_NAME || 'Simple Finance'}
            </h1>
            <div className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-600">
              v1
            </div>
          </header>

          <div className="grid flex-1 gap-6 md:grid-cols-[14rem_1fr]">
            <Sidebar />
            <div className="min-w-0 space-y-6">{children}</div>
          </div>

          <footer className="mt-10 border-t border-zinc-200 pt-4 text-center text-xs text-zinc-500">
            Built with Next.js + Prisma + Tailwind
          </footer>
        </div>
      </body>
    </html>
  );
}
