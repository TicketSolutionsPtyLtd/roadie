import { readFileSync } from 'node:fs'
import { compile } from 'tailwindcss'
import { describe, expect, it } from 'vitest'

const sheet = readFileSync(new URL('./emphasis.css', import.meta.url), 'utf8')
const squash = (css: string) => css.replace(/\s+/g, ' ')

const build = async () => {
  const compiler = await compile(`@tailwind utilities;\n${sheet}`)
  return squash(compiler.build(['is-translucent']))
}

describe('is-translucent', () => {
  it('blurs behind a translucent raised fill only where backdrop-filter works', async () => {
    const css = await build()
    expect(css).toContain(
      '@supports ((backdrop-filter: blur(0)) or (-webkit-backdrop-filter: blur(0)))'
    )
    expect(css).toContain(
      'color-mix( in oklch, var(--intent-bg-raised) var(--translucent-fill), transparent )'
    )
    expect(css).toContain('backdrop-filter: blur(12px)')
  })

  it('goes solid under reduced transparency', async () => {
    const css = await build()
    const reduced = css.slice(
      css.indexOf('@media (prefers-reduced-transparency: reduce)')
    )
    expect(reduced).toContain('background-color: var(--intent-bg-raised)')
    expect(reduced).toContain('backdrop-filter: none')
  })

  it('leaves the shadow and rim light to the surface it pairs with', async () => {
    expect(await build()).not.toContain('box-shadow')
  })
})
