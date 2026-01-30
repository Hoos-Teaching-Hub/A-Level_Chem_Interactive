import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// Environment variables follow Supabase edge function conventions.
// We allow service role key when present for privileged access, otherwise fall
// back to the anon key for read-only operations.
const url = Deno.env.get("SUPABASE_URL");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!url) throw new Error("Missing SUPABASE_URL");
if (!anonKey && !serviceRoleKey) throw new Error("Missing Supabase API key");

// Supabase client configured for server-side usage (no session persistence).
export const supabase = createClient(url, serviceRoleKey ?? anonKey!, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
