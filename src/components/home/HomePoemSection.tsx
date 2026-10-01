import { getTranslations } from 'next-intl/server';
import Image from 'next/image';

export default async function HomePoemSection() {
  const t = await getTranslations('homePage.poem');

  return (
    <section className="relative overflow-x-clip px-4 pb-[45px] pt-24 text-center text-textDark sm:px-6 lg:pt-[147px]">
      <div className="relative mx-auto max-w-[962px]">
        {/* Glow ring behind the copy; its centre sits 41px above the block's
            centre in the design. */}
        <Image
          src="/home/top/poem-glow.webp"
          alt=""
          width={622}
          height={622}
          className="pointer-events-none absolute left-1/2 top-[calc(50%-41px)] w-[520px] max-w-none -translate-x-1/2 -translate-y-1/2 sm:w-[622px]"
        />
        <div className="relative">
          <h2 className="text-[22px] font-medium! leading-[1.2] sm:text-[28px] lg:text-[36px]">
            {t('title')}
          </h2>
          <p className="mx-auto mt-10 max-w-[520px] whitespace-pre-line text-sm font-medium leading-8 sm:text-base sm:leading-10 lg:mt-[55px]">
            {t('body')}
          </p>
          <Image
            src="/home/top/poem-chevron.png"
            alt=""
            width={45}
            height={56}
            className="mx-auto mt-16 lg:mt-24"
          />
        </div>
      </div>
      <p className="relative mx-auto mt-12 max-w-[1100px] whitespace-pre-line text-lg font-medium leading-relaxed sm:text-2xl sm:leading-10">
        {t('conclusion')}
      </p>
    </section>
  );
}
