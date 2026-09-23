'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Floating action bar for a multi-row selection: the count, the actions, and
 * a way to clear it. It floats over the list so choosing rows never shifts
 * the table. Shared by the posts dashboard and the content studio.
 */
export default function AdminBulkBar({
  count,
  label,
  clearLabel,
  onClear,
  children,
}: {
  count: number;
  /** "3 selected", in the page's language. */
  label: ReactNode;
  clearLabel: ReactNode;
  onClear: () => void;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    // The outer wrapper spans the content area (offset by the sidebar on lg)
    // and centres the bar; the bar animates vertically only.
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4 lg:left-56">
      <div
        role="toolbar"
        aria-label={typeof label === 'string' ? label : undefined}
        className="animate-bulkbar pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-2xl bg-slate-900 px-3 py-2.5 shadow-2xl ring-1 ring-black/10"
      >
        <span className="inline-flex items-center gap-2 px-2 text-sm font-semibold text-white">
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primaryColor px-1.5 text-xs font-bold tabular-nums text-white">
            {count}
          </span>
          {label}
        </span>
        <span className="mx-1 h-5 w-px bg-white/15" aria-hidden />
        {children}
        <span className="mx-1 h-5 w-px bg-white/15" aria-hidden />
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          {clearLabel}
        </button>
      </div>
    </div>
  );
}

const TONES = {
  default: 'text-slate-200 hover:bg-white/10',
  positive: 'text-emerald-300 hover:bg-white/10',
  warning: 'text-amber-300 hover:bg-white/10',
  danger: 'bg-red-500 text-white hover:bg-red-600',
} as const;

/** An action in the bulk bar. Destructive ones use the "danger" tone. */
export function AdminBulkBarButton({
  tone = 'default',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: keyof typeof TONES }) {
  return (
    <button
      type={type}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${TONES[tone]} ${className}`}
      {...props}
    />
  );
}
