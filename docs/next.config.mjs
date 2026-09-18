import createMDX from '@next/mdx'

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
