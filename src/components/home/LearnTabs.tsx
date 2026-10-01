'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';

export type LearnTab = {
  key: string;
  label: string;
  content: React.ReactNode;
  moreHref: string;
};

export default function LearnTabs({
  tabs,
  moreLabel,
}: {
  tabs: LearnTab[];
  moreLabel: string;
}) {
  const [active, setActive] = useState(tabs[0]?.key);
  const tab = tabs.find((t) => t.key === active) ?? tabs[0];
  if (!tab) return null;

  return (
    <div>
      {/* The rule runs from the first tab to the right edge of the page. */}
      <div
        role="tablist"
        className="relative flex gap-[21px] after:absolute after:bottom-[2px] after:left-0 after:right-[-100vw] after:h-px after:bg-textDark"
      >
        {tabs.map((t) => {
          const selected = t.key === tab.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`learn-tab-${t.key}`}
              aria-selected={selected}
              aria-controls={`learn-panel-${t.key}`}
              onClick={() => setActive(t.key)}
              className={`relative z-10 w-[140px] border-b-4 pb-[9px] text-xl font-medium leading-[1.2] transition-colors sm:w-[167px] sm:text-2xl ${
                selected
                  ? 'border-primaryColor'
                  : 'border-transparent text-textDark/60 hover:text-textDark'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`learn-panel-${tab.key}`}
        aria-labelledby={`learn-tab-${tab.key}`}
        className="mt-10"
      >
        {tab.content}
      </div>

      <div className="mt-[42px] text-center">
        <Link
          href={tab.moreHref}
          className="group inline-flex flex-col items-center gap-2 text-base font-medium leading-[1.2] hover:text-primaryColor"
        >
          {moreLabel}
          <Image
            src="/home/top/chevron-down-blue.png"
            alt=""
            width={16}
            height={10}
            className="transition-transform group-hover:translate-y-0.5"
          />
        </Link>
      </div>
    </div>
  );
}
