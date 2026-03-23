import type { Session } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function signIn(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error ? new Error(error.message) : null };
}

export async function signOut(supabase: SupabaseClient): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession(
  supabase: SupabaseClient
): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
