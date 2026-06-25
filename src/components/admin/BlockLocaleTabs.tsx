'use client';

import { useTranslations } from 'next-intl';

export type LocaleEditTab = 'original' | 'english';

type Props = {
  tab: LocaleEditTab;
  onTabChange: (tab: LocaleEditTab) => void;
  onGenerateEnglish: () => void | Promise<void>;
  generating: boolean;
  generateDisabled?: boolean;
  className?: string;
};

export default function BlockLocaleTabs({
  tab,
  onTabChange,
  onGenerateEnglish,
  generating,
  generateDisabled,
  className = '',
}: Props) {
  const t = useTranslations('admin.blockLocale');

  return (
    <div className={`flex flex-wrap items-center gap-2 mb-2 ${className}`}>
      <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50/80">
        <button
          type="button"
          onClick={() => onTabChange('original')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
            tab === 'original'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {t('original')}
        </button>
        <button
          type="button"
          onClick={() => onTabChange('english')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
            tab === 'english'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {t('english')}
        </button>
      </div>
      <button
        type="button"
        disabled={generating || generateDisabled}
        onClick={() => void onGenerateEnglish()}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primaryColor hover:text-primaryHover disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded-md border border-primaryColor/30 hover:bg-primaryColor/5 transition-colors"
      >
        {generating ? (
          <>
            <svg
              className="h-3 w-3 animate-spin flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {t('generating')}
          </>
        ) : (
          t('generateEnglish')
        )}
      </button>
    </div>
  );
}

const EN_TEXTAREA_CLS =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primaryColor focus:outline-none focus:ring-2 focus:ring-primaryColor/15 min-h-[80px]';

export function EnglishTextarea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      className={EN_TEXTAREA_CLS}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

export function EnglishInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primaryColor focus:outline-none focus:ring-2 focus:ring-primaryColor/15"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}
