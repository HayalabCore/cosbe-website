'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { changeOwnPasswordAction } from '@/actions/account';
import { signOut } from '@/lib/auth';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { PASSWORD_MIN_LENGTH } from '@/lib/validation/access';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-primaryColor focus:outline-none focus:ring-3 focus:ring-primaryColor/15 transition-all';

export default function ChangePasswordForm({ email }: { email: string }) {
  const t = useTranslations('admin.changePassword');
  const tErrors = useTranslations('admin.access.errors');
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
        return;
      }
      router.push('/admin/dashboard');
      router.refresh();
    } catch {
      setError(tErrors('FAILED'));
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut(supabase);
    router.push('/admin');
    router.refresh();
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
          <div>
            <label
              htmlFor="current-password"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              {t('currentPassword')}
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="new-password"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              {t('newPassword')}
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="confirm-password"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              {t('confirmPassword')}
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
            />
          </div>
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={saving}
            className="mt-2 w-full rounded-xl bg-primaryColor py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primaryHover disabled:opacity-60"
          >
            {saving ? t('submitting') : t('submit')}
          </button>
        </form>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="mt-6 w-full text-center text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          {t('signOut')}
        </button>
      </div>
    </div>
  );
}
