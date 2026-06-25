'use client';

import { useTranslations } from 'next-intl';

type Props = {
  disabled: boolean;
  translating: boolean;
  onTranslate: () => void;
};

export default function ArticleTranslatePanel({
  disabled,
  translating,
  onTranslate,
}: Props) {
  const t = useTranslations('admin.editor');

  return (
    <button
      type="button"
      title={t('translateArticleHint')}
      disabled={disabled || translating}
      onClick={onTranslate}
      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-primaryColor/25 bg-primaryColor/5 px-3 py-2 text-xs font-semibold leading-snug text-center text-primaryColor hover:bg-primaryColor/10 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
    >
      {translating ? (
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
          {t('translateArticleProgress')}
        </>
      ) : (
        <>
          <svg
            className="h-3 w-3 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
            />
          </svg>
          {t('translateArticleTitle')}
        </>
      )}
    </button>
  );
}
