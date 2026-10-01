import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/routing';

const bracket = 'pointer-events-none absolute size-[45px] border-primaryColor';

export default async function HomeMethodologySection() {
  const t = await getTranslations('homePage.methodology');

  return (
    <section className="px-4 sm:px-6">
      <div className="relative mx-auto max-w-[974px] px-[6px] py-[7px]">
        <span
          aria-hidden
          className={`${bracket} left-0 top-0 border-l-[10px] border-t-[10px]`}
        />
        <span
          aria-hidden
          className={`${bracket} bottom-0 right-0 border-b-[10px] border-r-[10px]`}
        />

        <div className="group relative flex flex-col items-center gap-6 bg-white px-6 pb-6 pt-12 text-center text-textDark shadow-[0_0_10px_rgba(0,0,0,0.08)] lg:block lg:h-[238px] lg:p-0">
          <div className="lg:w-[650px] lg:pt-[56px]">
            <h2 className="text-xl font-medium! leading-[1.2] sm:text-2xl">
              {t('title')}
            </h2>
            <p className="mt-2 text-sm font-medium leading-[1.2] sm:text-base">
              {t('subtitle')}
            </p>
            {/* The link's overlay makes the whole card clickable. */}
            <Link
              href="/ai-transformation"
              className="mt-9 inline-flex items-center gap-3 text-base font-medium leading-[1.2] after:absolute after:inset-0 group-hover:text-primaryColor"
            >
              {t('cta')}
              <Image
                src="/home/top/link-chevrons.png"
                alt=""
                width={20}
                height={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>
          <Image
            src="/home/top/ax-methodology.png"
            alt={t('imageAlt')}
            width={260}
            height={252}
            className="lg:absolute lg:left-[594px] lg:top-[-7px]"
          />
        </div>
      </div>
    </section>
  );
}
