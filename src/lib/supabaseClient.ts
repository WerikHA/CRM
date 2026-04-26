import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  if (typeof window !== 'undefined' && (window as any)._env_) {
    return (window as any)._env_[key];
  }
  return process.env[key] || '';
};

let supabaseUrl = (getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL') || '').trim();
let supabaseAnonKey = (getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY') || '').trim();
let supabaseServiceRoleKey = (getEnv('SUPABASE_SERVICE_ROLE_KEY') || '').trim();

// Use Service Role Key for server-side operations if available, fallback to Anon Key
const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;

// Sanitize URL: many users type .com instead of .co for supabase
// Also ensuring it has https://
if (supabaseUrl) {
  if (!supabaseUrl.startsWith('http')) {
    supabaseUrl = `https://${supabaseUrl}`;
  }
  if (supabaseUrl.includes('supabase.com')) {
    console.warn(`[Supabase] URL detected with .com: ${supabaseUrl}. Correcting to .co`);
    supabaseUrl = supabaseUrl.replace('supabase.com', 'supabase.co');
  }
  console.log(`[Supabase] Initializing with URL: ${supabaseUrl}`);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('[Supabase] CRITICAL: SUPABASE_URL or SUPABASE_ANON_KEY (or SERVICE_ROLE_KEY) missing in environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
