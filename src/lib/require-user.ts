import 'server-only';

import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Ensures the current request has an authenticated Supabase user.
 *
 * Uses `getUser()` (which revalidates the session with the auth server) rather
 * than `getSession()` (which trusts the cookie), and throws
 * `Error('Unauthorized')` when no user is present.
 *
 * Returns both the verified `user` and the server `supabase` client so callers
 * that also need storage/db access under the user's session can reuse it.
 * This is the single authorization chokepoint for all server actions — add
 * role/allowlist checks here.
 */
export async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return { supabase, user };
}
