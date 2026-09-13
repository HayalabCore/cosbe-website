'use server';

import { requireActiveSession } from '@/lib/authz';
import { setMustChangePassword } from '@/lib/admin-users-repository';
import { changePasswordSchema } from '@/lib/validation/access';
import type { AccessResult } from '@/lib/access-types';

/**
 * Changes the signed-in user's own password. The only action allowed while
 * `mustChangePassword` is set (requirePermission rejects those users).
 */
export async function changeOwnPasswordAction(input: {
  currentPassword: string;
  password: string;
}): Promise<AccessResult> {
  const { supabase, user } = await requireActiveSession();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  if (!user.email) return { ok: false, error: 'FAILED' };

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (verifyError) return { ok: false, error: 'WRONG_PASSWORD' };

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    if (error.code === 'same_password')
      return { ok: false, error: 'SAME_PASSWORD' };
    if (error.code === 'weak_password')
      return { ok: false, error: 'WEAK_PASSWORD' };
    console.error('[changeOwnPasswordAction]', error);
    return { ok: false, error: 'FAILED' };
  }
  await setMustChangePassword(user.id, false);
  return { ok: true, data: undefined };
}
