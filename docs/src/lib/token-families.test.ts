import { join } from 'path'
import { describe, expect, it } from 'vitest'

import { getMarkdownRoutes, readPageMetadata } from './page-manifest'
import { TOKEN_FAMILY_PAGES } from './token-families'

describe('TOKEN_FAMILY_PAGES', () => {
  it.each(Object.entries(TOKEN_FAMILY_PAGES))(
    "%s's page names its family, so it gets a markdown twin",
    async (family, { href }) => {
      const metadata = await readPageMetadata(
        join(process.cwd(), 'src/app', href, 'page.tsx')
      )
      expect(metadata?.tokenFamily).toBe(family)
    }
  )
})

it('gives every token family page a markdown twin', async () => {
  expect(await getMarkdownRoutes()).toEqual(
    expect.arrayContaining(
      Object.values(TOKEN_FAMILY_PAGES).map(({ href }) => href)
    )
  )
})
