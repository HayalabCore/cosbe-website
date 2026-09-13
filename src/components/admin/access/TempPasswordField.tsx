'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { generateTempPassword } from '@/lib/temp-password';
import { PASSWORD_MIN_LENGTH } from '@/lib/validation/access';

export default function TempPasswordField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations('admin.users.dialog');
  const id = useId();
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard?.writeText(value);
    setCopied(true);
  }

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
      >
        {t('tempPassword')}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          autoComplete="off"
          spellCheck={false}
          minLength={PASSWORD_MIN_LENGTH}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setCopied(false);
          }}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-primaryColor focus:outline-none focus:ring-2 focus:ring-primaryColor/15"
        />
        <button
          type="button"
          onClick={() => {
            onChange(generateTempPassword());
            setCopied(false);
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          {t('generate')}
        </button>
        <button
          type="button"
          onClick={() => void copy()}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          {copied ? t('copied') : t('copy')}
        </button>
      </div>
    </div>
  );
}
