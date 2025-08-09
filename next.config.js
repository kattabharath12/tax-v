/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Remove appDir as it's deprecated
  },
  webpack: (config, { isServer }) => {
    // Handle Sharp for image processing
    if (isServer) {
      config.externals.push('sharp')
    }
    return config
  },
  // Disable standalone for now
  // output: 'standalone',
  // Image optimization settings
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  // Environment variable configuration
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  }
}
module.exports = nextConfig
