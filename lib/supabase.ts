import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export let supabase: any;
export let createServerClient: any;

if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your_supabase_project_url_here' || supabaseKey === 'your_supabase_anon_key_here') {
  console.warn('Supabase not configured. Using placeholder client.');
  // Create a placeholder client that won't cause errors
  supabase = {
    auth: {
      getSession: () => {
        console.log('Placeholder getSession called');
        return Promise.resolve({ data: { session: null }, error: null });
      },
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      signUp: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      signOut: () => Promise.resolve({ error: null }),
      resetPasswordForEmail: () => Promise.resolve({ data: null, error: null }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      insert: () => Promise.resolve({ error: null }),
    }),
  };

  createServerClient = () => supabase;
} else {
  supabase = createClient<Database>(supabaseUrl, supabaseKey);
  
  createServerClient = () => {
    return createClient<Database>(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          persistSession: false,
        },
      }
    );
  };
}