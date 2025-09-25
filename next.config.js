const TerserPlugin = require('terser-webpack-plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Disable SWC minifier which can cause issues with older Next.js versions
  swcMinify: false,
  // Use Terser for more stable minification
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Ensure stable chunk generation
  generateBuildId: async () => {
    return 'noahhtrains-build-' + Date.now();
  },
  async headers() {
    return [
      {
        // Disable caching for HTML/doc responses to avoid stale HTML referencing old chunks
        source: '/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
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
    ];
  },
  // Webpack configuration to fix chunk issues
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Fix for chunk loading issues
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
      stream: false,
      util: false,
    };

    // Ensure consistent chunk naming - simplified to prevent issues
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: -10,
            enforce: true,
          },
        },
      },
      // Use Terser for more stable minification
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: process.env.NODE_ENV === 'production',
              drop_debugger: true,
            },
            mangle: {
              safari10: true,
            },
          },
          parallel: true,
        }),
      ],
    };

    // Disable source maps in production to avoid warnings
    if (process.env.NODE_ENV === 'production') {
      config.devtool = false;
    }

    return config;
  },
};

module.exports = nextConfig;
