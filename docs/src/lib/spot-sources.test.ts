import { unzipSync } from 'fflate'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { SPOT_ILLUSTRATIONS } from '@oztix/roadie-illustrations/spot/catalogue'

import { illustrationPack, illustrationPackSize } from './spot-sources'

const SVGS = join(
  import.meta.dirname,
  '../../../packages/illustrations/src/spot/svgs'
)

describe('illustrationPack', () => {
  it("holds every spot illustration's source, named for the brand", async () => {
    const files = unzipSync(await illustrationPack())
    expect(Object.keys(files)).toEqual(
      SPOT_ILLUSTRATIONS.map(
        ({ slug }) => `spot-illustrations/oztix-${slug}.svg`
      )
    )
    const heart = new TextDecoder().decode(
      files['spot-illustrations/oztix-heart.svg']
    )
    expect(heart).toBe(readFileSync(join(SVGS, 'heart.svg'), 'utf8'))
  })

  it('reports its size in whole KB, as a download card shows it', async () => {
    expect(await illustrationPackSize()).toMatch(/^[1-9]\d* KB$/)
  })
})
