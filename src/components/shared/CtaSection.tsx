import { Link } from '@/i18n/routing';

interface CtaSectionProps {
  title: string;
  subtitle?: string;
  description?: string;
  additionalText?: string;
  buttonText: string;
  buttonHref?: string;
}

export default function CtaSection({
  title,
  subtitle,
  description,
  additionalText,
  buttonText,
  buttonHref = '/contact',
}: CtaSectionProps) {
  return (
    <section className="relative py-20 md:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center bg-cta-background" />
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 whitespace-pre-line">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xl text-white mb-2">{subtitle}</p>
        )}
        {description && (
          <p className="text-white/80 mb-2 text-base max-w-2xl mx-auto">{description}</p>
        )}
        {additionalText && (
          <p className="text-white/80 mb-10 text-base max-w-2xl mx-auto">{additionalText}</p>
        )}
        {!additionalText && !description && <div className="mb-10" />}
        <Link
          href={buttonHref}
          className="inline-flex items-center justify-center gap-3 w-full max-w-2xl mx-auto px-12 py-5 bg-primaryColor text-white rounded-full font-bold text-lg hover:bg-primaryLight transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {buttonText}
        </Link>
      </div>
    </section>
  );
}
