import { Link } from '@/i18n/routing';
import { ArrowRight } from 'lucide-react';

interface CtaSectionProps {
  title: string;
  subtitle?: string;
  description?: string;
  additionalText?: string;
  buttonText: string;
  buttonHref?: string;
  secondaryButtonText?: string;
  secondaryButtonHref?: string;
}

function CtaButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex w-full items-center justify-between gap-5 rounded-full border-2 border-white py-2.5 pl-7 pr-2.5 text-white transition-colors hover:bg-white/10"
    >
      <span className="text-lg font-medium sm:text-xl">{children}</span>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-primaryColor transition-transform group-hover:translate-x-0.5">
        <ArrowRight className="size-4" strokeWidth={2.5} />
      </span>
    </Link>
  );
}

export default function CtaSection({
  title,
  subtitle,
  description,
  additionalText,
  buttonText,
  buttonHref = '/contact',
  secondaryButtonText,
  secondaryButtonHref = '/download',
}: CtaSectionProps) {
  return (
    <section className="bg-primaryColor text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:px-8">
        <div className="max-w-xl">
          <h2 className="text-2xl font-medium! sm:text-3xl lg:text-[32px]">
            {title}
          </h2>
          {subtitle && <p className="mt-3 text-lg">{subtitle}</p>}
          {description && (
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-white/90 sm:text-base">
              {description}
            </p>
          )}
          {additionalText && (
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-white/90 sm:text-base">
              {additionalText}
            </p>
          )}
        </div>

        <div className="flex w-full flex-col gap-4 sm:flex-row lg:w-fit lg:shrink-0 lg:flex-col">
          <CtaButton href={buttonHref}>{buttonText}</CtaButton>
          {secondaryButtonText && (
            <CtaButton href={secondaryButtonHref}>
              {secondaryButtonText}
            </CtaButton>
          )}
        </div>
      </div>
    </section>
  );
}
