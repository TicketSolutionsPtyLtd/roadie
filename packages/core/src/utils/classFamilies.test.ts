import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { parseTokenManifest, sheetOrder } from '../tokens/manifest'
import {
  classFamilies,
  renderClassGroups,
  renderFamilySafelist
} from './classFamilies'
import { cn } from './cn'

const cssFolder = new URL('../css/', import.meta.url)
const read = (file: string) => readFileSync(new URL(file, cssFolder), 'utf8')
const families = classFamilies(
  parseTokenManifest(
    sheetOrder(read('roadie.css')).map((file) => [file, read(file)])
  )
)

describe('class families where one class replaces another', () => {
  it('writes cn()’s groups from core’s CSS. Run `pnpm --filter @oztix/roadie-core test -u` after changing a family’s CSS', async () => {
    await expect(renderClassGroups(families)).toMatchFileSnapshot(
      './classGroups.generated.ts'
    )
  })

  it('writes the family safelist from core’s CSS. Run `pnpm --filter @oztix/roadie-core test -u` after changing a family’s CSS', async () => {
    await expect(renderFamilySafelist(families)).toMatchFileSnapshot(
      '../css/safelist.families.html'
    )
  })

  it('takes a new utility or theme key in a family’s namespace into its group and the safelist', () => {
    const fixture = classFamilies(
      parseTokenManifest([
        [
          'fixture.css',
          `@theme { --z-index-base: 0; --z-index-fixture: 1; }
           @utility intent-neutral { color: red; }
           @utility intent-fixture { color: blue; }
           @utility intent { color: green; }
           @utility intent-* { color: --value(--color-*); }`
        ]
      ])
    )
    const groups = renderClassGroups(fixture)
    const safelist = renderFamilySafelist(fixture)
    for (const name of ['z-fixture', 'intent-fixture']) {
      expect(groups).toContain(`'${name}'`)
      expect(safelist).toMatch(new RegExp(`class="[^"]*\\b${name}\\b`))
    }
    expect(fixture.find(({ group }) => group === 'intent')?.members).toEqual([
      'intent-neutral',
      'intent-fixture'
    ])
  })

  it('writes each conflict both ways', () => {
    const groups = renderClassGroups([
      { group: 'semantic-text-color', members: ['text-a'], conflicts: 'x' }
    ])
    expect(groups).toContain(`'semantic-text-color': ['x']`)
    expect(groups).toContain(`x: ['semantic-text-color']`)
  })

  describe.each(families)('$group', ({ members }) => {
    it('is defined in core’s CSS', () => {
      expect(members.length).toBeGreaterThan(1)
    })

    it('lets every member replace every other through cn()', () => {
      for (const earlier of members)
        for (const later of members)
          expect(cn(earlier, later), `${earlier} then ${later}`).toBe(later)
    })
  })
})
