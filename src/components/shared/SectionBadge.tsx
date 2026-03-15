interface SectionBadgeProps {
  label: string;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export default function SectionBadge({
  label,
  variant = 'primary',
  className = '',
}: SectionBadgeProps) {
  const baseClasses = 'px-4 py-2 rounded text-sm font-bold inline-flex items-center';
  const variantClasses = {
    primary: 'bg-primaryColor text-white',
    secondary: 'bg-primaryColor/15 text-primaryDark',
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {label}
    </span>
  );
}
