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
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full border-2 border-white/20 border-t-gold h-10 w-10" />
          </div>
        </div>
      )}> 
        <ClientAuthGate>{children}</ClientAuthGate>
      </Suspense>
    </AppShell>
  );
}