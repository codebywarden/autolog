import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client: bypasses Row Level Security entirely.
 *
 * Only call this from server-side code that has already authenticated
 * the caller itself (e.g. via `createClient` from ./server and
 * `auth.getUser()`) — this client will happily read or write any row
 * regardless of ownership. Never import it into a Client Component and
 * never let SUPABASE_SERVICE_ROLE_KEY reach the browser.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
