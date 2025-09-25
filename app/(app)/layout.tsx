'use client';

import { useAuth } from '@/hooks/use-auth';
import { AppShell } from '@/components/layout/app-shell';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return null; // Redirecting
  }

  return <AppShell>{children}</AppShell>;
}