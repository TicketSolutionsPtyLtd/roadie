import { describe, expect, it } from 'vitest'

import {
  CHARTS,
  COMPONENTS,
  FOUNDATIONS,
  getCatalogue
} from '@/lib/page-manifest'
import { TOKEN_FAMILY_ORDER } from '@/lib/token-families'

import { previewArt } from './CataloguePreview'
import { TokenFamilyArt } from './tokens/TokenFamilyArt'

describe('catalogue previews', () => {
  it.each([COMPONENTS, FOUNDATIONS, CHARTS])(
    'draws art for every page listed in $route',
    async (catalogue) => {
      const entries = (await getCatalogue(catalogue)).flatMap(
        ({ entries }) => entries
      )
      const missing = entries
        .filter((entry) => previewArt(catalogue.route, entry) == null)
        .map((entry) => entry.href)

      expect(entries.length).toBeGreaterThan(0)
      expect(missing).toEqual([])
    }
  )

  it('draws art for every token family', () => {
    const missing = TOKEN_FAMILY_ORDER.filter(
      (family) => TokenFamilyArt({ family }) == null
    )

    expect(missing).toEqual([])
  })

  it('has no art for a page it does not know', () => {
    expect(previewArt('/components', { name: 'no-such-page' })).toBeNull()
  })
})
