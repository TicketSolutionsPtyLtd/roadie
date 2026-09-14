import createMDX from '@next/mdx'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  devIndicators: false,
  reactCompiler: true,
  // Next blocks cross-origin dev requests by default, which silently breaks the
  // client-rendered `tsx-live` examples when the docs are opened from a phone on
  // the LAN. Set NEXT_DEV_ORIGINS=192.168.x.x (comma-separated) to allow a host.
  allowedDevOrigins: (process.env.NEXT_DEV_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  images: {
    unoptimized: true
  },
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
  transpilePackages: [
    '@oztix/roadie-components',
    '@oztix/roadie-core',
    '@oztix/roadie-widgets'
  ]
}

const withMDX = createMDX({
  options: {
    remarkPlugins: ['remark-gfm'],
    rehypePlugins: ['rehype-slug']
  }
})

export default withMDX(nextConfig)
