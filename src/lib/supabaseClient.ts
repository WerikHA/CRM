import { createClient } from '@supabase/supabase-js';
import { storageService } from './storage.ts';

const getEnv = (key: string) => {
  if (typeof window !== 'undefined' && (window as any)._env_ && (window as any)._env_[key]) {
    return (window as any)._env_[key];
  }
  if (key === 'VITE_SUPABASE_URL' && typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_SUPABASE_URL;
  }
  if (key === 'VITE_SUPABASE_ANON_KEY' && typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_SUPABASE_ANON_KEY;
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || '';
  }
  return '';
};

let supabaseUrl = (getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL') || '').trim();
let supabaseAnonKey = (getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY') || '').trim();
let supabaseServiceRoleKey = '';

// Only access Service Role Key on the server (Node.js environment)
if (typeof window === 'undefined') {
  supabaseServiceRoleKey = (getEnv('SUPABASE_SERVICE_ROLE_KEY') || '').trim();
}
export const isUsingServiceRole = !!supabaseServiceRoleKey;
if (typeof window === 'undefined') {
  console.log('[Supabase] Service Role Key detected:', isUsingServiceRole);
}

// Use Service Role Key for server-side operations if available, fallback to Anon Key
const supabaseKey = (typeof window === 'undefined' ? (supabaseServiceRoleKey || supabaseAnonKey) : supabaseAnonKey);

// Sanitize URL
if (supabaseUrl) {
  if (!supabaseUrl.startsWith('http')) {
    supabaseUrl = `https://${supabaseUrl}`;
  }
  if (supabaseUrl.includes('supabase.com')) {
    console.warn(`[Supabase] URL detected with .com: ${supabaseUrl}. Correcting to .co`);
    supabaseUrl = supabaseUrl.replace('supabase.com', 'supabase.co');
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error('[Supabase] CRITICAL: SUPABASE_URL or SUPABASE_ANON_KEY (or SERVICE_ROLE_KEY) missing in environment variables. Realtime and direct DB sync will NOT work.');
}

// Implementação de storage customizada para Supabase que respeita consentimento
const customSupabaseStorage = {
  getItem: (key: string) => storageService.getItem(key),
  setItem: (key: string, value: string) => storageService.setItem(key, value),
  removeItem: (key: string) => storageService.removeItem(key),
};

// Create a safe dummy client if keys are missing to avoid crashing the JS bundle
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: customSupabaseStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : ({
      channel: () => ({ on: () => ({ subscribe: () => ({}) }), unsubscribe: () => {} }),
      from: () => ({ select: () => ({ order: () => ({ limit: () => ({ data: [], error: null }) }) }), insert: () => ({}), update: () => ({}), delete: () => ({}) }),
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }), getSession: () => Promise.resolve({ data: { session: null }, error: null }) },
      removeChannel: () => {},
      removeAllChannels: () => {}
    } as any);
