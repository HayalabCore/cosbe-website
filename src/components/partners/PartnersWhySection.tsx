import { getTranslations } from 'next-intl/server';

export default async function PartnersWhySection() {
  const t = await getTranslations('partnersPage.why');
  const reasons = [0, 1, 2].map((i) => ({
    title: t(`items.${i}.title`),
    body: t(`items.${i}.body`),
  }));

  return (
    <section className="text-textDark">
      <div className="px-4 text-center sm:px-6">
        <h2 className="text-2xl font-medium! leading-[1.2] sm:text-[32px]">
          {t('title')}
        </h2>
        <p className="mt-5 text-sm font-medium leading-[22px] sm:whitespace-pre-line sm:text-base">
          {t('description')}
        </p>
      </div>
      <div className="mt-11 border-y border-black bg-white">
        <ol className="mx-auto grid max-w-[1132px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-3 md:gap-[92px] lg:px-0 lg:pb-[65px] lg:pt-[54px]">
          {reasons.map((reason, i) => (
            <li key={reason.title}>
              <span className="text-base font-medium leading-[22px] text-primaryColor">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-3 min-h-12 whitespace-pre-line text-lg font-bold! leading-6">
                {reason.title}
              </h3>
              <p className="mt-[31px] text-base leading-[22px]">
                {reason.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
