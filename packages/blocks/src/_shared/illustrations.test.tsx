import { render } from '@testing-library/react'
import { globSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, expectTypeOf, it } from 'vitest'

import * as spot from '@oztix/roadie-illustrations/spot'

import type { SpotIllustrationName as ProvidedName } from '../Provider'
import {
  SpotIllustrationByName,
  type SpotIllustrationName
} from './illustrations'

const SRC = join(import.meta.dirname, '..')
const markupOf = (ui: React.ReactElement) => render(ui).container.innerHTML

// jsdom resolves the `node` condition, as a server does, so every illustration draws at once.
describe('SpotIllustrationByName', () => {
  it.each(['Ticket', 'Number7'] as const)('draws %s by name', (name) => {
    expect(markupOf(<SpotIllustrationByName name={name} outline />)).toBe(
      markupOf(<Drawing name={name} />)
    )
  })

  it.each(['SpotIllustration', 'constructor', 'ticket', 7, null, undefined])(
    'falls back for %s, which names no illustration',
    (name) => {
      expect(markupOf(<SpotIllustrationByName name={name} />)).toBe('')
      expect(
        markupOf(
          <SpotIllustrationByName name={name} fallback='Heart' outline />
        )
      ).toBe(markupOf(<Drawing name='Heart' />))
    }
  )

  it('takes the name a CMS stores, as before', () => {
    expectTypeOf<SpotIllustrationName>().toEqualTypeOf<
      Exclude<keyof typeof spot, 'SpotIllustration'>
    >()
    expectTypeOf<ProvidedName>().toEqualTypeOf<SpotIllustrationName>()
  })
})

function Drawing({ name }: { name: SpotIllustrationName }) {
  const Named = spot[name]
  return <Named outline />
}

describe('the blocks', () => {
  // Named imports keep only what they name; the size table checks what ships.
  it('never import the whole spot illustration set', () => {
    const shipped = globSync('**/*.{ts,tsx}', { cwd: SRC }).filter(
      (file) => !/\.test\.tsx?$|fixtures\.tsx?$|^_test\//.test(file)
    )
    const barrel = /import \* as \w+ from '@oztix\/roadie-illustrations\/spot'/
    expect(
      shipped.filter((file) =>
        barrel.test(readFileSync(join(SRC, file), 'utf8'))
      )
    ).toEqual([])
  })
})
