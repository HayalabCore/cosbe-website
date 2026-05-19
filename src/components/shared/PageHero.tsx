import Image from 'next/image';

type PageHeroLayout = 'stacked' | 'inline';
type PageHeroAlign = 'center' | 'start';
type PageHeroMedia = 'gradient' | 'image' | 'photo';

export type PageHeroProps = {
  title: string;
  subtitle?: string;
  /** How title and subtitle are arranged */
  layout?: PageHeroLayout;
  align?: PageHeroAlign;
  /** Background: brand gradient (default), photo via CSS, or Next/Image */
  media?: PageHeroMedia;
  backgroundImage?: string;
  backgroundImageAlt?: string;
  backgroundCss?: string;
  backgroundImageClassName?: string;
  overlayClassName?: string;
  subtitleClassName?: string;
  /** Slot below title block (e.g. category filter pills) */
  children?: React.ReactNode;
  className?: string;
};

/** Shared look (recruitment-style brand bar); only layout / align differ */
export const PAGE_HERO_PRESETS = {
  /** Title + subtitle stacked, left-aligned; optional children (case studies) */
  listing: {
    layout: 'stacked',
    align: 'start',
  },
  /** Title + subtitle stacked, centered (recruit, notice) */
  centered: {
    layout: 'stacked',
    align: 'center',
  },
  /** Title + subtitle on one row, left-aligned (AI Lab) */
  inline: {
    layout: 'inline',
    align: 'start',
  },
} as const satisfies Record<string, Partial<PageHeroProps>>;

export type PageHeroPreset = keyof typeof PAGE_HERO_PRESETS;

/** Same typography on every page hero */
const TITLE_CLASS = 'text-4xl font-bold text-white md:text-5xl';
const SUBTITLE_CLASS =
  'text-lg font-light tracking-wide text-white/90 md:text-xl';

/** Same min-height / padding as recruitment */
const CONTENT_SHELL =
  'flex min-h-[200px] flex-col justify-center py-12 md:min-h-[240px] md:py-16';

/**
 * Page hero banner with fixed-navbar offset (pt-20 md:pt-24).
 * All pages share recruitment-style brand color, height, and title size.
 * Vary layout (stacked | inline), align (center | start), and children only.
 */
export default function PageHero({
  title,
  subtitle,
  layout = 'stacked',
  align = 'start',
  media = 'gradient',
  backgroundImage,
  backgroundImageAlt = '',
  backgroundCss,
  backgroundImageClassName = 'object-cover',
  overlayClassName = 'bg-primaryColor/40',
  subtitleClassName,
  children,
  className = '',
}: PageHeroProps) {
  const centered = align === 'center';
  const useBrandGradient =
    media === 'gradient' && !backgroundCss && !backgroundImage;

  const alignClass = centered
    ? 'items-center text-center'
    : 'items-start text-left';

  const titleBlock =
    layout === 'inline' ? (
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h1 className={TITLE_CLASS}>{title}</h1>
        {subtitle ? (
          <p className={subtitleClassName ?? SUBTITLE_CLASS}>{subtitle}</p>
        ) : null}
      </div>
    ) : (
      <div>
        <h1
          className={`mb-2 ${TITLE_CLASS} ${centered ? 'drop-shadow-lg' : ''}`}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            className={`${subtitleClassName ?? SUBTITLE_CLASS} ${
              centered ? 'font-medium drop-shadow' : ''
            }`}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    );

  return (
    <section
      className={`relative overflow-hidden pt-20 md:pt-24 ${
        useBrandGradient
          ? 'bg-gradient-to-br from-primaryColor/80 to-primaryColor/90'
          : ''
      } ${className}`.trim()}
    >
      {useBrandGradient && (
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primaryColor/40 to-primaryColor/60"
          aria-hidden
        />
      )}

      {backgroundCss && (
        <div
          className={`absolute inset-0 bg-cover bg-center ${backgroundImageClassName}`}
          style={{ backgroundImage: `url(${backgroundCss})` }}
          aria-hidden
        />
      )}

      {backgroundImage && (
        <Image
          src={backgroundImage}
          alt={backgroundImageAlt}
          fill
          className={`object-cover ${backgroundImageClassName}`}
          sizes="100vw"
          priority
        />
      )}

      {(backgroundCss || backgroundImage) && (
        <div className={`absolute inset-0 ${overlayClassName}`} aria-hidden />
      )}

      <div
        className={`relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${CONTENT_SHELL} ${alignClass}`}
      >
        <div className={children ? 'mb-8 w-full' : undefined}>{titleBlock}</div>
        {children}
      </div>
    </section>
  );
}

/** Skeleton placeholder matching PageHero layout */
export function PageHeroSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div
      className={`relative bg-primaryColor/30 pt-20 md:pt-24 ${
        tall
          ? 'min-h-[300px] md:min-h-[360px]'
          : 'min-h-[260px] md:min-h-[300px]'
      }`}
      aria-hidden
    />
  );
}
