import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';

export default async function RecruitPage() {
  const t = await getTranslations('recruitPage');

  return (
    <div className="min-h-screen">
      {/* Hero Section with Background */}
      <div className="relative min-h-[280px] flex items-center justify-center overflow-hidden bg-gradient-to-br from-primaryColor/80 to-primaryColor/90">
        <div className="absolute inset-0 bg-gradient-to-b from-primaryColor/40 to-primaryColor/60"></div>
        <div className="relative z-10 text-center px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            {t('heroTitle')}
          </h1>
          <p className="text-lg md:text-xl text-white/90 font-light tracking-wide">
            {t('heroSubtitle')}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Title Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-primaryColor mb-6">
              {t('title')}
            </h2>
            <h3 className="text-2xl md:text-3xl font-bold text-textPrimary mb-8">
              {t('subtitle')}
            </h3>
          </div>

          {/* Description */}
          <div className="max-w-4xl mx-auto mb-16">
            <p className="text-lg text-textSecondary leading-relaxed mb-4">
              {t('description1')}
            </p>
            <p className="text-lg text-textSecondary leading-relaxed">
              {t('description2')}
            </p>
          </div>

          {/* Two Column Section */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
            {/* Support We Provide */}
            <div className="bg-white border-2 border-borderPrimary rounded-lg p-8">
              <h3 className="text-2xl font-bold text-textPrimary mb-6">
                {t('benefits.title')}
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="text-primaryColor mr-2">▸</span>
                  <span className="text-textSecondary">{t('benefits.technical.title')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primaryColor mr-2">▸</span>
                  <span className="text-textSecondary">{t('benefits.marketing.title')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primaryColor mr-2">▸</span>
                  <span className="text-textSecondary">{t('benefits.management.title')}</span>
                </li>
              </ul>
            </div>

            {/* What We Look For */}
            <div className="bg-white border-2 border-borderPrimary rounded-lg p-8">
              <h3 className="text-2xl font-bold text-textPrimary mb-6">
                {t('lookingFor.title')}
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="text-primaryColor mr-2">▸</span>
                  <span className="text-textSecondary">{t('lookingFor.technology.title')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primaryColor mr-2">▸</span>
                  <span className="text-textSecondary">{t('lookingFor.innovation.title')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primaryColor mr-2">▸</span>
                  <span className="text-textSecondary">{t('lookingFor.flexibility.title')}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Separator */}
          <hr className="max-w-4xl mx-auto border-t-2 border-borderPrimary my-12" />
        </div>
      </div>

      {/* Contact CTA Section */}
      <section className="relative py-20 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/bg_image.jpeg')" }}></div>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <p className="text-white/90 mb-10 text-lg">
            {t('contactText')}
          </p>
          <Link href="/contact">
            <button className="inline-flex items-center justify-center gap-3 w-full max-w-2xl mx-auto px-12 py-5 bg-primaryColor text-white rounded-full font-bold text-lg hover:bg-primaryLight transition-all duration-200 shadow-lg hover:shadow-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {t('cta.button')}
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
