import { getTranslations } from 'next-intl/server';

export default async function ContactPage() {
  const t = await getTranslations('contact');

  return (
    <div className="min-h-screen bg-white pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              <div>{t('pageTitlePrefix')}</div>
              <div className="text-blue-500 underline decoration-2 underline-offset-4">{t('pageTitleInquiry')}</div>
            </h1>
          </div>
          <p className="text-lg text-gray-700 leading-relaxed">
            {t('description')}
          </p>
        </div>

        {/* Progress Tracker */}
        <div className="mb-12">
          <ol className="flex items-center justify-center space-x-4 md:space-x-8">
            <li className="flex items-center">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full font-semibold">
                  1
                </div>
                <span className="ml-3 text-sm font-medium text-gray-900">
                  {t('form.progressTracker.input')}
                </span>
              </div>
            </li>
            <li className="flex items-center">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-300 text-gray-600 rounded-full font-semibold">
                  2
                </div>
                <span className="ml-3 text-sm font-medium text-gray-500">
                  {t('form.progressTracker.confirm')}
                </span>
              </div>
            </li>
            <li className="flex items-center">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-300 text-gray-600 rounded-full font-semibold">
                  3
                </div>
                <span className="ml-3 text-sm font-medium text-gray-500">
                  {t('form.progressTracker.complete')}
                </span>
              </div>
            </li>
          </ol>
        </div>

        {/* Contact Form */}
        <div className="bg-white">
          <form className="space-y-6">
            {/* Full Name */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700">
                  {t('form.fields.fullname.label')}
                  <span className="ml-2 inline-block bg-red-500 text-white text-xs px-2 py-0.5 rounded">
                    {t('form.fields.required')}
                  </span>
                </label>
              </div>
              <div className="md:col-span-2">
                <input
                  type="text"
                  name="fullname"
                  placeholder={t('form.fields.fullname.placeholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Company Name */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700">
                  {t('form.fields.companyname.label')}
                  <span className="ml-2 inline-block bg-red-500 text-white text-xs px-2 py-0.5 rounded">
                    {t('form.fields.required')}
                  </span>
                </label>
              </div>
              <div className="md:col-span-2">
                <input
                  type="text"
                  name="companyname"
                  placeholder={t('form.fields.companyname.placeholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Position */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700">
                  {t('form.fields.position.label')}
                </label>
              </div>
              <div className="md:col-span-2">
                <input
                  type="text"
                  name="position"
                  placeholder={t('form.fields.position.placeholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Email */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700">
                  {t('form.fields.email.label')}
                  <span className="ml-2 inline-block bg-red-500 text-white text-xs px-2 py-0.5 rounded">
                    {t('form.fields.required')}
                  </span>
                </label>
              </div>
              <div className="md:col-span-2">
                <input
                  type="email"
                  name="email"
                  placeholder={t('form.fields.email.placeholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700">
                  {t('form.fields.tel.label')}
                  <span className="ml-2 inline-block bg-red-500 text-white text-xs px-2 py-0.5 rounded">
                    {t('form.fields.required')}
                  </span>
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  {t('form.fields.tel.description')}
                </p>
              </div>
              <div className="md:col-span-2">
                <input
                  type="tel"
                  name="tel"
                  placeholder={t('form.fields.tel.placeholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Inquiry Type */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700">
                  {t('form.fields.inquiryType.label')}
                  <span className="ml-2 inline-block bg-red-500 text-white text-xs px-2 py-0.5 rounded">
                    {t('form.fields.required')}
                  </span>
                </label>
              </div>
              <div className="md:col-span-2">
                <select
                  name="inquiryType"
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">{t('form.fields.inquiryType.options.default')}</option>
                  <option value="ai-development">{t('form.fields.inquiryType.options.aiDevelopment')}</option>
                  <option value="service-inquiry">{t('form.fields.inquiryType.options.serviceInquiry')}</option>
                  <option value="recruitment">{t('form.fields.inquiryType.options.recruitment')}</option>
                  <option value="other">{t('form.fields.inquiryType.options.other')}</option>
                </select>
              </div>
            </div>

            {/* Message */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700">
                  {t('form.fields.message.label')}
                  <span className="ml-2 inline-block bg-red-500 text-white text-xs px-2 py-0.5 rounded">
                    {t('form.fields.required')}
                  </span>
                </label>
              </div>
              <div className="md:col-span-2">
                <textarea
                  name="message"
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                ></textarea>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-6">
              <button
                type="submit"
                className="px-12 py-4 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700 transition-colors"
              >
                {t('form.submitButton')}
              </button>
            </div>
          </form>
        </div>

        {/* Privacy Policy */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            <a href="/privacy-policy" className="text-blue-600 hover:underline">
              {t('form.privacyPolicy')}
            </a>
            {t('form.privacyPolicyAgree')}
          </p>
        </div>
      </div>
    </div>
  );
}
