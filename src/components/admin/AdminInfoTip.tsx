'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';

/**
 * A small "i" next to a label that explains the field on demand, so forms
 * stay free of permanent hint text. Opens on hover and keyboard focus, and
 * on tap for touch screens; Escape or clicking elsewhere closes it. It opens
 * rightwards from the icon so it never slides under the sidebar.
 */
export default function AdminInfoTip({
  label,
  children,
}: {
  /** What the button is about, for screen readers ("About Audience"). */
  label: string;
  children: ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === 'Escape'
          : !ref.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener('keydown', close);
    document.addEventListener('mousedown', close);
    return () => {
      document.removeEventListener('keydown', close);
      document.removeEventListener('mousedown', close);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="rounded-full p-0.5 text-slate-400 transition-colors hover:text-slate-600 focus-visible:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaryColor/40"
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full left-0 z-30 -ml-2 mb-2 w-64 rounded-lg bg-slate-900 px-3 py-2 text-xs font-normal leading-relaxed text-slate-100 shadow-xl"
        >
          {children}
          <span
            className="absolute left-3 top-full border-4 border-transparent border-t-slate-900"
            aria-hidden
          />
        </span>
      )}
    </span>
  );
}
