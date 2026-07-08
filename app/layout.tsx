import { Inter } from 'next/font/google';

import { Toaster } from '@/components/primitives/sonner';

import type { Metadata } from 'next';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RouteFlow',
  description: 'RouteFlow plant, rijdt en factureert je terugkerende klussen — automatisch.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={inter.variable} suppressHydrationWarning>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
