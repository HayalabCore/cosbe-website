import { getTranslations } from 'next-intl/server';
import Image from 'next/image';

export default async function DownloadPage() {
  const t = await getTranslations('downloadPage');

  return (
    <div className="min-h-screen bg-white pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Title */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-[#5FA4E6] mb-4 pb-2 border-b-4 border-[#5FA4E6] inline-block">
            {t('pageTitle')}
          </h1>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column - Content */}
          <div className="space-y-8">
            {/* Document Title */}
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              {t('documentTitle')}
            </h2>

            {/* Document Image */}
            <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
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
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {t('reveals.title')}
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="text-[#5FA4E6] mt-1">•</span>
                  <span>{t('reveals.point1')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#5FA4E6] mt-1">•</span>
                  <span>{t('reveals.point2')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#5FA4E6] mt-1">•</span>
                  <span>{t('reveals.point3')}</span>
                </li>
              </ul>
            </div>

            {/* Document Overview */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {t('overview.title')}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {t('overview.description')}
              </p>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="bg-white rounded-lg shadow-xl p-8 border border-gray-200">
              <form className="space-y-5">
                {/* Last Name */}
                <div>
                  <label htmlFor="lastname" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('form.lastname.label')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="lastname"
                    name="lastname"
                    required
                    placeholder={t('form.lastname.placeholder')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5FA4E6] focus:border-transparent"
                  />
                </div>

                {/* Given Name */}
                <div>
                  <label htmlFor="givenname" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('form.givenname.label')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="givenname"
                    name="givenname"
                    required
                    placeholder={t('form.givenname.placeholder')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5FA4E6] focus:border-transparent"
                  />
                </div>

                {/* Company Name */}
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('form.company.label')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    required
                    placeholder={t('form.company.placeholder')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5FA4E6] focus:border-transparent"
                  />
                </div>

                {/* Industry */}
                <div>
                  <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('form.industry.label')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="industry"
                    name="industry"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5FA4E6] focus:border-transparent"
                  >
                    <option value="">{t('form.industry.placeholder')}</option>
                    <option value="it">{t('form.industry.options.it')}</option>
                    <option value="manufacturing">{t('form.industry.options.manufacturing')}</option>
                    <option value="retail">{t('form.industry.options.retail')}</option>
                    <option value="finance">{t('form.industry.options.finance')}</option>
                    <option value="healthcare">{t('form.industry.options.healthcare')}</option>
                    <option value="education">{t('form.industry.options.education')}</option>
                    <option value="other">{t('form.industry.options.other')}</option>
                  </select>
                </div>

                {/* Position */}
                <div>
                  <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('form.position.label')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="position"
                    name="position"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5FA4E6] focus:border-transparent"
                  >
                    <option value="">{t('form.position.placeholder')}</option>
                    <option value="executive">{t('form.position.options.executive')}</option>
                    <option value="manager">{t('form.position.options.manager')}</option>
                    <option value="staff">{t('form.position.options.staff')}</option>
                    <option value="other">{t('form.position.options.other')}</option>
                  </select>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('form.email.label')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    placeholder={t('form.email.placeholder')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5FA4E6] focus:border-transparent"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('form.phone.label')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    placeholder={t('form.phone.placeholder')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5FA4E6] focus:border-transparent"
                  />
                </div>

                {/* Privacy Policy */}
                <div className="flex items-center">
                  <input
                    id="privacy"
                    name="privacy"
                    type="checkbox"
                    required
                    className="h-4 w-4 text-[#5FA4E6] focus:ring-[#5FA4E6] border-gray-300 rounded"
                  />
                  <label htmlFor="privacy" className="ml-2 block text-sm text-gray-900">
                    <a href="/privacy-policy" className="text-[#5FA4E6] hover:underline">
                      {t('form.privacyPolicy')}
                    </a>
                    {t('form.privacyAgree')} <span className="text-red-500">*</span>
                  </label>
                </div>

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    className="w-full bg-[#5FA4E6] text-white font-semibold py-3 px-4 rounded-md shadow-md hover:bg-[#4A8FD1] transition-colors focus:outline-none focus:ring-2 focus:ring-[#5FA4E6] focus:ring-offset-2"
                  >
                    {t('form.submitButton')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <section className="relative py-20 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/bg_image.jpeg')" }}></div>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 whitespace-pre-line">
            {t('cta.title')}
          </h2>
          <p className="text-xl text-white mb-2">
            {t('cta.subtitle')}
          </p>
          <p className="text-white/80 mb-10 text-base max-w-2xl mx-auto">
            {t('cta.description')}
          </p>
          <a
            href="/contact"
            className="inline-flex items-center justify-center gap-3 w-full max-w-2xl mx-auto px-12 py-5 bg-[#5FA4E6] text-white rounded-full font-bold text-lg hover:bg-[#7AB5ED] transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {t('cta.button')}
          </a>
        </div>
      </section>
    </div>
  );
}
