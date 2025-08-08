/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Verhindert, dass Next.js beim Build versucht, die Seiten vorzurendern
    appDir: true
  },
  output: 'standalone',
};

module.exports = nextConfig;
