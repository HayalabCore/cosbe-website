import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function requireEnv(): { url: string; anonKey: string } {
  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }
  return { url, anonKey };
}

/** Anonymous reads (published content). Safe to import from client bundles. */
export function createPublicClient() {
  const { url: u, anonKey: k } = requireEnv();
  return createClient(u, k);
}
