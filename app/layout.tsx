import './globals.css';
import type { Metadata } from 'next';
import { Cinzel, Cormorant_Garamond } from 'next/font/google';
import ChunkErrorReload from '@/components/system/chunk-error-reload';
import DevSWCleaner from '@/components/system/dev-sw-cleaner';
import IOSPWABanner from '@/components/system/ios-pwa-banner';

// Avoid serving stale HTML that references old chunks
export const dynamic = 'force-dynamic';
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
          href="/no%20backround%20high%20quality%20logo%202.png"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="Noahhtrains" />
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
        {!isProd && <DevSWCleaner />}
        <IOSPWABanner />
        {isProd && <ChunkErrorReload />}
      </body>
    </html>
  );
}