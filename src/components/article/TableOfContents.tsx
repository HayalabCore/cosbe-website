'use client';

import { useEffect, useState } from 'react';
import type { TOCItem } from '@/types';

interface TableOfContentsProps {
  items: TOCItem[];
  title: string;
}

export default function TableOfContents({
  items,
  title,
}: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-100px 0px -80% 0px',
        threshold: 0,
      }
    );

    items.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [items]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const offset = 120;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
      setActiveId(id);
    }
  };

  if (items.length === 0) return null;

  return (
    <nav className="sticky top-28 w-full">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-textPrimary flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
            {title}
          </h2>
        </div>

        {/* TOC Items */}
        <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          <ul className="space-y-1">
            {items.map((item) => {
              const isActive = activeId === item.id;
              const indent = (item.level - 2) * 12;

              return (
                <li key={item.id} style={{ paddingLeft: `${indent}px` }}>
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => handleClick(e, item.id)}
                    className={`
                      block py-2 px-3 rounded-lg text-sm leading-snug transition-all duration-200 cursor-pointer
                      ${
                        isActive
                          ? 'bg-primaryColor/10 text-primaryColor font-medium border-l-2 border-primaryColor'
                          : 'text-textSecondary hover:bg-gray-50 hover:text-textPrimary border-l-2 border-transparent'
                      }
                    `}
                  >
                    {item.text}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
