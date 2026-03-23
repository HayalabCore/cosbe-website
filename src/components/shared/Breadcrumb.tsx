import { Link } from '@/i18n/routing';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  homeLabel?: string;
  className?: string;
}

export default function Breadcrumb({
  items,
  homeLabel = 'Home',
  className = '',
}: BreadcrumbProps) {
  return (
    <nav
      className={`bg-bgSecondary border-b border-borderPrimary ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center text-sm text-textTertiary">
          <Link href="/" className="hover:text-primaryColor flex items-center">
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            {homeLabel}
          </Link>
          {items.map((item, index) => (
            <span key={index} className="flex items-center">
              <span className="mx-2">›</span>
              {item.href ? (
                <Link href={item.href} className="hover:text-primaryColor">
                  {item.label}
                </Link>
              ) : (
                <span className="text-textPrimary">{item.label}</span>
              )}
            </span>
          ))}
        </div>
      </div>
    </nav>
  );
}
