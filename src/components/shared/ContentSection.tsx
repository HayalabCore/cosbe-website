import Image from 'next/image';

interface ContentSectionProps {
  title: string;
  description: string;
  points: string[];
  image: string;
  imageAlt: string;
  imagePosition?: 'left' | 'right';
  className?: string;
}

export default function ContentSection({
  title,
  description,
  points,
  image,
  imageAlt,
  imagePosition = 'left',
  className = '',
}: ContentSectionProps) {
  const imageComponent = (
    <div className="relative h-80 bg-gradient-to-br from-primaryColor/20 to-primaryColor/10 rounded-2xl overflow-hidden">
      <Image
        src={image}
        alt={imageAlt}
        fill
        className="object-contain p-8"
      />
    </div>
  );

  const textComponent = (
    <div>
      <h2 className="text-3xl font-bold text-textPrimary mb-6 border-l-4 border-primaryColor pl-4">
        {title}
      </h2>
      <p className="text-textSecondary mb-6 leading-relaxed">
        {description}
      </p>
      <ul className="space-y-3">
        {points.map((point, index) => (
          <li key={index} className="flex items-start">
            <span className="text-primaryColor mr-3 mt-1">●</span>
            <span className="text-textSecondary">{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className={`mb-24 ${className}`}>
      <div className="grid md:grid-cols-2 gap-12 items-center">
        {imagePosition === 'left' ? (
          <>
            {imageComponent}
            {textComponent}
          </>
        ) : (
          <>
            {textComponent}
            {imageComponent}
          </>
        )}
      </div>
    </div>
  );
}
