import path from 'node:path'
import type { NextConfig } from 'next'

// Validate env vars at build time (fails fast instead of at runtime in prod).
import './src/env'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  images: {
    formats: ['image/avif', 'image/webp']
  },
  turbopack: {
    // Without this, a sibling lockfile (home dir, or another worktree under
    // .claude/worktrees/*) makes Next.js infer the wrong workspace root and
    // warn on every dev server start.
    root: path.join(__dirname)
  }
}

export default nextConfig
