import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
