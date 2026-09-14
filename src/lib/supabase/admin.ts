import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Service-role client — SERVER ONLY. Never import this from a Client Component
// or anywhere that could ship it to the browser. Used for privileged actions
// like creating kitchen/cashier accounts (Supabase Auth admin API).
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
