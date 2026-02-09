import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { notFound } from 'next/navigation';

type CaseStudyDetailProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

// Valid case study slugs
const validSlugs = ['kando', 'cosbe', '2month-ai-mvp'];

export default async function CaseStudyDetailPage({ params }: CaseStudyDetailProps) {
  const { slug } = await params;
  
  // Validate slug
  if (!validSlugs.includes(slug)) {
    notFound();
  }

  const t = await getTranslations(`caseStudyDetails.${slug}`);
  const commonT = await getTranslations('caseStudiesPage');

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-200 pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center text-sm text-gray-600">
            <Link href="/" className="hover:text-blue-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {commonT('breadcrumb.home')}
            </Link>
            <span className="mx-2">›</span>
            <Link href="/case-studies" className="hover:text-blue-600">
              {commonT('breadcrumb.caseStudies')}
            </Link>
            <span className="mx-2">›</span>
            <Link href="/case-studies/hr-improvement" className="hover:text-blue-600">
              {t('categoryName')}
            </Link>
            <span className="mx-2">›</span>
            <span className="text-gray-800">{t('title')}</span>
          </div>
        </div>
      </div>

      {/* Article Header */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
            {t('title')}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
            <time className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {t('publishDate')}
            </time>
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            <Link href="/case-studies" className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded hover:bg-blue-200 transition-colors">
              {commonT('categories.all')}
            </Link>
            <Link href="/case-studies/hr-improvement" className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded hover:bg-blue-200 transition-colors">
              {t('categoryName')}
            </Link>
          </div>
        </div>

        {/* Featured Image */}
        <div className="relative h-96 mb-8 rounded-lg overflow-hidden">
          <Image
            src={t('heroImage')}
            alt={t('title')}
            fill
            className="object-cover"
          />
        </div>

        {/* Table of Contents */}
        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 mb-12">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {t('tableOfContents.title')}
          </h2>
          <ol className="space-y-2 list-decimal list-inside text-slate-700">
            <li><a href="#background" className="hover:text-blue-600">{t('tableOfContents.background')}</a></li>
            <li><a href="#solution" className="hover:text-blue-600">{t('tableOfContents.solution')}</a></li>
            <li><a href="#benefits" className="hover:text-blue-600">{t('tableOfContents.benefits')}</a></li>
            <li><a href="#summary" className="hover:text-blue-600">{t('tableOfContents.summary')}</a></li>
          </ol>
        </div>

        {/* Main Content */}
        <div className="prose prose-lg max-w-none">
          {/* Section 1: Background */}
          <section id="background" className="mb-16">
            <div className="bg-white p-8 rounded-lg">
              <h2 className="text-3xl font-bold text-slate-800 mb-6 border-l-6 border-blue-500 pl-4">
                {t('section1.title')}
              </h2>
              
              <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-lg mb-6">
                <h3 className="text-2xl font-bold text-blue-600 mb-4">
                  {t('section1.subtitle')}
                </h3>
                <p className="text-slate-700 leading-relaxed mb-4">
                  {t('section1.challenge1')}
                </p>
                <p className="text-slate-700 leading-relaxed mb-4">
                  {t('section1.challenge2')}
                </p>
                <p className="text-slate-700 leading-relaxed">
                  {t('section1.challenge3')}
                </p>
              </div>

              {/* Company Info Table */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden mb-6">
                <h4 className="text-xl font-bold text-slate-800 bg-gray-100 px-6 py-4 border-b border-gray-200">
                  {t('companyInfo.title')}
                </h4>
                <table className="w-full">
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="px-6 py-4 bg-gray-100 font-semibold text-slate-700 w-1/4">{t('companyInfo.name')}</td>
                      <td className="px-6 py-4 text-slate-700">{t('companyInfo.nameValue')}</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-6 py-4 bg-gray-100 font-semibold text-slate-700">{t('companyInfo.location')}</td>
                      <td className="px-6 py-4 text-slate-700">{t('companyInfo.locationValue')}</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-6 py-4 bg-gray-100 font-semibold text-slate-700">{t('companyInfo.url')}</td>
                      <td className="px-6 py-4 text-slate-700">
                        <a href={t('companyInfo.urlValue')} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {t('companyInfo.urlValue')}
                        </a>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-6 py-4 bg-gray-100 font-semibold text-slate-700">{t('companyInfo.aiModel')}</td>
                      <td className="px-6 py-4 text-slate-700">
                        <div className="flex flex-wrap gap-2">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            {t('companyInfo.aiAgent')}
                          </span>
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            {t('companyInfo.llm')}
                          </span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 bg-gray-100 font-semibold text-slate-700">{t('companyInfo.challenges')}</td>
                      <td className="px-6 py-4 text-slate-700">{t('companyInfo.challengesValue')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Section 2: Solution */}
          <section id="solution" className="mb-16">
            <div className="bg-white p-8 rounded-lg">
              <h2 className="text-3xl font-bold text-slate-800 mb-6 border-l-6 border-blue-500 pl-4">
                {t('section2.title')}
              </h2>
              
              <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-lg mb-6">
                <h3 className="text-2xl font-bold text-blue-600 mb-4">
                  {t('section2.subtitle')}
                </h3>
                <p className="text-slate-700 leading-relaxed mb-6">
                  {t('section2.description')}
                </p>

                {/* Features List */}
                <div className="bg-white rounded-lg p-6 mb-6 border-l-4 border-green-500">
                  <ul className="space-y-4">
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2 mt-1">✓</span>
                      <div>
                        <span className="font-semibold text-slate-800">{t('section2.feature1Title')}</span>
                        <ul className="ml-6 mt-2 space-y-2 text-slate-600">
                          <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{t('section2.feature1Item1')}</span>
                          </li>
                        </ul>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2 mt-1">✓</span>
                      <div>
                        <span className="font-semibold text-slate-800">{t('section2.feature2Title')}</span>
                        <ul className="ml-6 mt-2 space-y-2 text-slate-600">
                          <li className="flex items-start"><span className="mr-2">•</span><span>{t('section2.feature2Item1')}</span></li>
                          <li className="flex items-start"><span className="mr-2">•</span><span>{t('section2.feature2Item2')}</span></li>
                          <li className="flex items-start"><span className="mr-2">•</span><span>{t('section2.feature2Item3')}</span></li>
                        </ul>
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Solution Image */}
                <div className="relative h-64 mb-6 rounded-lg overflow-hidden shadow-lg">
                  <Image
                    src="/case-studies/details/ai-agent-interface.png"
                    alt={t('section2.imageAlt')}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded">
                  <p className="text-slate-700 leading-relaxed">
                    {t('section2.note')}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Benefits */}
          <section id="benefits" className="mb-16">
            <div className="bg-white p-8 rounded-lg">
              <h2 className="text-3xl font-bold text-slate-800 mb-6 border-l-6 border-blue-500 pl-4">
                {t('section3.title')}
              </h2>
              
              <div className="space-y-8">
                {/* Benefit 1 */}
                <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-lg">
                  <h3 className="text-2xl font-bold text-blue-600 mb-4">
                    {t('section3.benefit1Title')}
                  </h3>
                  <p className="text-slate-700 leading-relaxed">
                    {t('section3.benefit1Description')}
                  </p>
                </div>

                {/* Benefit 2 */}
                <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-lg">
                  <h3 className="text-2xl font-bold text-blue-600 mb-4">
                    {t('section3.benefit2Title')}
                  </h3>
                  <p className="text-slate-700 leading-relaxed">
                    {t('section3.benefit2Description')}
                  </p>
                </div>

                {/* Benefit 3 */}
                <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-lg">
                  <h3 className="text-2xl font-bold text-blue-600 mb-4">
                    {t('section3.benefit3Title')}
                  </h3>
                  <p className="text-slate-700 leading-relaxed">
                    {t('section3.benefit3Description')}
                  </p>
                </div>

                {/* Key Points */}
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded">
                  <p className="font-semibold text-slate-800 mb-4">{t('section3.keyPointsIntro')}</p>
                  <ul className="space-y-3 text-slate-700">
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2 mt-1">✓</span>
                      <span>{t('section3.keyPoint1')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2 mt-1">✓</span>
                      <span>{t('section3.keyPoint2')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2 mt-1">✓</span>
                      <span>{t('section3.keyPoint3')}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Summary */}
          <section id="summary" className="mb-16">
            <div className="bg-white p-8 rounded-lg">
              <h2 className="text-3xl font-bold text-slate-800 mb-6 border-l-6 border-blue-500 pl-4">
                {t('section4.title')}
              </h2>
              
              <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-lg mb-6">
                <p className="text-slate-700 leading-relaxed mb-4">
                  {t('section4.paragraph1')}
                </p>
                <p className="text-slate-700 leading-relaxed">
                  {t('section4.paragraph2')}
                </p>
              </div>

              {/* CTA */}
              <div className="text-center bg-gradient-to-r from-blue-500 to-blue-600 text-white p-8 rounded-lg">
                <p className="text-xl font-bold mb-6">
                  {t('section4.ctaText')}
                </p>
                <Link href="/contact">
                  <button className="px-10 py-4 bg-white text-blue-600 text-lg font-bold rounded-full hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 inline-flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {t('section4.ctaButton')}
                  </button>
                </Link>
              </div>
            </div>
          </section>
        </div>

        {/* Share Buttons */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <div className="border-t border-gray-200 pt-8">
            <p className="text-center text-sm text-gray-600 mb-4">{t('shareText')}</p>
            <div className="flex justify-center gap-4">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </button>
              <button className="px-6 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
                Twitter
              </button>
              <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.513 5.24L13.856.297c-.557-.495-1.398-.495-1.955 0L6.244 5.24a2.667 2.667 0 00-.91 2.01v9.5c0 1.473 1.194 2.667 2.667 2.667h8.665c1.473 0 2.667-1.194 2.667-2.667v-9.5c0-.77-.34-1.5-.91-2.01zm-7.18 11.427c-2.269 0-4.108-1.839-4.108-4.108s1.839-4.108 4.108-4.108 4.108 1.839 4.108 4.108-1.839 4.108-4.108 4.108z"/>
                </svg>
                LINE
              </button>
            </div>
          </div>
        </div>

        {/* Author Section */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <div className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 border-l-4 border-blue-500 pl-4">
              {t('author.title')}
            </h2>
            <div className="flex gap-6 bg-gray-50 p-6 rounded-lg">
              <div className="flex-shrink-0">
                <Image
                  src="/case-studies/details/author-kenjiro.png"
                  alt={t('author.name')}
                  width={100}
                  height={100}
                  className="rounded-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-800 mb-1">{t('author.name')}</h3>
                <p className="text-sm text-gray-600 mb-3">{t('author.position')}</p>
                <p className="text-slate-700 leading-relaxed text-sm">
                  {t('author.bio')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Related Articles */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <div className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 border-l-4 border-blue-500 pl-4">
              {t('relatedArticles.title')}
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Link href="/case-studies/details/cosbe" className="group">
                <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100">
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src="/case-studies/resume-screening.png"
                      alt={t('relatedArticles.article1Title')}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {t('relatedArticles.article1Title')}
                    </h3>
                    <p className="text-sm text-gray-600 mt-2">{t('relatedArticles.article1Date')}</p>
                  </div>
                </div>
              </Link>
              <Link href="/case-studies/details/2month-ai-mvp" className="group">
                <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100">
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src="/case-studies/new-business-2months.png"
                      alt={t('relatedArticles.article2Title')}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {t('relatedArticles.article2Title')}
                    </h3>
                    <p className="text-sm text-gray-600 mt-2">{t('relatedArticles.article2Date')}</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA Section */}
      <div className="relative bg-gray-800 text-white py-16">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-800/80 to-gray-900/90"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {commonT('cta.title')}
          </h2>
          <p className="text-xl mb-4 opacity-90">
            {commonT('cta.subtitle')}
          </p>
          <p className="text-lg mb-6 opacity-80">
            {commonT('cta.description')}
          </p>
          <p className="text-base mb-8 opacity-80">
            {commonT('cta.message')}
          </p>
          <Link href="/contact">
            <button className="px-12 py-4 bg-blue-500 hover:bg-blue-600 text-white text-lg font-bold rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 inline-flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {commonT('cta.button')}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
