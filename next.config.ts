import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Staging is a public URL with test content; keep it out of search results.
const isStaging = process.env.SITE_ENV === 'staging';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    if (!isStaging) return [];
    return [
      {
        source: '/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
  async redirects() {
    return [
      // Studio "projects" were renamed to topics; keep old links working.
      {
        source: '/admin/studio/projects',
        destination: '/admin/studio/topics',
        permanent: true,
      },
      {
        source: '/admin/studio/projects/:id',
        destination: '/admin/studio/topics/:id',
        permanent: true,
      },
    ];
  },
  experimental: {
    // A maximum-size Japanese text source (400k chars) is ~1.2 MB of UTF-8.
    serverActions: { bodySizeLimit: '3mb' },
  },
  images: {
    // Firebase App Hosting disables Next.js' built-in image optimizer, so the
    // `/_next/image` endpoint 404s in production and any <Image src={remoteUrl}>
    // (e.g. Supabase article images) breaks. Serve originals directly instead.
    // See: https://firebase.google.com/docs/app-hosting/optimize-image-loading
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.jp.cosbe.inc',
        pathname: '/wp-content/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
