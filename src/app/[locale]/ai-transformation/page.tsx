import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import AxHeroSection from '@/components/ax/AxHeroSection';
import AxComparisonSection from '@/components/ax/AxComparisonSection';
import AxPhasesSection from '@/components/ax/AxPhasesSection';
import AxPrinciplesSection from '@/components/ax/AxPrinciplesSection';
import CaseStudiesSection from '@/components/shared/CaseStudiesSection';
import CtaSection from '@/components/shared/CtaSection';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'axPage' });

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      locale: locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  };
}

export default async function AiTransformationPage() {
  const tCta = await getTranslations('homePage.cta');

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      <AxHeroSection />
      <AxComparisonSection />
      <AxPhasesSection />
      <AxPrinciplesSection />
      <CaseStudiesSection />
      <CtaSection
        title={tCta('title')}
        description={tCta('description')}
        buttonText={tCta('button')}
        buttonHref="/contact"
      />
    </div>
  );
}
