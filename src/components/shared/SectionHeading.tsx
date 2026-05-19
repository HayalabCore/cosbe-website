type SectionHeadingProps = {
  children: React.ReactNode;
  as?: 'h2' | 'h3';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClasses = {
  sm: 'text-xl md:text-2xl mb-6',
  md: 'text-2xl mb-6',
  lg: 'text-3xl mb-6',
} as const;

export default function SectionHeading({
  children,
  as: Tag = 'h2',
  size = 'sm',
  className = '',
}: SectionHeadingProps) {
  return (
    <Tag
      className={`font-bold text-textPrimary border-l-4 border-primaryColor pl-4 leading-snug ${sizeClasses[size]} ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}
