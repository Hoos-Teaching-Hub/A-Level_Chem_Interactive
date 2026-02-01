import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export type TestConfig = {
  supabaseUrl: string;
  serviceRoleKey: string;
  functionsBaseUrl: string;
};

export function loadTestConfig(): TestConfig {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const functionsBaseUrl =
    Deno.env.get("SUPABASE_FUNCTIONS_URL") ??
    (supabaseUrl ? `${supabaseUrl}/functions/v1` : undefined);

  if (!supabaseUrl || !serviceRoleKey || !functionsBaseUrl) {
    throw new Error(
      "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_FUNCTIONS_URL.",
    );
  }

  return { supabaseUrl, serviceRoleKey, functionsBaseUrl };
}

export function createServiceClient(cfg: TestConfig): SupabaseClient {
  return createClient(cfg.supabaseUrl, cfg.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
