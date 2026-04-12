import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import AdminProtectedShell from './AdminProtectedShell';

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/admin');
  }

  return (
    <AdminProtectedShell userEmail={user.email ?? null}>
      {children}
    </AdminProtectedShell>
  );
}
