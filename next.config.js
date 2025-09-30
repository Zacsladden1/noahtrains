/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Enable Next image optimizer for better caching/CDN delivery in prod
    unoptimized: false,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
    reactRemoveProperties: process.env.NODE_ENV === 'production',
  },
  // Use default build id to maximize static asset caching
  async headers() {
    return [
      {
        // Keep long-term caching for static chunks/images
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/_next/image',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; frame-src 'none'" },
        ],
      },
    ];
  },
  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
      stream: false,
      util: false,
    };

    // Prefer module/modern condition for better tree-shaking where available
    config.resolve.conditionNames = [
      'webpack',
      'import',
      'module',
      'browser',
      'default',
    ];

    // Let Next.js manage optimizations/minification with SWC on latest versions

    return config;
  },
};

module.exports = nextConfig;
