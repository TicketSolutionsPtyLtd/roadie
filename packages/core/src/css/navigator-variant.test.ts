import { readFileSync } from 'node:fs'
import { compile } from 'tailwindcss'
import { describe, expect, it } from 'vitest'

import { NAVIGATOR_EXPANDED_SCOPE } from '../navigator'

const sheet = readFileSync(new URL('./navigator.css', import.meta.url), 'utf8')
const squash = (css: string) => css.replace(/\s+/g, ' ')

describe('navigator-expanded', () => {
  it('compiles to the vertical navigation scope, wrapped in :where()', async () => {
    const compiler = await compile(`@tailwind utilities;\n${sheet}`)
    const css = squash(compiler.build(['navigator-expanded:grid']))
    expect(css).toContain(squash(`:where(${NAVIGATOR_EXPANDED_SCOPE})`))
    expect(css).toContain('display: grid')
  })
})
