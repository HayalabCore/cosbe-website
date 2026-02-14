import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/routing';

export default async function CompanyPage() {
  const t = await getTranslations('companyPage');

  return (
    <div className="min-h-screen bg-white pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Title */}
        <div className="text-center py-12 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-textPrimary mb-4 inline-block border-b-4 border-primaryColor pb-2">
            {t('pageTitle')}
          </h1>
        </div>
        
        {/* About CosBE Section */}
        <section className="py-16 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-bgAccent">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-textPrimary mb-4 inline-block border-b-4 border-primaryColor pb-2">
              {t('about.title')}
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto items-start">
            <div className="flex justify-center">
              <Image
                src="/ceo-photo.png"
                alt={t('about.ceoPhotoAlt')}
                width={300}
                height={400}
                className="rounded-lg shadow-lg"
                priority
              />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-primaryColor mb-4">
                {t('about.heading')}
              </h3>
              <p className="text-base text-textSecondary leading-relaxed mb-6">
                {t('about.message')}
              </p>
              <p className="text-sm text-textTertiary font-semibold">
                {t('about.ceo')}
              </p>
            </div>
          </div>
        </section>

        {/* Our Vision Section */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-textPrimary mb-4 inline-block border-b-4 border-primaryColor pb-2">
              {t('vision.title')}
            </h2>
          </div>
          
          <div className="max-w-4xl mx-auto text-center mb-12">
            <p className="text-lg md:text-xl text-textSecondary leading-relaxed">
              {t('vision.description')}
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Image
              src="/vision.png"
              alt={t('vision.imageAlt')}
              width={1200}
              height={800}
              className="w-full h-auto"
              priority
            />
          </div>
        </section>

        {/* History Section */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-textPrimary mb-4 inline-block border-b-4 border-primaryColor pb-2">
              {t('history.title')}
            </h2>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="relative">
              {/* Timeline */}
              <div className="space-y-12">
                {/* Event 1 */}
                <div className="flex items-start gap-8">
                  <div className="flex-1 text-right">
                    <div className="bg-white border border-borderPrimary rounded-lg p-6 shadow-sm inline-block">
                      <h3 className="text-primaryColor font-bold text-lg mb-2">
                        {t('history.event1.date')}
                      </h3>
                      <p className="font-semibold text-textPrimary mb-1">
                        {t('history.event1.title')}
                      </p>
                      <p className="text-sm text-textTertiary">
                        {t('history.event1.description')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-4 h-4 bg-primaryColor rounded-full"></div>
                    <div className="w-0.5 h-24 bg-primaryLight"></div>
                  </div>
                  <div className="flex-1"></div>
                </div>

                {/* Event 2 */}
                <div className="flex items-start gap-8">
                  <div className="flex-1"></div>
                  <div className="flex flex-col items-center">
                    <div className="w-4 h-4 bg-primaryColor rounded-full"></div>
                    <div className="w-0.5 h-24 bg-primaryLight"></div>
                  </div>
                  <div className="flex-1">
                    <div className="bg-white border border-borderPrimary rounded-lg p-6 shadow-sm inline-block">
                      <h3 className="text-primaryColor font-bold text-lg mb-2">
                        {t('history.event2.date')}
                      </h3>
                      <p className="font-semibold text-textPrimary mb-1">
                        {t('history.event2.title')}
                      </p>
                      <p className="text-sm text-textTertiary">
                        {t('history.event2.description')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Event 3 */}
                <div className="flex items-start gap-8">
                  <div className="flex-1 text-right">
                    <div className="bg-white border border-borderPrimary rounded-lg p-6 shadow-sm inline-block">
                      <h3 className="text-primaryColor font-bold text-lg mb-2">
                        {t('history.event3.date')}
                      </h3>
                      <p className="font-semibold text-textPrimary mb-1">
                        {t('history.event3.title')}
                      </p>
                      <p className="text-sm text-textTertiary">
                        {t('history.event3.description')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-4 h-4 bg-primaryColor rounded-full"></div>
                  </div>
                  <div className="flex-1"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Company Profile Section */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-textPrimary mb-4 inline-block border-b-4 border-primaryColor pb-2">
              {t('overview.title')}
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-white border border-borderPrimary rounded-lg overflow-hidden shadow-sm">
              <table className="w-full">
                <tbody>
                  <tr className="border-b border-borderPrimary">
                    <td className="px-6 py-4 bg-bgSecondary font-semibold text-textPrimary w-1/3">
                      {t('overview.companyName')}
                    </td>
                    <td className="px-6 py-4 text-textSecondary">
                      CosBE Incorporated
                    </td>
                  </tr>
                  <tr className="border-b border-borderPrimary">
                    <td className="px-6 py-4 bg-bgSecondary font-semibold text-textPrimary">
                      {t('overview.location')}
                    </td>
                    <td className="px-6 py-4 text-textSecondary">
                      3 East Third Ave San Mateo, CA, U.S.A
                    </td>
                  </tr>
                  <tr className="border-b border-borderPrimary">
                    <td className="px-6 py-4 bg-bgSecondary font-semibold text-textPrimary">
                      {t('overview.established')}
                    </td>
                    <td className="px-6 py-4 text-textSecondary">
                      {t('overview.establishedDate')}
                    </td>
                  </tr>
                  <tr className="border-b border-borderPrimary">
                    <td className="px-6 py-4 bg-bgSecondary font-semibold text-textPrimary">
                      {t('overview.representative')}
                    </td>
                    <td className="px-6 py-4 text-textSecondary">
                      {t('overview.representativeName')}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 bg-bgSecondary font-semibold text-textPrimary">
                      {t('overview.business')}
                    </td>
                    <td className="px-6 py-4 text-textSecondary">
                      <div>{t('overview.business1')}</div>
                      <div>{t('overview.business2')}</div>
                      <div>{t('overview.business3')}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Global One Team Section */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-textPrimary mb-4 inline-block border-b-4 border-primaryColor pb-2">
              {t('globalTeam.title')}
            </h2>
          </div>

          <div className="text-center mb-12">
            <p className="text-lg text-textSecondary">
              {t('globalTeam.subtitle')}
            </p>
          </div>

          {/* World Map */}
          <div className="max-w-5xl mx-auto mb-12 bg-bgSecondary rounded-2xl p-8">
            <Image
              src="/cosbe-worldmap.png"
              alt={t('globalTeam.mapAlt')}
              width={1200}
              height={700}
              className="w-full h-auto"
              priority
            />
          </div>

          {/* Team Description */}
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-primaryColor mb-2 inline-block border-b-4 border-primaryColor pb-2">
                {t('globalTeam.teamTitle')}
              </h3>
            </div>
            
            <div className="space-y-6 text-textSecondary leading-relaxed">
              <p>{t('globalTeam.description1')}</p>
              <p>{t('globalTeam.description2')}</p>
              <p>{t('globalTeam.description3')}</p>
            </div>
          </div>
        </section>

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
            <p className="text-white/80 mb-10 text-base max-w-3xl mx-auto">
              {t('cta.description')}
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
