import HubSpotForm from './HubSpotForm';

type HubSpotFormCardProps = {
  className?: string;
  /** Hero overlay uses frosted glass; contact/download use solid card */
  variant?: 'hero' | 'solid';
};

export default function HubSpotFormCard({
  className = '',
  variant = 'solid',
}: HubSpotFormCardProps) {
  const variantClass =
    variant === 'hero'
      ? 'bg-white/80 shadow-lg shadow-primaryColor/10 ring-1 ring-bgAccent backdrop-blur-sm sm:shadow-xl sm:shadow-primaryColor/15 border border-white/20'
      : 'border border-borderPrimary bg-white shadow-lg shadow-primaryColor/10 ring-1 ring-bgAccent';

  const sizeClass =
    variant === 'hero'
      ? 'max-w-[520px] p-5 sm:p-6 lg:p-8'
      : 'w-full max-w-xl p-8 sm:max-w-2xl sm:p-10 lg:max-w-3xl lg:p-12';

  return (
    <div
      className={`rounded-2xl sm:rounded-3xl ${sizeClass} ${variantClass} ${className}`.trim()}
    >
      <HubSpotForm />
    </div>
  );
}
