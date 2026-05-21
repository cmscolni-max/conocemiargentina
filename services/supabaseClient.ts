import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAuthUrl = import.meta.env.VITE_SUPABASE_AUTH_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const resolvedSupabaseUrl = supabaseAuthUrl || supabaseUrl;

if (!resolvedSupabaseUrl || !supabaseAnonKey) {
  console.error('Faltan variables de entorno de Supabase en .env.local');
}

export const supabase = createClient(
  resolvedSupabaseUrl || 'https://example.supabase.co',
  supabaseAnonKey || 'public-anon-key',
  {
    auth: {
      storageKey: 'cumbre-auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  }
);

export const adminSupabase = createClient(
  resolvedSupabaseUrl || 'https://example.supabase.co',
  supabaseAnonKey || 'public-anon-key',
  {
    auth: {
      storageKey: 'cumbre-admin-auth',
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export const createIsolatedSupabaseClient = (storageKey: string) =>
  createClient(
    resolvedSupabaseUrl || 'https://example.supabase.co',
    supabaseAnonKey || 'public-anon-key',
    {
      auth: {
        storageKey,
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

export const publicSupabase = createIsolatedSupabaseClient('cumbre-public');
