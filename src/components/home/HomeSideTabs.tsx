import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/routing';

const tabBase =
  'flex w-[47px] flex-col items-center gap-2 rounded-r-[10px] py-4 text-sm font-bold [text-orientation:mixed] transition-colors';

export default async function HomeSideTabs() {
  const t = await getTranslations('homePage.sideTabs');

  return (
    <div className="fixed left-0 top-[193px] z-40 hidden flex-col gap-[13px] lg:flex">
      <Link
        href="/contact"
        className={`${tabBase} bg-primaryColor text-white hover:bg-primaryHover`}
      >
        <Image src="/home/top/icon-mail.svg" alt="" width={14} height={10} />
        <span className="[writing-mode:vertical-rl]">{t('contact')}</span>
      </Link>
    </div>
  );
}
