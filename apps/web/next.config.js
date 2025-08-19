// Conditionally import dependencies only when available
let BundleAnalyzerPlugin;
let withSentryConfig;

try {
  BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
} catch (error) {
  // webpack-bundle-analyzer is not installed - skip analysis
  BundleAnalyzerPlugin = null;
}

try {
  withSentryConfig = require('@sentry/nextjs').withSentryConfig;
} catch (error) {
  // @sentry/nextjs is not installed - skip Sentry
  withSentryConfig = null;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Experimental features
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      '@heroicons/react',
      '@tanstack/react-query',
      '@headlessui/react',
      'lucide-react',
      'react-hook-form',
      '@hookform/resolvers',
      'date-fns'
    ],
    // Enable instrumentation for Sentry
    instrumentationHook: true,
  },

  // Transpile internal packages
  transpilePackages: ['@einvoice/shared', '@einvoice/validation'],

  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Headers for security and caching
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
      ],
    },
    // Static assets caching
    {
      source: '/static/(.*)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
    // API routes caching
    {
      source: '/api/(.*)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-cache, no-store, must-revalidate',
        },
      ],
    },
  ],

  // Webpack optimizations
  webpack: (config, { dev, isServer, webpack }) => {
    // Production optimizations
    if (!dev) {
      // Bundle splitting for better caching
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // Vendor libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          // Large libraries that change infrequently
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 20,
          },
          // UI libraries
          ui: {
            test: /[\\/]node_modules[\\/](@headlessui|@heroicons|lucide-react)[\\/]/,
            name: 'ui',
            chunks: 'all',
            priority: 15,
          },
          // Form libraries
          forms: {
            test: /[\\/]node_modules[\\/](react-hook-form|@hookform)[\\/]/,
            name: 'forms',
            chunks: 'all',
            priority: 15,
          },
          // Common chunks from our app
          common: {
            minChunks: 2,
            chunks: 'all',
            name: 'common',
            priority: 5,
            enforce: true,
          },
        },
      };

      // Module concatenation
      config.optimization.concatenateModules = true;

      // Minimize unused exports
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;

      // Bundle analyzer (only when ANALYZE=true and plugin is available)
      if (process.env.ANALYZE && BundleAnalyzerPlugin) {
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'server',
            analyzerPort: isServer ? 8888 : 8889,
            openAnalyzer: true,
          })
        );
      }
    }

    // Ignore specific modules to reduce bundle size
    config.resolve.alias = {
      ...config.resolve.alias,
      // Replace heavy moment.js with date-fns
      moment: 'date-fns',
    };

    // Ignore unused locale files
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /date-fns$/,
      })
    );

    // Client-side optimizations
    if (!isServer) {
      // Remove server-only modules from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
      };
    }

    return config;
  },

  // Environment variables for client
  env: {
    NEXT_PUBLIC_BUNDLE_ANALYZE: process.env.ANALYZE,
  },

  // Output configuration
  output: 'standalone',
  distDir: '.next',

  // Compiler options
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Redirects for better SEO
  redirects: async () => [
    {
      source: '/home',
      destination: '/',
      permanent: true,
    },
  ],

  // Rewrites for API routes
  rewrites: async () => [
    {
      source: '/api/:path*',
      destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/:path*`,
    },
  ],
};

// Wrap with Sentry configuration if available
module.exports = withSentryConfig ? withSentryConfig(
  nextConfig,
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    // Suppresses source map uploading logs during build
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
  },
  {
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Transpiles SDK to be compatible with IE11 (increases bundle size)
    transpileClientSDK: true,

    // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers
    // This can increase your server load as well as your hosting bill
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail
    tunnelRoute: "/monitoring",

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors.
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#vercel-crons
    automaticVercelMonitors: true,
  }
) : nextConfig;