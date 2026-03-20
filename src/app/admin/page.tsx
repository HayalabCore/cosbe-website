'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { signIn } from '@/lib/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(supabase, email, password);
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push('/admin/dashboard');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-slate-950 px-14 py-12">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primaryColor flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm leading-none">C</span>
          </div>
          <span className="text-white font-semibold text-base tracking-tight">CosBE</span>
        </div>

        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primaryColor/15 border border-primaryColor/30 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primaryColor animate-pulse" />
            <span className="text-xs font-medium text-primaryColor">Content Management</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Your content,<br />under control.
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-xs">
            Create, edit and publish articles with a streamlined block-based editor built for speed.
          </p>
        </div>

        <p className="text-slate-600 text-xs">© {new Date().getFullYear()} CosBE Inc.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primaryColor flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="font-semibold text-slate-900">CosBE Admin</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Sign in</h2>
          <p className="text-sm text-slate-500 mb-8">Access the CosBE admin panel</p>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@cosbe.inc"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-primaryColor focus:outline-none focus:ring-3 focus:ring-primaryColor/15 transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-primaryColor focus:outline-none focus:ring-3 focus:ring-primaryColor/15 transition-all"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-3.5 py-3 text-sm text-red-700">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primaryColor py-3 text-sm font-semibold text-white shadow-sm hover:bg-primaryHover disabled:opacity-60 transition-colors mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                'Sign in →'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
