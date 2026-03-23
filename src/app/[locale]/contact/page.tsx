import { getTranslations } from 'next-intl/server';
import { HubSpotForm } from '@/components';
import { Link } from '@/i18n/routing';
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
    title: t('pageTitleInquiry'),
    description: t('description'),
    openGraph: {
      title: t('pageTitleInquiry'),
      description: t('description'),
      locale: locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  };
}

export default async function ContactPage() {
  const t = await getTranslations('contact');

  return (
    <div className="min-h-screen bg-white pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-textPrimary mb-4">
              <div>{t('pageTitlePrefix')}</div>
              <div className="text-primaryColor underline decoration-2 underline-offset-4">
                {t('pageTitleInquiry')}
              </div>
            </h1>
          </div>
          <p className="text-lg text-textSecondary leading-relaxed">
            {t('description')}
          </p>
        </div>

        {/* Progress Tracker */}
        <div className="mb-12">
          <ol className="flex items-center justify-center space-x-4 md:space-x-8">
            <li className="flex items-center">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-primaryColor text-white rounded-full font-semibold">
                  1
                </div>
                <span className="ml-3 text-sm font-medium text-textPrimary">
                  {t('form.progressTracker.input')}
                </span>
              </div>
            </li>
            <li className="flex items-center">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-borderSecondary text-textTertiary rounded-full font-semibold">
                  2
                </div>
                <span className="ml-3 text-sm font-medium text-textTertiary">
                  {t('form.progressTracker.confirm')}
                </span>
              </div>
            </li>
            <li className="flex items-center">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-borderSecondary text-textTertiary rounded-full font-semibold">
                  3
                </div>
                <span className="ml-3 text-sm font-medium text-textTertiary">
                  {t('form.progressTracker.complete')}
                </span>
              </div>
            </li>
          </ol>
        </div>

        {/* Contact Form - HubSpot Integration */}
        <div className="bg-white">
          <HubSpotForm />
        </div>

        {/* Privacy Policy */}
        <div className="mt-8 text-center">
          <p className="text-sm text-textTertiary">
            <Link
              href="/privacy-policy"
              className="text-primaryColor hover:underline"
            >
              {t('form.privacyPolicy')}
            </Link>
            {t('form.privacyPolicyAgree')}
          </p>
        </div>
      </div>
    </div>
  );
}
