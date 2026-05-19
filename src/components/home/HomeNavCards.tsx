'use client';

import { Link } from '@/i18n/routing';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export type HomeNavCard = {
  href: string;
  label: string;
};

export default function HomeNavCards({ cards }: { cards: HomeNavCard[] }) {
  const [active, setActive] = useState<string | null>(null);

  return (
    <nav
      aria-label="Homepage sections"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
        <ul className="grid grid-cols-2 lg:grid-cols-4">
          {cards.map((card, i) => (
            <li
              key={card.href}
              className={`relative ${i < cards.length - 1 ? 'after:absolute after:right-0 after:top-[20%] after:h-[60%] after:w-px after:bg-slate-200' : ''}`}
            >
              <Link
                href={card.href}
                onMouseEnter={() => setActive(card.href)}
                onMouseLeave={() => setActive(null)}
                className="group flex flex-col items-center justify-center gap-2 px-4 py-6 text-center transition-colors duration-200 hover:bg-primaryColor/5 sm:py-7"
              >
                <span
                  className={`text-sm font-bold tracking-tight transition-colors duration-200 sm:text-[0.9rem] ${
                    active === card.href
                      ? 'text-primaryColor'
                      : 'text-textHeading'
                  }`}
                >
                  {card.label}
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-all duration-300 ${
                    active === card.href
                      ? 'translate-y-0.5 text-primaryColor'
                      : 'text-slate-400'
                  }`}
                  aria-hidden
                />
                <span
                  aria-hidden
                  className={`absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-primaryColor transition-all duration-300 ${
                    active === card.href ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
