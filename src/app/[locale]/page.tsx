import { getTranslations } from 'next-intl/server';
import HomeHeroSection from '@/components/home/HomeHeroSection';
import HomeSideTabs from '@/components/home/HomeSideTabs';
import HomePoemSection from '@/components/home/HomePoemSection';
import HomeMethodologySection from '@/components/home/HomeMethodologySection';
import HomeStrengthsSection from '@/components/home/HomeStrengthsSection';
import HomeTeamSection from '@/components/home/HomeTeamSection';
import HomePartnersSection from '@/components/home/HomePartnersSection';
import HomeLearnSection from '@/components/home/HomeLearnSection';
import CaseStudiesSection from '@/components/shared/CaseStudiesSection';
import CtaSection from '@/components/shared/CtaSection';
import type { Metadata } from 'next';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'hero' });

  const title = `CosBE - ${t('headline')}`;
  const description = `${t('eyebrow')} — ${t('headline')}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      locale: locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  };
}

export default async function Home({ params }: PageProps) {
  const { locale } = await params;
  const tCta = await getTranslations('homePage.cta');

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      <HomeSideTabs />
      <HomeHeroSection />
      <HomePoemSection />
      <HomeMethodologySection />
      <HomeStrengthsSection />
      <CaseStudiesSection />
      <HomeTeamSection />
      <HomePartnersSection />
      <HomeLearnSection locale={locale} />
      <CtaSection
        title={tCta('title')}
        description={tCta('description')}
        buttonText={tCta('button')}
        buttonHref="/contact"
      />
    </div>
  );
}
