'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from '@/i18n/routing';

interface CtaSectionProps {
  title: string;
  subtitle?: string;
  description?: string;
  additionalText?: string;
  buttonText: string;
  buttonHref?: string;
}

const PARALLAX_FACTOR = 0.35;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQuery.addEventListener('change', onStoreChange);
  return () => mediaQuery.removeEventListener('change', onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export default function CtaSection({
  title,
  subtitle,
  description,
  additionalText,
  buttonText,
  buttonHref = '/contact',
}: CtaSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [bgOffset, setBgOffset] = useState(0);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );
  const parallaxEnabled = !prefersReducedMotion;

  useEffect(() => {
    if (!parallaxEnabled) return;

    const updateParallax = () => {
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const sectionCenter = rect.top + rect.height / 2;
      const viewportCenter = viewportHeight / 2;
      const distanceFromCenter = sectionCenter - viewportCenter;

      setBgOffset(distanceFromCenter * PARALLAX_FACTOR);
    };

    const frame = requestAnimationFrame(updateParallax);
    window.addEventListener('scroll', updateParallax, { passive: true });
    window.addEventListener('resize', updateParallax);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updateParallax);
      window.removeEventListener('resize', updateParallax);
    };
  }, [parallaxEnabled]);

  return (
    <section
      ref={sectionRef}
      className="relative py-20 md:py-24 overflow-hidden isolate"
    >
      <div className="absolute inset-0" aria-hidden>
        <div
          className="absolute -inset-[25%] bg-cover bg-center bg-cta-background will-change-transform"
          style={
            parallaxEnabled
              ? { transform: `translate3d(0, ${bgOffset}px, 0)` }
              : undefined
          }
        />
      </div>
      <div className="absolute inset-0 bg-black/60" aria-hidden />
      <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 whitespace-pre-line">
          {title}
        </h2>
        {subtitle && <p className="text-xl text-white mb-2">{subtitle}</p>}
        {description && (
          <p className="text-white/80 mb-2 text-base max-w-2xl mx-auto">
            {description}
          </p>
        )}
        {additionalText && (
          <p className="text-white/80 mb-10 text-base max-w-2xl mx-auto">
            {additionalText}
          </p>
        )}
        {!additionalText && !description && <div className="mb-10" />}
        <Link
          href={buttonHref}
          className="inline-flex items-center justify-center gap-3 w-full max-w-2xl mx-auto px-12 py-5 bg-primaryColor text-white rounded-full font-bold text-lg hover:bg-primaryLight transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          {buttonText}
        </Link>
      </div>
    </section>
  );
}
