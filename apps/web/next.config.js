/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  transpilePackages: ['@einvoice/shared', '@einvoice/validation'],
}

module.exports = nextConfig