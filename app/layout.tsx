import type { Metadata, Viewport } from 'next';
import '@/styles/global.css';
import BottomTabBar from '@/components/layout/BottomTabBar';

export const metadata: Metadata = {
  title: 'QuatTrak',
  description: 'Kumquat volleyball match tracker',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
        <BottomTabBar />
      </body>
    </html>
  );
}
