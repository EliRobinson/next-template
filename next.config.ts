import type { NextConfig } from 'next'

// Validate env vars at build time (fails fast instead of at runtime in prod).
import './src/env'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  images: {
    formats: ['image/avif', 'image/webp']
  }
}

export default nextConfig
