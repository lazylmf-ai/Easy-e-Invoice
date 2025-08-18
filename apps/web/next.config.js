const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Experimental features
  experimental: {
    appDir: true,
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
    serverComponentsExternalPackages: ['@einvoice/validation'],
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

      // Bundle analyzer (only when ANALYZE=true)
      if (process.env.ANALYZE) {
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

module.exports = nextConfig;