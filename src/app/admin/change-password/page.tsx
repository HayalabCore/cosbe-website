import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/lib/authz';
import ChangePasswordForm from './ChangePasswordForm';

export default async function ChangePasswordPage() {
  const current = await getCurrentAdmin();
  if (current.status === 'unauthenticated') redirect('/admin');
  if (current.status === 'disabled') redirect('/admin?error=disabled');
  if (current.status === 'active') redirect('/admin/dashboard');
  return <ChangePasswordForm email={current.user.email ?? ''} />;
}
