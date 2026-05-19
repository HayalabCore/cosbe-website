import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Breadcrumb, CtaSection, SectionHeading } from '@/components';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'aboutAitPage' });

  return {
    title: t('meta.title'),
    description: t('meta.description'),
    openGraph: {
      title: t('meta.title'),
      description: t('meta.description'),
      locale: locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  };
}

export default async function AboutAitPage() {
  const t = await getTranslations('aboutAitPage');

  const principles = [
    {
      term: t('section3.principles.item1.term'),
      description: t('section3.principles.item1.description'),
    },
    {
      term: t('section3.principles.item2.term'),
      description: t('section3.principles.item2.description'),
    },
    {
      term: t('section3.principles.item3.term'),
      description: t('section3.principles.item3.description'),
    },
    {
      term: t('section3.principles.item4.term'),
      description: t('section3.principles.item4.description'),
    },
  ];

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-18 lg:pt-20">
      <Breadcrumb
        homeLabel={t('breadcrumb.home')}
        items={[{ label: t('breadcrumb.current') }]}
      />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <h1 className="text-2xl md:text-3xl font-bold text-textPrimary mb-12 md:mb-16 inline-block border-b-2 border-primaryColor pb-2">
          {t('title')}
        </h1>

        {/* Section 1 */}
        <section className="mb-14 md:mb-20">
          <SectionHeading>{t('section1.title')}</SectionHeading>
          <div className="relative w-full aspect-video mb-8 md:mb-10">
            <Image
              src="/ai-transformation/ai-transform-1.png"
              alt={t('section1.imageAlt')}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 768px"
              priority
            />
          </div>
          <p className="text-textSecondary leading-relaxed text-center mb-8 md:mb-10">
            {t('section1.intro')}
          </p>
          <p className="text-textSecondary leading-relaxed">
            {t('section1.body')}
          </p>
        </section>

        {/* Section 2 */}
        <section className="mb-14 md:mb-20">
          <SectionHeading>{t('section2.title')}</SectionHeading>
          <p className="text-textSecondary leading-relaxed mb-6">
            {t('section2.p1')}
          </p>
          <p className="text-textSecondary leading-relaxed">
            {t('section2.p2')}
          </p>
        </section>

        {/* Section 3 */}
        <section className="mb-14 md:mb-20">
          <SectionHeading>{t('section3.title')}</SectionHeading>
          <p className="text-textSecondary leading-relaxed mb-6">
            {t('section3.p1')}
          </p>
          <p className="text-textSecondary leading-relaxed mb-8 md:mb-10">
            {t('section3.p2')}
          </p>

          <div className="border border-borderPrimary rounded-sm bg-white px-6 py-8 md:px-8 md:py-10">
            <h3 className="text-lg font-bold text-textPrimary mb-4">
              {t('section3.principles.title')}
            </h3>
            <hr className="border-t border-primaryColor/40 mb-6" />
            <ul className="space-y-5 list-disc pl-5 marker:text-textPrimary">
              {principles.map((item) => (
                <li
                  key={item.term}
                  className="text-textSecondary leading-relaxed pl-1"
                >
                  <strong className="font-bold text-textPrimary">
                    {item.term}
                  </strong>
                  {item.description}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Section 4 */}
        <section className="mb-4">
          <SectionHeading>{t('section4.title')}</SectionHeading>
          <div className="relative w-full aspect-video mb-8 md:mb-10">
            <Image
              src="/ai-transformation/ai-transform-2.png"
              alt={t('section4.imageAlt')}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
          <p className="text-textSecondary leading-relaxed mb-6">
            {t('section4.p1')}
          </p>
          <p className="text-textSecondary leading-relaxed mb-6">
            {t('section4.p2')}
          </p>
          <p className="text-textSecondary leading-relaxed">
            {t('section4.p3')}
          </p>
        </section>
      </article>

      <CtaSection
        title={t('cta.title')}
        description={t('cta.description')}
        additionalText={t('cta.additionalText')}
        buttonText={t('cta.button')}
        buttonHref="/contact"
      />
    </div>
  );
}
