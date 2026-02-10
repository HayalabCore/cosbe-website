import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'caseStudy2MonthAI' });

  return {
    title: t('title'),
    description: t('meta.description'),
    keywords: t('meta.keywords'),
  };
}

export default function CaseStudy2MonthAI() {
  const t = useTranslations('caseStudy2MonthAI');
  const nav = useTranslations('navbar');

  const tableOfContents = [
    { id: 'introduction', title: t('sections.introduction.title') },
    { id: 'overview', title: t('sections.overview.title') },
    { id: 'issues-background', title: t('sections.issuesBackground.title') },
    { id: 'solutions', title: t('sections.solutions.title') },
    { id: 'results', title: t('sections.results.title') },
    { id: 'summary', title: t('sections.summary.title') },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <nav className="bg-gray-50 py-4">
        <div className="container mx-auto px-4">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <Link href="/" className="text-[#5FA4E6] hover:underline">
                {t('breadcrumb.home')}
              </Link>
            </li>
            <li className="text-gray-500">/</li>
            <li>
              <Link href="/case-studies" className="text-[#5FA4E6] hover:underline">
                {t('breadcrumb.caseStudies')}
              </Link>
            </li>
            <li className="text-gray-500">/</li>
            <li>
              <span className="text-[#5FA4E6]">{t('breadcrumb.innovation')}</span>
            </li>
            <li className="text-gray-500">/</li>
            <li className="text-gray-700">{t('title')}</li>
          </ol>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1 order-2 lg:order-1">
            <div className="sticky top-24 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="font-bold text-lg mb-4 text-[#5FA4E6]">
                {t('tableOfContents')}
              </h3>
              <nav>
                <ul className="space-y-3">
                  {tableOfContents.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="text-sm text-gray-700 hover:text-[#5FA4E6] transition-colors block"
                      >
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </aside>

          {/* Article Content */}
          <article className="lg:col-span-3 order-1 lg:order-2">
            {/* Header */}
            <header className="mb-8">
              <div className="mb-4">
                <span className="inline-block bg-[#5FA4E6]/15 text-[#3A7AB8] text-xs font-semibold px-3 py-1 rounded-full mr-2">
                  {t('categories.0')}
                </span>
                <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                  {t('categories.1')}
                </span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {t('title')}
              </h1>
              <time className="text-gray-500 text-sm">{t('publishedDate')}</time>
            </header>

            {/* Featured Image */}
            <div className="mb-8 rounded-lg overflow-hidden shadow-lg">
              <Image
                src="/case-studies/details/2month-ai-mvp-hero.svg"
                alt={t('title')}
                width={1200}
                height={675}
                className="w-full h-auto"
                priority
              />
            </div>

            {/* Table of Contents - Mobile */}
            <div className="lg:hidden bg-[#5FA4E6]/10 border-t-4 border-b-4 border-[#5FA4E6] rounded-lg p-6 mb-8">
              <h2 className="font-bold text-lg mb-4 text-[#5FA4E6] flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                </svg>
                {t('tableOfContents')}
              </h2>
              <ol className="space-y-2 list-decimal list-inside">
                {tableOfContents.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} className="text-gray-700 hover:text-[#5FA4E6]">
                      {item.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>

            {/* Content Sections */}
            <div className="prose prose-lg max-w-none">
              {/* Introduction */}
              <section id="introduction" className="mb-12 scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 border-l-4 border-[#5FA4E6] pl-4">
                  {t('sections.introduction.title')}
                </h2>
                <div className="space-y-4 text-gray-700">
                  <p className="text-lg">{t('sections.introduction.paragraph1')}</p>
                  <p>{t('sections.introduction.paragraph2')}</p>
                  <p>{t('sections.introduction.paragraph3')}</p>
                  <p>{t('sections.introduction.paragraph4')}</p>
                </div>
              </section>

              {/* Overview */}
              <section id="overview" className="mb-12 scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 border-l-4 border-[#5FA4E6] pl-4">
                  {t('sections.overview.title')}
                </h2>
                <div className="space-y-4 text-gray-700">
                  <p className="text-lg font-semibold">{t('sections.overview.intro')}</p>
                  <p>{t('sections.overview.description')}</p>
                  <ul className="space-y-3 my-6">
                    {[0, 1, 2].map((i) => (
                      <li key={i} className="flex items-start">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#5FA4E6] text-white font-bold mr-3 flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="pt-1">{t(`sections.overview.factors.${i}`)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="bg-[#5FA4E6]/10 border-l-4 border-[#5FA4E6] p-6 rounded-r-lg">
                    <h3 className="font-bold text-[#2E6699] mb-2 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                      </svg>
                      {t('sections.overview.mvpDefinition.title')}
                    </h3>
                    <p className="text-gray-700">{t('sections.overview.mvpDefinition.description')}</p>
                  </div>
                </div>
              </section>

              {/* Issues Background */}
              <section id="issues-background" className="mb-12 scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 border-l-4 border-[#5FA4E6] pl-4">
                  {t('sections.issuesBackground.title')}
                </h2>
                <div className="space-y-6 text-gray-700">
                  <div>
                    <h3 className="text-xl font-bold text-[#5FA4E6] mb-4">
                      {t('sections.issuesBackground.speedIsKey.title')}
                    </h3>
                    <p className="mb-4">{t('sections.issuesBackground.speedIsKey.paragraph1')}</p>
                    <p className="mb-4">{t('sections.issuesBackground.speedIsKey.paragraph2')}</p>
                    <ul className="space-y-3 mb-4">
                      {[0, 1, 2].map((i) => (
                        <li key={i} className="flex items-start">
                          <svg className="w-6 h-6 text-red-500 mr-3 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                          </svg>
                          <span>{t(`sections.issuesBackground.speedIsKey.challenges.${i}`)}</span>
                        </li>
                      ))}
                    </ul>
                    <p>{t('sections.issuesBackground.speedIsKey.clientSituation')}</p>
                  </div>

                  {/* Company Info Table */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-bold text-lg mb-4">{t('sections.issuesBackground.companyInfo.title')}</h4>
                    <table className="w-full">
                      <tbody className="divide-y divide-gray-200">
                        <tr>
                          <td className="py-3 pr-4 font-semibold bg-gray-100 w-1/3">{t('sections.issuesBackground.companyInfo.title')}</td>
                          <td className="py-3">{t('sections.issuesBackground.companyInfo.companyName')}</td>
                        </tr>
                        <tr>
                          <td className="py-3 pr-4 font-semibold bg-gray-100">{t('sections.issuesBackground.companyInfo.location')}</td>
                          <td className="py-3">{t('sections.issuesBackground.companyInfo.location')}</td>
                        </tr>
                        <tr>
                          <td className="py-3 pr-4 font-semibold bg-gray-100">{t('sections.issuesBackground.companyInfo.implementedAI')}</td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-2">
                              <span className="inline-block bg-[#5FA4E6]/15 text-[#3A7AB8] text-xs px-2 py-1 rounded">
                                {t('tags.0')}
                              </span>
                              <span className="inline-block bg-[#5FA4E6]/15 text-[#3A7AB8] text-xs px-2 py-1 rounded">
                                {t('tags.1')}
                              </span>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 pr-4 font-semibold bg-gray-100">{t('sections.issuesBackground.companyInfo.keyChallenges').split(':')[0]}</td>
                          <td className="py-3">{t('sections.issuesBackground.companyInfo.keyChallenges').split(':')[1]}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              {/* Solutions */}
              <section id="solutions" className="mb-12 scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 border-l-4 border-[#5FA4E6] pl-4">
                  {t('sections.solutions.title')}
                </h2>
                <div className="space-y-6 text-gray-700">
                  <div>
                    <h3 className="text-xl font-bold text-[#5FA4E6] mb-4">
                      {t('sections.solutions.approach.title')}
                    </h3>
                    <p className="mb-4">{t('sections.solutions.approach.intro')}</p>
                    <p className="mb-4">{t('sections.solutions.approach.paragraph')}</p>
                    <ul className="space-y-3">
                      {[0, 1, 2].map((i) => (
                        <li key={i} className="flex items-start">
                          <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                          </svg>
                          <span>{t(`sections.solutions.approach.policies.${i}`)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-[#5FA4E6] mb-4">
                      {t('sections.solutions.ragLlm.title')}
                    </h3>
                    <p className="mb-4">{t('sections.solutions.ragLlm.intro')}</p>
                    <p className="mb-4">{t('sections.solutions.ragLlm.mainFlow')}</p>
                    <ol className="space-y-3 mb-4">
                      {[0, 1, 2].map((i) => (
                        <li key={i} className="flex items-start">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#5FA4E6] text-white font-bold mr-3 flex-shrink-0">
                            {i + 1}
                          </span>
                          <span className="pt-1">{t(`sections.solutions.ragLlm.steps.${i}`)}</span>
                        </li>
                      ))}
                    </ol>
                    <p className="mb-4">{t('sections.solutions.ragLlm.conclusion')}</p>
                    <div className="bg-[#5FA4E6]/10 border-l-4 border-[#5FA4E6] p-6 rounded-r-lg space-y-3">
                      {[0, 1].map((i) => (
                        <div key={i}>
                          <p className="text-gray-700">
                            <strong className="text-[#2E6699]">
                              {t(`sections.solutions.ragLlm.definitions.${i}`).split('?')[0]}?
                            </strong>
                            {' '}
                            {t(`sections.solutions.ragLlm.definitions.${i}`).split('?')[1]}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Results */}
              <section id="results" className="mb-12 scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 border-l-4 border-[#5FA4E6] pl-4">
                  {t('sections.results.title')}
                </h2>
                <div className="space-y-6 text-gray-700">
                  <div>
                    <h3 className="text-xl font-bold text-[#5FA4E6] mb-4">
                      {t('sections.results.prototype.title')}
                    </h3>
                    <p className="mb-4">{t('sections.results.prototype.paragraph1')}</p>
                    <p>{t('sections.results.prototype.paragraph2')}</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-[#5FA4E6] mb-4">
                      {t('sections.results.smallStart.title')}
                    </h3>
                    <p className="mb-4">{t('sections.results.smallStart.paragraph1')}</p>
                    <p>{t('sections.results.smallStart.paragraph2')}</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-[#5FA4E6] mb-4">
                      {t('sections.results.flexibleImprovement.title')}
                    </h3>
                    <p>{t('sections.results.flexibleImprovement.paragraph')}</p>
                  </div>
                </div>
              </section>

              {/* Summary */}
              <section id="summary" className="mb-12 scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 border-l-4 border-[#5FA4E6] pl-4">
                  {t('sections.summary.title')}
                </h2>
                <div className="space-y-4 text-gray-700">
                  <p>{t('sections.summary.intro')}</p>
                  <ol className="space-y-3 my-6">
                    {[0, 1, 2].map((i) => (
                      <li key={i} className="flex items-start">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#5FA4E6] text-white font-bold mr-3 flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="pt-1">{t(`sections.summary.keyPoints.${i}`)}</span>
                      </li>
                    ))}
                  </ol>
                  <p>{t('sections.summary.conclusion1')}</p>
                  <p>{t('sections.summary.conclusion2')}</p>
                  <p className="font-semibold">{t('sections.summary.conclusion3')}</p>
                </div>
              </section>
            </div>

            {/* CTA Section */}
            <div className="relative mt-12 py-16 md:py-20 overflow-hidden">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/bg_image.jpeg')" }}></div>
              <div className="absolute inset-0 bg-black/60" />
              <div className="relative z-10 text-center px-8">
                <p className="text-xl font-bold text-white mb-6">{t('cta.title')}</p>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-3 px-12 py-5 bg-[#5FA4E6] text-white rounded-full font-bold text-lg hover:bg-[#7AB5ED] transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {t('cta.button')}
                </Link>
              </div>
            </div>

            {/* Share Section */}
            <div className="mt-8 border-t border-gray-200 pt-6">
              <p className="text-center text-gray-600 mb-4">{t('shareText')}</p>
              <div className="flex justify-center space-x-4">
                <button className="bg-[#5FA4E6] text-white p-3 rounded-full hover:bg-[#4A8FD1]">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </button>
                <button className="bg-sky-500 text-white p-3 rounded-full hover:bg-sky-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </button>
                <button className="bg-green-600 text-white p-3 rounded-full hover:bg-green-700">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Related Articles */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('relatedArticlesTitle')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Placeholder for related articles */}
                <Link href="/case-studies/details/kando" className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-gray-200"></div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2">Related Case Study 1</h3>
                    <p className="text-sm text-gray-600">Brief description...</p>
                  </div>
                </Link>
                <Link href="/case-studies/details/cosbe" className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-gray-200"></div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2">Related Case Study 2</h3>
                    <p className="text-sm text-gray-600">Brief description...</p>
                  </div>
                </Link>
              </div>
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}
