'use client';

import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let subscription: any = null;
    let initTimeout: ReturnType<typeof setTimeout> | null = null;
    
    // If Supabase is not configured, don't try to initialize auth
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your_supabase_project_url_here' || supabaseKey === 'your_supabase_anon_key_here') {
      setLoading(false);
      return () => { 
        mounted = false; 
      };
    }
    
    // Get initial session
    // Add a safety timeout so auth won't hang indefinitely if the client/network stalls.
    initTimeout = setTimeout(() => {
      if (!mounted) return;
      console.warn('Auth initialization timed out');
      setError((prev) => prev ?? 'Auth initialization timed out');
      setLoading(false);
    }, 6000);

    supabase.auth.getSession().then((result: any) => {
      const session = result.data?.session as any;
      const error = (result as any).error;
      if (!mounted) return;
      if (initTimeout) {
        clearTimeout(initTimeout);
        initTimeout = null;
      }

      if (error) {
        console.error('Auth session error:', error);
        setError(error.message);
        setLoading(false);
        return;
      }

      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch((err: any) => {
      if (!mounted) return;
      if (initTimeout) {
        clearTimeout(initTimeout);
        initTimeout = null;
      }
      console.error('Auth initialization error:', err);
      setError('Failed to initialize authentication');
      setLoading(false);
    });

    // Listen for auth changes
    const authListener = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        let ok = false;
        for (let i = 0; i < 2; i++) {
          ok = await fetchProfile(session.user.id);
          if (ok) break;
          await new Promise(r => setTimeout(r, 500));
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    
    subscription = authListener.data.subscription;

    return () => { 
      mounted = false; 
      if (subscription) {
        subscription.unsubscribe();
      }
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      // Wrap profile fetch in a timeout so it can't hang indefinitely
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        // use maybeSingle() to avoid a 406/error when no rows are returned
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      );

      // Race the fetch against the timeout
      const res: any = await Promise.race([fetchPromise, timeoutPromise]);
      const { data, error } = res || {};

      if (error) {
        console.error('Error fetching profile:', error);
        return false;
      }

      setProfile(data);
      return true;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (data.user && !error) {
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: data.user.id,
            email: data.user.email!,
            full_name: fullName,
            role: 'client',
          },
        ]);

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }
    }

    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    return { data, error };
  };

  return {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    isAdmin: profile?.role === 'admin',
    isClient: profile?.role === 'client',
  };
}