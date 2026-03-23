import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { HubSpotForm } from '@/components';
import { Link } from '@/i18n/routing';

export default async function DownloadPage() {
  const t = await getTranslations('downloadPage');

  return (
    <div className="min-h-screen bg-white pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Title */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-primaryColor mb-4 pb-2 border-b-4 border-primaryColor inline-block">
            {t('pageTitle')}
          </h1>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column - Content */}
          <div className="space-y-8">
            {/* Document Title */}
            <h2 className="text-3xl md:text-4xl font-bold text-textPrimary">
              {t('documentTitle')}
            </h2>

            {/* Document Image */}
            <div className="aspect-video bg-borderPrimary rounded-lg overflow-hidden">
              <Image
                src="/material-download/download-preview.png"
                alt={t('documentTitle')}
                width={600}
                height={400}
                className="w-full h-full object-cover"
              />
            </div>

            {/* What You'll Learn */}
            <div>
              <h3 className="text-xl font-semibold text-textPrimary mb-4">
                {t('reveals.title')}
              </h3>
              <ul className="space-y-3 text-textSecondary">
                <li className="flex items-start gap-3">
                  <span className="text-primaryColor mt-1">•</span>
                  <span>{t('reveals.point1')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primaryColor mt-1">•</span>
                  <span>{t('reveals.point2')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primaryColor mt-1">•</span>
                  <span>{t('reveals.point3')}</span>
                </li>
              </ul>
            </div>

            {/* Document Overview */}
            <div>
              <h3 className="text-xl font-semibold text-textPrimary mb-4">
                {t('overview.title')}
              </h3>
              <p className="text-textSecondary leading-relaxed">
                {t('overview.description')}
              </p>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="bg-white rounded-lg shadow-xl p-8 border border-borderPrimary">
              <HubSpotForm />
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <section className="relative py-20 md:py-24 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/bg_image.jpeg')" }}
        ></div>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 whitespace-pre-line">
            {t('cta.title')}
          </h2>
          <p className="text-xl text-white mb-2">{t('cta.subtitle')}</p>
          <p className="text-white/80 mb-10 text-base max-w-2xl mx-auto">
            {t('cta.description')}
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-3 w-full max-w-2xl mx-auto px-12 py-5 bg-primaryColor text-white rounded-full font-bold text-lg hover:bg-primaryLight transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            {t('cta.button')}
          </Link>
        </div>
      </section>
    </div>
  );
}
