import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';

export default async function RecruitPage() {
  const t = await getTranslations('recruitPage');

  return (
    <div className="min-h-screen">
      {/* Hero Section with Background */}
      <div className="relative min-h-[280px] flex items-center justify-center overflow-hidden" 
           style={{
             background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.8), rgba(59, 130, 246, 0.9))',
             backgroundSize: 'cover',
             backgroundPosition: 'center'
           }}>
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/40 to-blue-600/60"></div>
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
            <h2 className="text-4xl md:text-5xl font-bold text-blue-600 mb-6">
              {t('title')}
            </h2>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mb-8">
              {t('subtitle')}
            </h3>
          </div>

          {/* Description */}
          <div className="max-w-4xl mx-auto mb-16">
            <p className="text-lg text-slate-700 leading-relaxed mb-4">
              {t('description1')}
            </p>
            <p className="text-lg text-slate-700 leading-relaxed">
              {t('description2')}
            </p>
          </div>

          {/* Two Column Section */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
            {/* Support We Provide */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-8">
              <h3 className="text-2xl font-bold text-slate-800 mb-6">
                {t('benefits.title')}
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">▸</span>
                  <span className="text-slate-700">{t('benefits.technical.title')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">▸</span>
                  <span className="text-slate-700">{t('benefits.marketing.title')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">▸</span>
                  <span className="text-slate-700">{t('benefits.management.title')}</span>
                </li>
              </ul>
            </div>

            {/* What We Look For */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-8">
              <h3 className="text-2xl font-bold text-slate-800 mb-6">
                {t('lookingFor.title')}
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">▸</span>
                  <span className="text-slate-700">{t('lookingFor.technology.title')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">▸</span>
                  <span className="text-slate-700">{t('lookingFor.innovation.title')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">▸</span>
                  <span className="text-slate-700">{t('lookingFor.flexibility.title')}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Separator */}
          <hr className="max-w-4xl mx-auto border-t-2 border-gray-200 my-12" />

          {/* Contact Section */}
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-lg text-slate-700 mb-8">
              {t('contactText')}
            </p>
            <Link href="/contact">
              <button className="px-12 py-4 bg-blue-500 hover:bg-blue-600 text-white text-lg font-bold rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
                {t('cta.button')}
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
