import './globals.css';
import type { Metadata } from 'next';
import { Cinzel, Cormorant_Garamond } from 'next/font/google';
import RuntimeExtras from '@/components/system/runtime-extras';

// Allow Next.js to determine the optimal rendering strategy per route

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-heading',
  display: 'swap',
  preload: false,
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
  preload: false,
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
  const isProd = process.env.NODE_ENV === 'production';
  return (
    <html lang="en" className={`dark ${cinzel.variable} ${cormorant.variable}`}>
      <head>
        <link
          rel="icon"
          href="/favicon.ico"
          type="image/x-icon"
        />
        <link
          rel="icon"
          href="/favicon.svg"
          type="image/svg+xml"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png?v=4"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="Noahhtrains" />
        <meta name="theme-color" content="#000000" />
        <link rel="manifest" href="/site.webmanifest" />
        {isProd && (
          // Early chunk error handler: registers before any client bundle executes (prod only)
          <script
            dangerouslySetInnerHTML={{
              __html: `(() => {
  const bust = () => {
    try { if ('caches' in window) { caches.keys().then(keys => keys.forEach(k => caches.delete(k))); } } catch {}
    const u = new URL(window.location.href);
    u.searchParams.set('v', Date.now().toString());
    window.location.replace(u.toString());
  };
  window.addEventListener('error', function (e) {
    const target = e.target || {};
    const src = target.src || '';
    const msg = (e.message || '') + '';
    if ((src && src.indexOf('/_next/static/chunks/') !== -1) || msg.indexOf('ChunkLoadError') !== -1 || msg.indexOf("reading 'call'") !== -1) {
      bust();
    }
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    var msg = '' + (e.reason && (e.reason.message || e.reason))
    if (msg.indexOf('ChunkLoadError') !== -1 || msg.indexOf("reading 'call'") !== -1) bust();
  });
})();`,
            }}
          />
        )}
      </head>
      <body className="min-h-screen bg-background text-foreground">
        {children}
        <RuntimeExtras />
      </body>
    </html>
  );
}