'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

const DEFAULT_INPUT_CLASS =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-primaryColor focus:outline-none focus:ring-3 focus:ring-primaryColor/15 transition-all disabled:opacity-60';

const DEFAULT_LABEL_CLASS =
  'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500';

export default function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  required,
  disabled,
  placeholder,
  name,
  className = DEFAULT_INPUT_CLASS,
  labelClassName = DEFAULT_LABEL_CLASS,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  name?: string;
  className?: string;
  labelClassName?: string;
}) {
  const t = useTranslations('admin.common');
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? t('hidePassword') : t('showPassword');

  return (
    <div>
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={className}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={toggleLabel}
          aria-pressed={visible}
          disabled={disabled}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-700 disabled:opacity-50"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden />
          ) : (
            <Eye className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}
