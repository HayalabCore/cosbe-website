import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import PartnersHeroSection from '@/components/partners/PartnersHeroSection';
import PartnersWhySection from '@/components/partners/PartnersWhySection';
import PartnersLbpAxSection from '@/components/partners/PartnersLbpAxSection';
import PartnersSpecialtiesSection from '@/components/partners/PartnersSpecialtiesSection';
import CaseStudiesSection from '@/components/shared/CaseStudiesSection';
import CtaSection from '@/components/shared/CtaSection';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'partnersPage' });

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

export default async function PartnersPage() {
  const tCta = await getTranslations('homePage.cta');

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      <PartnersHeroSection />
      <PartnersWhySection />
      <PartnersLbpAxSection />
      <PartnersSpecialtiesSection />
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
