import { readFileSync } from 'node:fs'
import { compile } from 'tailwindcss'
import { describe, expect, it } from 'vitest'

const sheet = readFileSync(new URL('./emphasis.css', import.meta.url), 'utf8')
const squash = (css: string) => css.replace(/\s+/g, ' ')

const build = async (utility: string) => {
  const compiler = await compile(`@tailwind utilities;\n${sheet}`)
  return squash(compiler.build([utility]))
}

describe('emphasis-overlay', () => {
  it('tints and blurs what is behind', async () => {
    const css = await build('emphasis-overlay')
    expect(css).toContain('oklch(0.1 0.04 var(--intent-hue) / 0.55)')
    expect(css).toContain('-webkit-backdrop-filter: blur(8px)')
    expect(css).toContain('backdrop-filter: blur(8px)')
  })

  it('drops the blur under reduced transparency', async () => {
    const css = await build('emphasis-overlay')
    const reduced = css.slice(
      css.indexOf('@media (prefers-reduced-transparency: reduce)')
    )
    expect(reduced).toContain('backdrop-filter: none')
  })
})

describe('emphasis-overlay-subtle', () => {
  it('tints lightly and leaves what is behind unblurred', async () => {
    const css = await build('emphasis-overlay-subtle')
    expect(css).toContain('oklch(0.1 0.04 var(--intent-hue) / 0.25)')
    expect(css).not.toContain('backdrop-filter')
  })
})
