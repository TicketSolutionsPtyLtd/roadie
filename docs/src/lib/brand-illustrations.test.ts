import { describe, expect, it } from 'vitest'

import * as Spot from '@oztix/roadie-illustrations/spot'

import { BRAND_ILLUSTRATIONS } from './brand-illustrations'

describe('BRAND_ILLUSTRATIONS', () => {
  it('lists each illustration once, by a component @oztix/roadie-illustrations/spot exports', () => {
    const slugs = BRAND_ILLUSTRATIONS.map(({ slug }) => slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    const unknown = BRAND_ILLUSTRATIONS.filter(
      ({ component }) => !(component in Spot)
    ).map(({ slug, component }) => `${slug}: ${component}`)
    expect(unknown).toEqual([])
  })
})
