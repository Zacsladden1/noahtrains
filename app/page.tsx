'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { AuthForm } from '@/components/auth/auth-form';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, ExternalLink } from 'lucide-react';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(url && key && url !== 'your_supabase_project_url_here' && key !== 'your_supabase_anon_key_here' && url.startsWith('http'));
};

function SupabaseSetupInstructions() {
  return (
    <div className="min-h-screen bg-black flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl mx-auto">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <Database className="w-16 h-16 text-gold mx-auto mb-4" />
          <h1 className="text-4xl font-heading text-white mb-2">Noahhtrains</h1>
          <p className="text-white/70">Premium Fitness Coaching</p>
        </div>

      <Card className="bg-black border border-white/10 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-heading text-white">Setup Required</CardTitle>
          <CardDescription>
            <span className="text-white/70">Configure your Supabase project to get started</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 px-6">
          <Alert className="bg-gold/10 border-gold/50">
            <Database className="h-4 w-4" />
            <AlertDescription className="text-gold">
              Since this is a Next.js project, you&apos;ll need to manually configure your Supabase credentials.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="border border-white/10 rounded-lg p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-white">
                <span className="w-6 h-6 bg-gold text-black rounded-full flex items-center justify-center text-sm font-bold">1</span>
                Create Supabase Project
              </h3>
              <p className="text-sm text-white/70 mb-3">
                Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline inline-flex items-center gap-1">
                  Supabase Dashboard <ExternalLink className="w-3 h-3" />
                </a> and create a new project.
              </p>
              <ul className="text-xs text-white/60 space-y-1 ml-4">
                <li>• Click &quot;New Project&quot;</li>
                <li>• Name it &quot;noahhtrains-fitness&quot;</li>
                <li>• Choose your region</li>
                <li>• Set a strong database password</li>
              </ul>
            </div>

            <div className="border border-white/10 rounded-lg p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-white">
                <span className="w-6 h-6 bg-gold text-black rounded-full flex items-center justify-center text-sm font-bold">2</span>
                Get API Credentials
              </h3>
              <p className="text-sm text-white/70 mb-3">
                In your Supabase project, go to Settings → API to find:
              </p>
              <ul className="text-xs text-white/60 space-y-1 ml-4">
                <li>• <strong>Project URL</strong> (starts with https://)</li>
                <li>• <strong>Anon/Public Key</strong> (long JWT token)</li>
              </ul>
            </div>

            <div className="border border-white/10 rounded-lg p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-white">
                <span className="w-6 h-6 bg-gold text-black rounded-full flex items-center justify-center text-sm font-bold">3</span>
                Update Environment Variables
              </h3>
              <p className="text-sm text-white/70 mb-3">
                Replace the placeholder values in your <code className="bg-white/10 px-2 py-1 rounded text-gold">.env.local</code> file:
              </p>
              <pre className="bg-white/5 p-4 rounded text-xs overflow-x-auto text-white/80 border border-white/10">
{`NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`}
              </pre>
            </div>

            <div className="border border-white/10 rounded-lg p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-white">
                <span className="w-6 h-6 bg-gold text-black rounded-full flex items-center justify-center text-sm font-bold">4</span>
                Run Database Migrations
              </h3>
              <p className="text-sm text-white/70 mb-3">
                In your Supabase SQL Editor, run the migrations:
              </p>
              <ul className="text-xs text-white/60 space-y-1 ml-4">
                <li>• Copy content from <code className="text-gold">supabase/migrations/20250925083255_ancient_smoke.sql</code></li>
                <li>• Run it in SQL Editor</li>
                <li>• Then run <code className="text-gold">supabase/migrations/20250925083403_velvet_prism.sql</code></li>
              </ul>
            </div>

            <div className="border border-white/10 rounded-lg p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-white">
                <span className="w-6 h-6 bg-gold text-black rounded-full flex items-center justify-center text-sm font-bold">5</span>
                Restart Development Server
              </h3>
              <p className="text-sm text-white/70">
                After updating the environment variables, restart your development server for the changes to take effect.
              </p>
            </div>
          </div>

          <Alert className="bg-gold/10 border-gold/50">
            <AlertDescription className="text-gold">
              Once configured, refresh this page and you&apos;ll see the authentication interface.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default function HomePage() {
  const { user, loading, error } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authStalled, setAuthStalled] = useState(false);
  const [showSetup, setShowSetup] = useState(() => !isSupabaseConfigured());
  // removed showDebug state

  useEffect(() => {
    setMounted(true);
  }, []);

  // If auth loading/mounting stalls, show the auth form as a fallback after 3s
  useEffect(() => {
    const t = setTimeout(() => {
      setAuthStalled(true);
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (user && !loading && mounted) {
      const url = `/dashboard?v=${Date.now()}`;
      if (typeof window !== 'undefined') {
        window.location.replace(url);
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, loading, mounted, router]);

  // Show setup page if Supabase isn't configured
  if (showSetup) {
    return <SupabaseSetupInstructions />;
  }

  if (!mounted && !authStalled) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show loading only if we're actually loading auth state and fallback hasn't kicked in
  if (loading && !authStalled) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If there's an auth error, show a message but still allow access to auth form
  if (error && authStalled) {
    return (
      <>
        <div className="w-full flex justify-center mt-10 mb-6">
          <img
            src="/no%20backround%20high%20quality%20logo%202.png"
            alt="Noahhtrains"
            className="h-14 w-auto drop-shadow-[0_0_20px_rgba(205,167,56,0.25)]"
          />
        </div>
        <AuthForm />
        <div className="fixed top-4 left-4 max-w-sm">
          <Alert className="bg-red-500/10 border-red-500/50">
            <AlertDescription className="text-red-400">
              Authentication error: {error}
              <br />
              <button
                onClick={() => window.location.reload()}
                className="text-gold hover:underline mt-1"
              >
                Try refreshing the page
              </button>
            </AlertDescription>
          </Alert>
        </div>
      </>
    );
  }

  if (user) {
    return null; // Redirecting
  }

  return (
    <>
      <AuthForm />
    </>
  );
}