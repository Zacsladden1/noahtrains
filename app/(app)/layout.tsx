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
      <Suspense fallback={<div />}> 
        <ClientAuthGate>{children}</ClientAuthGate>
      </Suspense>
    </AppShell>
  );
}