import './globals.css';
import type { Metadata } from 'next';
import { Cinzel, Cormorant_Garamond } from 'next/font/google';
import nextDynamic from 'next/dynamic';

const ChunkErrorReload = nextDynamic(() => import('@/components/system/chunk-error-reload'), { ssr: false });

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
  return (
    <html lang="en" className={`dark ${cinzel.variable} ${cormorant.variable}`}>
      <head>
        <link
          rel="icon"
          href="/favicon.svg"
          type="image/svg+xml"
        />
        <link
          rel="icon"
          href={`data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='0.9em' font-size='90'>🏋️</text></svg>`}
        />
        {/* Early chunk error handler: registers before any client bundle executes */}
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
    if ((src && src.indexOf('/_next/static/chunks/') !== -1) || msg.indexOf('ChunkLoadError') !== -1) {
      bust();
    }
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    var msg = '' + (e.reason && (e.reason.message || e.reason))
    if (msg.indexOf('ChunkLoadError') !== -1) bust();
  });
})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        {children}
        <ChunkErrorReload />
      </body>
    </html>
  );
}