import type { NextConfig } from 'next'

import createMDX from '@next/mdx'

const isGithubPages = process.env.GITHUB_ACTIONS === 'true'
const repoName = 'Roadie'

const nextConfig: NextConfig = {
  pageExtensions: ['mdx', 'ts', 'tsx'],
  experimental: {
    mdxRs: true
  },
  basePath: isGithubPages ? `/${repoName}` : '',
  assetPrefix: isGithubPages ? `/${repoName}/` : '',
  output: 'export',
  images: {
    unoptimized: true
  }
}

const withMDX = createMDX({})

export default withMDX(nextConfig)
