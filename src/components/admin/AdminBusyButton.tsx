'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  idleLabel: ReactNode;
  busyLabel: ReactNode;
  compact?: boolean;
};

export default function AdminBusyButton({
  busy = false,
  idleLabel,
  busyLabel,
  compact = false,
  className = '',
  disabled,
  type = 'button',
  ...props
}: Props) {
  return (
    <button
      type={type}
      disabled={busy || disabled}
      className={`inline-flex items-center justify-center gap-2 ${className}`}
      {...props}
    >
      {busy ? (
        <>
          <Loader2
            className={`animate-spin ${compact ? 'h-3 w-3' : 'h-4 w-4'}`}
            aria-hidden
          />
          {busyLabel}
        </>
      ) : (
        idleLabel
      )}
    </button>
  );
}
