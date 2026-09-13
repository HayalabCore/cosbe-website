import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

/**
 * Service-role Supabase client for Auth admin operations. Bypasses all access
 * controls — app code must import `@/lib/supabase/admin` (server-only) instead
 * of this file. No `server-only` import here so `tsx` scripts can use it.
 */
let client: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    );
  }
  client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

const PER_PAGE = 1000;
const BAN_FOREVER = '876000h';

export type AuthUserSummary = {
  id: string;
  email: string | null;
  lastSignInAt: string | null;
  banned: boolean;
};

export async function listAuthUsers(): Promise<AuthUserSummary[]> {
  const admin = getSupabaseAdminClient().auth.admin;
  const users: AuthUserSummary[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.listUsers({
      page,
      perPage: PER_PAGE,
    });
    if (error) throw error;
    for (const u of data.users) {
      users.push({
        id: u.id,
        email: u.email ?? null,
        lastSignInAt: u.last_sign_in_at ?? null,
        banned:
          !!u.banned_until && new Date(u.banned_until).getTime() > Date.now(),
      });
    }
    if (data.users.length < PER_PAGE) return users;
  }
}

export async function createAuthUser(
  email: string,
  password: string
): Promise<
  | { ok: true; id: string }
  | { ok: false; error: 'EMAIL_EXISTS' | 'WEAK_PASSWORD' | 'FAILED' }
> {
  const { data, error } = await getSupabaseAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    if (
      error?.code === 'email_exists' ||
      error?.code === 'user_already_exists'
    ) {
      return { ok: false, error: 'EMAIL_EXISTS' };
    }
    if (error?.code === 'weak_password') {
      return { ok: false, error: 'WEAK_PASSWORD' };
    }
    console.error('[createAuthUser]', error);
    return { ok: false, error: 'FAILED' };
  }
  return { ok: true, id: data.user.id };
}

export async function setAuthUserPassword(
  id: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: 'WEAK_PASSWORD' | 'FAILED' }> {
  const { error } = await getSupabaseAdminClient().auth.admin.updateUserById(
    id,
    { password }
  );
  if (!error) return { ok: true };
  if (error.code === 'weak_password') {
    return { ok: false, error: 'WEAK_PASSWORD' };
  }
  console.error('[setAuthUserPassword]', error);
  return { ok: false, error: 'FAILED' };
}

export async function setAuthUserBanned(
  id: string,
  banned: boolean
): Promise<boolean> {
  const { error } = await getSupabaseAdminClient().auth.admin.updateUserById(
    id,
    {
      ban_duration: banned ? BAN_FOREVER : 'none',
    }
  );
  if (error) console.error('[setAuthUserBanned]', error);
  return !error;
}

export async function deleteAuthUser(id: string): Promise<boolean> {
  const { error } = await getSupabaseAdminClient().auth.admin.deleteUser(id);
  if (!error || error.code === 'user_not_found') return true;
  console.error('[deleteAuthUser]', error);
  return false;
}

export async function authUserExists(id: string): Promise<boolean> {
  const { data, error } =
    await getSupabaseAdminClient().auth.admin.getUserById(id);
  return !error && !!data.user;
}

/**
 * Ends every GoTrue session for the user (password reset / disable).
 * GoTrue has no admin logout-by-user-id. Deleting `auth.sessions` is enough:
 * refresh tokens reference `session_id` with ON DELETE CASCADE.
 * (`auth.refresh_tokens.user_id` is varchar — do not compare it to a uuid.)
 *
 * Requires the DATABASE_URL role to have DELETE on `auth.sessions`. The
 * default Supabase `postgres` user does; a restricted Prisma role may not.
 * Confirm with (0 rows is success):
 *   DELETE FROM auth.sessions WHERE user_id = '00000000-0000-0000-0000-000000000000';
 * Access tokens already issued stay valid until they expire.
 */
export async function revokeAuthUserSessions(id: string): Promise<boolean> {
  try {
    await prisma.$executeRawUnsafe(
      'DELETE FROM auth.sessions WHERE user_id = $1::uuid',
      id
    );
    return true;
  } catch (error) {
    console.error('[revokeAuthUserSessions]', error);
    return false;
  }
}
