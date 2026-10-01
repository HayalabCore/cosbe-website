import { getTranslations } from 'next-intl/server';

export default async function AxPrinciplesSection() {
  const t = await getTranslations('axPage.principles');
  const principles = [0, 1, 2, 3].map((i) => ({
    name: t(`items.${i}.name`),
    tagline: t(`items.${i}.tagline`),
    body: t(`items.${i}.body`),
  }));

  return (
    <section className="px-4 pb-[53px] pt-24 text-textDark sm:px-6 lg:pt-[136px]">
      <div className="text-center">
        <p className="text-base font-medium leading-[1.2] text-primaryColor sm:text-xl">
          {t('eyebrow')}
        </p>
        <h2 className="mt-[7px] text-2xl font-medium! leading-[1.2] sm:text-[32px]">
          {t('title')}
        </h2>
      </div>
      <ul className="mx-auto mt-[46px] grid max-w-[1098px] gap-x-4 gap-y-[19px] md:grid-cols-2">
        {principles.map((p) => (
          <li
            key={p.name}
            className="min-h-[244px] rounded-[15px] border border-textDark bg-white px-6 py-10 sm:px-10 sm:pt-[54px]"
          >
            <h3 className="text-xl font-medium! leading-[1.2] sm:text-2xl">
              {p.name}
            </h3>
            <p className="mt-[13px] pl-1 text-base font-medium leading-[1.2] text-primaryColor">
              {p.tagline}
            </p>
            <p className="mt-[30px] pl-1 text-base font-medium leading-[22px]">
              {p.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
