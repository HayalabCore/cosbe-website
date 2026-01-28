import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';

export default async function AiAgentPage() {
  const t = await getTranslations('aiAgent');

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/20 to-white pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 bg-clip-text text-transparent mb-4">
            {t('title')}
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 font-semibold">
            {t('subtitle')}
          </p>
        </div>

        {/* Description */}
        <div className="max-w-4xl mx-auto mb-20">
          <p className="text-lg md:text-xl text-slate-700 text-center leading-relaxed">
            {t('description')}
          </p>
        </div>

        {/* What is AI Agent */}
        <div className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-800 mb-12">
            {t('whatIs.title')}
          </h2>
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-blue-50 to-white rounded-3xl p-8 md:p-12 shadow-xl border border-blue-100">
            <p className="text-lg text-slate-700 leading-relaxed mb-8">
              {t('whatIs.description')}
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-3 flex-shrink-0" />
                <p className="text-slate-700">{t('whatIs.point1')}</p>
              </div>
              <div className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-3 flex-shrink-0" />
                <p className="text-slate-700">{t('whatIs.point2')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Process Steps */}
        <div className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-800 mb-12">
            {t('process.title')}
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg ring-1 ring-blue-100/50 border border-white/20">
              <div className="text-blue-600 font-bold text-lg mb-3">{t('process.step1.number')}</div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">
                {t('process.step1.title')}
              </h3>
              <p className="text-slate-600">
                {t('process.step1.description')}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg ring-1 ring-blue-100/50 border border-white/20">
              <div className="text-blue-600 font-bold text-lg mb-3">{t('process.step2.number')}</div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">
                {t('process.step2.title')}
              </h3>
              <p className="text-slate-600">
                {t('process.step2.description')}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg ring-1 ring-blue-100/50 border border-white/20">
              <div className="text-blue-600 font-bold text-lg mb-3">{t('process.step3.number')}</div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">
                {t('process.step3.title')}
              </h3>
              <p className="text-slate-600">
                {t('process.step3.description')}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg ring-1 ring-blue-100/50 border border-white/20">
              <div className="text-blue-600 font-bold text-lg mb-3">{t('process.step4.number')}</div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">
                {t('process.step4.title')}
              </h3>
              <p className="text-slate-600">
                {t('process.step4.description')}
              </p>
            </div>
          </div>
        </div>

        {/* Industries */}
        <div className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-800 mb-12">
            {t('industries.title')}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 border border-blue-100 hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-bold text-slate-800 mb-4">
                {t('industries.manufacturing.title')}
              </h3>
              <p className="text-slate-600 mb-4">
                {t('industries.manufacturing.description')}
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span className="text-slate-700">{t('industries.manufacturing.benefit1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span className="text-slate-700">{t('industries.manufacturing.benefit2')}</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 border border-blue-100 hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-bold text-slate-800 mb-4">
                {t('industries.retail.title')}
              </h3>
              <p className="text-slate-600 mb-4">
                {t('industries.retail.description')}
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span className="text-slate-700">{t('industries.retail.benefit1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span className="text-slate-700">{t('industries.retail.benefit2')}</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 border border-blue-100 hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-bold text-slate-800 mb-4">
                {t('industries.construction.title')}
              </h3>
              <p className="text-slate-600 mb-4">
                {t('industries.construction.description')}
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span className="text-slate-700">{t('industries.construction.benefit1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span className="text-slate-700">{t('industries.construction.benefit2')}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-800 mb-12">
            {t('pricing.title')}
          </h2>
          <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-blue-100">
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-white rounded-2xl">
                <div className="text-3xl font-bold text-blue-600 mb-2">{t('pricing.development')}</div>
                <p className="text-slate-600">{t('pricing.developmentNote')}</p>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-white rounded-2xl">
                <div className="text-3xl font-bold text-blue-600 mb-2">{t('pricing.maintenance')}</div>
                <p className="text-slate-600">{t('pricing.maintenanceNote')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-3xl p-12 text-white text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">
            {t('cta.title')}
          </h2>
          <Link href="/contact">
            <button className="px-8 py-4 bg-white text-blue-600 rounded-full hover:shadow-lg transition-all duration-200 text-lg font-semibold transform hover:scale-105">
              {t('cta.button')}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
