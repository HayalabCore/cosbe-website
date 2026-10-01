import { getTranslations } from 'next-intl/server';
import Image from 'next/image';

export default async function AxPhasesSection() {
  const t = await getTranslations('axPage.phases');
  const phases = [0, 1, 2, 3].map((i) => ({
    name: t(`items.${i}.name`),
    body: t(`items.${i}.body`),
  }));

  return (
    <section className="relative overflow-x-clip px-4 pt-24 text-textDark sm:px-6 lg:pt-[125px]">
      <div className="relative mx-auto max-w-[840px]">
        <div className="lg:pl-[14px]">
          <p className="text-base font-medium leading-[30px] text-primaryColor sm:text-xl">
            {t('eyebrow')}
          </p>
          <h2 className="mt-[23px] whitespace-pre-line text-2xl font-medium! leading-[1.5] sm:text-[32px]">
            {t('title')}
          </h2>
        </div>

        <div className="relative mt-[86px]">
          {/* Wave texture behind the list, full page width. */}
          <Image
            src="/ai-transformation/v2/waves.webp"
            alt=""
            width={1440}
            height={416}
            className="pointer-events-none absolute left-1/2 top-[-84px] w-[1440px] max-w-none -translate-x-1/2"
          />
          <ol className="relative">
            {phases.map((phase, i) => (
              <li
                key={phase.name}
                className={`grid grid-cols-[52px_1fr] gap-x-[31px] gap-y-3 border-b border-[#a1a1a1] pb-[22px] sm:grid-cols-[52px_180px_1fr] sm:px-[14px] ${
                  i > 0 ? 'pt-[55px]' : ''
                }`}
              >
                <span className="flex size-[52px] items-center justify-center rounded-full bg-primaryColor text-2xl font-medium leading-[30px] text-white">
                  {i + 1}
                </span>
                <h3 className="self-center whitespace-pre-line text-lg font-medium! leading-[30px] sm:text-xl">
                  {phase.name}
                </h3>
                <p className="col-span-2 text-base leading-6 sm:col-span-1 sm:pt-[2px]">
                  {phase.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
