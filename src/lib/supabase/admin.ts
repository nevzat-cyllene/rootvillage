import { createClient } from "@supabase/supabase-js";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/env";

/** Privileged server client — bypasses RLS. Only call after an admin check. */
export function createServiceClient() {
  const key = getSupabaseSecretKey();
  if (!key) {
    throw new Error("SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY is missing");
  }
  return createClient(getSupabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
