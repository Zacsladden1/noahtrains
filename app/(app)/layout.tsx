import { AppShell } from '@/components/layout/app-shell';
import ClientAuthGate from './client-auth-gate';
import { Suspense } from 'react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Render a stable server component tree; gate auth on the client to avoid hydration mismatch
  return (
    <AppShell>
      <Suspense fallback={(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
          {/* Splash logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/no%20backround%20high%20quality%20logo%202.png" alt="Logo" className="h-20 w-auto drop-shadow-[0_0_30px_rgba(205,167,56,0.2)]" />
        </div>
      )}> 
        <ClientAuthGate>{children}</ClientAuthGate>
      </Suspense>
    </AppShell>
  );
}