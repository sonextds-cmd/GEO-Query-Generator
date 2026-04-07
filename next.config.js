/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.microsoft.com',
      },
      {
        protocol: 'https',
        hostname: '**.microsoftonline.com',
      },
      {
        protocol: 'https',
        hostname: 'graph.microsoft.com',
      },
    ],
  },
}

module.exports = nextConfig
