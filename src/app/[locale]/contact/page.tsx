import { getTranslations } from 'next-intl/server';
import HubSpotForm from '@/components/HubSpotForm';

export default async function ContactPage() {
  const t = await getTranslations('contact');

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/20 to-white pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 bg-clip-text text-transparent mb-4">
            {t('title')}
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 font-semibold max-w-3xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Contact Form */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 md:p-12 shadow-xl ring-1 ring-blue-100/50 border border-white/20">
            <div className="mb-8">
              <p className="text-lg text-slate-700 leading-relaxed">
                {t('description')}
              </p>
            </div>
            <HubSpotForm />
          </div>
        </div>

        {/* Contact Info */}
        <div className="max-w-5xl mx-auto mt-16">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 border border-blue-100 text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4 mx-auto">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {t('email.title')}
              </h3>
              <p className="text-slate-600">
                {t('email.description')}
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 border border-blue-100 text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4 mx-auto">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {t('response.title')}
              </h3>
              <p className="text-slate-600">
                {t('response.description')}
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 border border-blue-100 text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4 mx-auto">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {t('support.title')}
              </h3>
              <p className="text-slate-600">
                {t('support.description')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
