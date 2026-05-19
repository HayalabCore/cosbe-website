import { getTranslations } from 'next-intl/server';
import {
  CtaSection,
  Breadcrumb,
  PageHero,
  PAGE_HERO_PRESETS,
} from '@/components';
import PrivacyPolicyBody from '@/components/legal/PrivacyPolicyBody';
import type { Metadata } from 'next';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'privacyPolicyPage' });

  return {
    title: t('heroTitle'),
    description: t('heroSubtitle'),
    openGraph: {
      title: t('heroTitle'),
      description: t('heroSubtitle'),
      locale: locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  };
}

export default async function PrivacyPolicyPage() {
  const t = await getTranslations('privacyPolicyPage');

  return (
    <main className="min-h-screen bg-white">
      <PageHero
        {...PAGE_HERO_PRESETS.centered}
        title={t('heroTitle')}
        subtitle={t('heroSubtitle')}
        media="image"
        backgroundImage="/company/privacy-hero.jpeg"
        backgroundImageAlt="Privacy Policy Background"
        overlayClassName="bg-primaryColor/60"
      />

      <Breadcrumb
        homeLabel={t('breadcrumb.home')}
        items={[{ label: t('breadcrumb.privacyPolicy') }]}
      />

      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-4xl px-4">
          <PrivacyPolicyBody />
        </div>
      </section>

      <CtaSection
        title={t('cta.title')}
        description={t('cta.description1')}
        additionalText={t('cta.description2')}
        buttonText={t('cta.button')}
      />
    </main>
  );
}
