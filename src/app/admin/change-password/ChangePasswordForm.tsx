'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { changeOwnPasswordAction } from '@/actions/account';
import AdminBusyButton from '@/components/admin/AdminBusyButton';
import PasswordField from '@/components/admin/PasswordField';
import { signOut } from '@/lib/auth';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { PASSWORD_MIN_LENGTH } from '@/lib/validation/access';

export default function ChangePasswordForm({ email }: { email: string }) {
  const t = useTranslations('admin.changePassword');
  const tCommon = useTranslations('admin.common');
  const tErrors = useTranslations('admin.access.errors');
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword || password.length < PASSWORD_MIN_LENGTH) {
      setError(t('tooShort'));
      return;
    }
    if (password !== confirm) {
      setError(t('mismatch'));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await changeOwnPasswordAction({ currentPassword, password });
      if (!res.ok) {
        setError(tErrors(res.error));
        setSaving(false);
        return;
      }
      router.push('/admin/dashboard');
      router.refresh();
    } catch {
      setError(tErrors('FAILED'));
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut(supabase);
      router.push('/admin');
      router.refresh();
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">{t('title')}</h1>
        <p className="mb-8 text-sm text-slate-500">{t('subtitle')}</p>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {/* Lets password managers associate the new password with the account. */}
          <input
            type="email"
            name="username"
            autoComplete="username"
            value={email}
            readOnly
            hidden
          />
          <PasswordField
            id="current-password"
            label={t('currentPassword')}
            autoComplete="current-password"
            required
            disabled={saving}
            value={currentPassword}
            onChange={setCurrentPassword}
          />
          <PasswordField
            id="new-password"
            label={t('newPassword')}
            autoComplete="new-password"
            required
            disabled={saving}
            value={password}
            onChange={setPassword}
          />
          <PasswordField
            id="confirm-password"
            label={t('confirmPassword')}
            autoComplete="new-password"
            required
            disabled={saving}
            value={confirm}
            onChange={setConfirm}
          />
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}
          <AdminBusyButton
            type="submit"
            busy={saving}
            idleLabel={t('submit')}
            busyLabel={t('submitting')}
            className="mt-2 w-full rounded-xl bg-primaryColor py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primaryHover disabled:opacity-60"
          />
        </form>
        <AdminBusyButton
          type="button"
          busy={signingOut}
          idleLabel={t('signOut')}
          busyLabel={tCommon('signingOut')}
          onClick={() => void handleSignOut()}
          className="mt-6 w-full text-center text-sm font-medium text-slate-500 hover:text-slate-800"
        />
      </div>
    </div>
  );
}
