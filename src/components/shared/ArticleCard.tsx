import Image from 'next/image';
import { Link } from '@/i18n/routing';

interface ArticleCardProps {
  href: string;
  image: string;
  title: string;
  category?: string;
  date: string;
  author?: string;
  authorImage?: string;
  readMoreText?: string;
}

export default function ArticleCard({
  href,
  image,
  title,
  category,
  date,
  author,
  authorImage,
  readMoreText = 'Read More',
}: ArticleCardProps) {
  return (
    <Link
      href={href}
      className="group bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-surface-tertiary"
    >
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {category && (
          <div className="absolute top-3 left-3">
            <span className="px-3 py-1 bg-primaryColor text-white text-xs font-medium rounded">
              {category}
            </span>
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold text-textPrimary mb-3 line-clamp-2 group-hover:text-primaryColor transition-colors">
          {title}
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-textTertiary">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {date}
          </div>
          {author && authorImage && (
            <div className="flex items-center">
              <div className="relative w-8 h-8 rounded-full overflow-hidden mr-2">
                <Image
                  src={authorImage}
                  alt={author}
                  fill
                  className="object-cover"
                />
              </div>
              <span className="text-sm text-textTertiary">{author}</span>
            </div>
          )}
        </div>
      </div>
      <div className="px-5 pb-5">
        <span className="text-primaryColor text-sm font-medium group-hover:underline">
          {readMoreText} »
        </span>
      </div>
    </Link>
  );
}
