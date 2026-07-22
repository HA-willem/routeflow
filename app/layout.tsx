import { Inter } from 'next/font/google';

import { ThemeProvider } from '@/components/composed/ThemeProvider';
import { Toaster } from '@/components/primitives/sonner';
import { buildThemeInitScript } from '@/lib/theme/constants';

import type { Metadata } from 'next';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ServOps',
  description: 'ServOps plant, rijdt en factureert je terugkerende klussen — automatisch.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={inter.variable} suppressHydrationWarning>
      <head>
        {/*
          Anti-flits: zet data-theme vóór de eerste paint/hydratie, zodat er
          nooit kort het verkeerde thema zichtbaar is (25_DesignSystem.md § 7).
          suppressHydrationWarning op <html> hierboven dekt het feit dat dit
          attribuut op de server nog niet bestaat.
        */}
        <script dangerouslySetInnerHTML={{ __html: buildThemeInitScript() }} />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
