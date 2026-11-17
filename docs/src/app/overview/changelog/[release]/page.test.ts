import { describe, expect, it, vi } from 'vitest'

import { generateMetadata } from './page'

vi.mock('@/components/changelog/ReleasePage', () => ({
  ReleasePage: () => null
}))
vi.mock('@/lib/releases', () => ({
  getReleaseViews: () => [],
  releaseRoutes: () => [
    { slug: '2026-11-05' },
    { slug: 'components-2-18-0', movedTo: '/overview/changelog/2026-11-05' }
  ]
}))

describe('a moved release page', () => {
  // With no metadataBase, Next resolves a relative canonical against localhost.
  it('names no canonical the site would resolve against localhost', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ release: 'components-2-18-0' })
    })
    const canonical = metadata.alternates?.canonical

    expect(metadata.robots).toMatchObject({ index: false })
    expect(
      canonical === undefined || /^https?:\/\//.test(String(canonical))
    ).toBe(true)
  })
})
