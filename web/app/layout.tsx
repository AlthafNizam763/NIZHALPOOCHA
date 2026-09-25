import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@/styles/globals.css';
import { AppProviders } from '@/components/AppProviders';

export const metadata: Metadata = {
  title: 'Nizhalpoocha — Everyone looks human. Not everyone is.',
  description: 'A hidden-role multiplayer mystery set in the Kerala town of Kadalimukku on a rainy monsoon night.',
  applicationName: 'Nizhalpoocha',
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0e1512',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Baloo+Chettan+2:wght@500;700;800&family=Manrope:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="h-full">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
