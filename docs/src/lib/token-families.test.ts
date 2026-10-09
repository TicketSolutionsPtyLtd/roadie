import { join } from 'path'
import { describe, expect, it } from 'vitest'

import { readPageMetadata } from './page-manifest'
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
