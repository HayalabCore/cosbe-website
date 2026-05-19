import { getTranslations } from 'next-intl/server';
import { HubSpotFormCard, PageHero, PAGE_HERO_PRESETS } from '@/components';
import type { Metadata } from 'next';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact' });

  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('title'),
      description: t('description'),
      locale: locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  };
}

export default async function ContactPage() {
  const t = await getTranslations('contact');

  return (
    <div className="min-h-screen">
      <PageHero
        {...PAGE_HERO_PRESETS.centered}
        title={t('title')}
        subtitle={t('subtitle')}
      />

      <section className="bg-bgSecondary py-16 md:py-20 lg:py-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-12 xl:px-16">
          <p className="mx-auto mb-12 max-w-3xl text-center text-lg leading-relaxed text-textSecondary md:mb-16 md:text-xl lg:max-w-4xl">
            {t('description')}
          </p>

          <div className="flex justify-center lg:px-8">
            <HubSpotFormCard className="w-full" />
          </div>
        </div>
      </section>
    </div>
  );
}
