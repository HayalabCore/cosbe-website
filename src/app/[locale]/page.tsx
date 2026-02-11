import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import HubSpotForm from '@/components/HubSpotForm';

export default async function Home() {
  const t = await getTranslations('hero');

  return (
    <div className="min-h-screen bg-bgPrimary pt-16 md:pt-18 lg:pt-20">
      <section className="relative isolate overflow-hidden">
        {/* Background patterns */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: [
              // subtle dotted pattern
              'radial-gradient(circle at 1px 1px, var(--color-textHeading, #0F172A) 1px, transparent 0)',
              // faint rings
              'radial-gradient(closest-side at 20% 30%, var(--color-textHeading, #0F172A), transparent 60%)',
              'radial-gradient(closest-side at 85% 70%, var(--color-textHeading, #0F172A), transparent 65%)',
            ].join(','),
            backgroundSize: ['48px 48px', '900px 900px', '950px 950px'].join(','),
            backgroundPosition: ['0 0', '-200px -200px', '200px 200px'].join(','),
            opacity: 0.05,
          }}
        />

        {/* Blue radial glow behind character */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[45%] md:top-1/2 h-[500px] w-[500px] md:h-[800px] md:w-[800px] lg:h-[1100px] lg:w-[1100px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl z-[1] bg-primaryColor/40"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--color-primaryColor) 40%, transparent) 0%, color-mix(in srgb, var(--color-primaryColor) 25%, transparent) 25%, color-mix(in srgb, var(--color-primaryColor) 15%, transparent) 40%, color-mix(in srgb, var(--color-primaryColor) 8%, transparent) 55%, transparent 75%)',
          }}
        />

        {/* Character image */}
        <div className="pointer-events-none absolute left-1/2 top-[45%] md:top-1/2 -translate-x-1/2 -translate-y-1/2 z-[2] w-[350px] h-[350px] md:w-[600px] md:h-[600px] lg:w-[950px] lg:h-[950px]">
          <Image
            src="/cosbe-character.png"
            alt="Cosbe character"
            width={950}
            height={950}
            className="w-full h-full object-contain"
            priority
          />
        </div>

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:px-6 py-8 sm:py-12 md:py-16 lg:grid-cols-[1.15fr_0.95fr_0.8fr] lg:items-center lg:gap-10 lg:py-24 z-[3]">
          {/* Left copy */}
          <div className="max-w-xl text-center lg:text-left">
            <div className="text-[48px] sm:text-[60px] md:text-[68px] font-extrabold leading-[0.95] tracking-tight text-primaryColor lg:text-[84px]">
              {t('brand')}
            </div>
            <div className="mt-3 sm:mt-4 text-[20px] sm:text-[24px] md:text-[30px] font-bold tracking-tight text-textHeading lg:text-[36px]">
              {t('tagline')}
            </div>

            <div className="mt-6 sm:mt-8 lg:mt-10 space-y-3 sm:space-y-4 text-[18px] sm:text-[22px] md:text-[24px] font-semibold leading-relaxed text-textBody lg:text-[28px]">
              <p>
                {t('jpLine1')}
              </p>
              <p>
                {t('jpLine2')}
              </p>
            </div>
          </div>

          {/* Center - character is now in background, this div maintains spacing on desktop only */}
          <div className="relative hidden lg:flex items-center justify-center">
            {/* Empty space to maintain grid layout on desktop - character is in background layer */}
            <div className="h-[400px] w-full" />
          </div>

          {/* Right - HubSpot form */}
          <div className="flex w-full justify-center lg:justify-end mt-[280px] sm:mt-[350px] md:mt-[420px] lg:mt-0">
            <div className="w-[350px] max-w-[480px] sm:max-w-[500px] lg:max-w-[520px] rounded-2xl sm:rounded-3xl bg-white/80 backdrop-blur-sm p-5 sm:p-6 lg:p-8 shadow-lg shadow-primaryColor/10 sm:shadow-xl sm:shadow-primaryColor/15 ring-1 ring-bgAccent border border-white/20">
              <HubSpotForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
