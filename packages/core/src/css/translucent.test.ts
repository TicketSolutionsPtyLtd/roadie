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
    expect(css).toContain('--translucent-backdrop: blur(12px)')
    expect(css).toContain('backdrop-filter: var(--translucent-backdrop)')
  })

  it('goes solid under reduced transparency', async () => {
    const css = await build()
    const reduced = css.slice(
      css.indexOf('@media (prefers-reduced-transparency: reduce)')
    )
    expect(reduced).toContain('--translucent-fill: 100%')
    expect(reduced).toContain('--translucent-backdrop: none')
  })

  it("yields to a field's hover, focus and invalid fills", async () => {
    const css = (await build()).replace(/\(\s+/g, '(').replace(/\s+\)/g, ')')
    const touch = css.slice(css.indexOf('@media not (hover: hover)'))
    expect(css).toContain(
      "@media (hover: hover) { &:is(&):not(.is-interactive-field:is(:hover, :focus, [aria-invalid='true']))"
    )
    expect(touch).toContain(
      ":not(.is-interactive-field:is(:focus, [aria-invalid='true']))"
    )
  })

  it('leaves the shadow and rim light to the surface it pairs with', async () => {
    expect(await build()).not.toContain('box-shadow')
  })
})
