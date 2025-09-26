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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="animate-spin rounded-full border-2 border-gold/40 border-t-gold h-12 w-12" />
        </div>
      )}> 
        <ClientAuthGate>{children}</ClientAuthGate>
      </Suspense>
    </AppShell>
  );
}