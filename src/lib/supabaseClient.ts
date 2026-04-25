import { createClient } from '@supabase/supabase-js';

let supabaseUrl = (process.env.SUPABASE_URL || '').trim();
let supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || '').trim();
let supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

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
