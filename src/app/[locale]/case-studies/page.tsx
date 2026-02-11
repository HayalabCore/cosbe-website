import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/routing';

export default async function CaseStudiesPage() {
  const t = await getTranslations('caseStudiesPage');

  const caseStudies = [
    {
      id: 1,
      slug: '2month-ai-mvp',
      image: '/case-studies/new-business-2months.png',
      category: t('case1.category'),
      title: t('case1.title'),
      date: t('case1.date'),
      author: t('case1.author'),
    },
    {
      id: 2,
      slug: 'kando',
      image: '/case-studies/training-instructor.png',
      category: t('case2.category'),
      title: t('case2.title'),
      date: t('case2.date'),
      author: t('case2.author'),
    },
    {
      id: 3,
      slug: 'cosbe',
      image: '/case-studies/resume-screening.png',
      category: t('case3.category'),
      title: t('case3.title'),
      date: t('case3.date'),
      author: t('case3.author'),
    },
  ];

  const categories = [
    { id: 'all', label: t('categories.all'), href: '/case-studies', active: true },
    { id: 'efficiency', label: t('categories.efficiency'), href: '/case-studies/efficiency', active: false },
    { id: 'hrImprovement', label: t('categories.hrImprovement'), href: '/case-studies/hr-improvement', active: false },
    { id: 'innovation', label: t('categories.innovation'), href: '/case-studies/innovation', active: false },
    { id: 'customerMarketing', label: t('categories.customerMarketing'), href: '/case-studies/customer-marketing', active: false },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section with Background */}
      <div className="relative min-h-[280px] flex flex-col items-start justify-center overflow-hidden px-4 bg-gradient-to-br from-primaryColor/80 to-primaryColor/90">
        <div className="absolute inset-0 bg-gradient-to-b from-primaryColor/40 to-primaryColor/60"></div>
        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              {t('heroTitle')}
            </h1>
            <p className="text-lg md:text-xl text-white/90 font-light tracking-wide">
              {t('heroSubtitle')}
            </p>
          </div>
          
          {/* Category Tags */}
          <div className="flex flex-wrap gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={cat.href}
                className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                  cat.active
                    ? 'bg-primaryColor text-white border-2 border-white'
                    : 'bg-white/20 text-white border border-white/50 hover:bg-white/30'
                }`}
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-bgSecondary border-b border-borderPrimary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center text-sm text-textTertiary">
            <Link href="/" className="hover:text-primaryColor flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {t('breadcrumb.home')}
            </Link>
            <span className="mx-2">›</span>
            <span className="text-textPrimary">{t('breadcrumb.caseStudies')}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-bgAccent py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Case Studies Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            {caseStudies.map((study) => (
              <Link key={study.id} href={`/case-studies/details/${study.slug}`}>
                <div className="group bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-primaryColor/20 hover:border-primaryColor cursor-pointer">
                  <div className="relative h-64 overflow-hidden">
                    <Image
                      src={study.image}
                      alt={study.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-4 right-4">
                      <span className="px-4 py-1.5 bg-primaryColor/90 backdrop-blur-sm text-white text-sm font-semibold rounded">
                        {study.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-textPrimary mb-4 line-clamp-2 group-hover:text-primaryColor transition-colors">
                      {study.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-textTertiary">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{study.date}</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-full bg-borderSecondary mr-2"></div>
                        <span>{study.author}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-center mb-16">
            <div className="flex items-center gap-2">
              <span className="px-4 py-2 bg-primaryColor text-white rounded font-semibold">1</span>
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
          <p className="text-white/80 mb-2 text-base">
            {t('cta.description')}
          </p>
          <p className="text-white/80 mb-10 text-base">
            {t('cta.message')}
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
