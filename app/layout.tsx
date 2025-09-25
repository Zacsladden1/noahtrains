import './globals.css';
import type { Metadata } from 'next';
import { Cinzel, Cormorant_Garamond } from 'next/font/google';
import nextDynamic from 'next/dynamic';

const ChunkErrorReload = nextDynamic(() => import('@/components/system/chunk-error-reload'), { ssr: false });

// Avoid serving stale HTML that references old chunks
export const dynamicMode = 'force-dynamic';
export const revalidate = 0;

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-heading',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Noahhtrains - Premium Fitness Coaching',
  description: 'Professional fitness coaching and nutrition tracking platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${cinzel.variable} ${cormorant.variable}`}>
      <head>
        <link
          rel="icon"
          href={`data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='0.9em' font-size='90'>🏋️</text></svg>`}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        {children}
        <ChunkErrorReload />
      </body>
    </html>
  );
}