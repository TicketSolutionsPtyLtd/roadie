import createMDX from '@next/mdx'
import { fileURLToPath } from 'url'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // GitHub Pages serves `/x/` only when `x/index.html` exists, and 301s `/x` to it.
  trailingSlash: true,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  devIndicators: false,
  reactCompiler: true,
  allowedDevOrigins: [
    '192.168.*.*',
    ...(process.env.NEXT_DEV_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  ],
  images: {
    unoptimized: true
  },
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
  transpilePackages: [
    '@oztix/roadie-charts',
    '@oztix/roadie-components',
    '@oztix/roadie-core',
    '@oztix/roadie-widgets'
  ]
}

const withMDX = createMDX({
  options: {
    remarkPlugins: [
      'remark-gfm',
      // Turbopack takes plugins by name; absolute, since it resolves from the workspace root.
      fileURLToPath(new URL('./src/lib/live-examples.mjs', import.meta.url))
    ],
    rehypePlugins: ['rehype-slug']
  }
})

export default withMDX(nextConfig)
