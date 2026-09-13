import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/lib/authz';
import AdminProtectedShell from './AdminProtectedShell';

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const current = await getCurrentAdmin();
  if (current.status === 'unauthenticated') {
    redirect('/admin');
  }
  if (current.status === 'disabled') {
    // Server components can't clear auth cookies; the login page signs out.
    redirect('/admin?error=disabled');
  }
  if (current.status === 'must-change-password') {
    redirect('/admin/change-password');
  }

  return (
    <AdminProtectedShell
      userEmail={current.user.email ?? null}
      permissions={[...current.actor.permissions]}
    >
      {children}
    </AdminProtectedShell>
  );
}
