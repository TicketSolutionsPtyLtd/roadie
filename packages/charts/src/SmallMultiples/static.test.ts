import { describe, expect, it } from 'vitest'

import { gatesExample } from './examples'
import { renderSmallMultiplesSvg } from './static'

describe('renderSmallMultiplesSvg', () => {
  it.each(['light', 'dark'] as const)(
    'matches the %s snapshot',
    async (mode) => {
      await expect(
        renderSmallMultiplesSvg(gatesExample, { mode, width: 640 })
      ).toMatchFileSnapshot(`./__snapshots__/gates-${mode}.svg`)
    }
  )

  it('is one standalone file with a panel per gate', () => {
    const svg = renderSmallMultiplesSvg(gatesExample, {
      mode: 'light',
      width: 640
    })
    expect(svg).toMatch(/^<svg xmlns=/)
    expect(svg.match(/<svg /g)).toHaveLength(5)
    expect(svg).not.toContain('var(--')
  })

  it('paints its own surface behind the captions and gaps', () => {
    const svg = renderSmallMultiplesSvg(gatesExample, {
      mode: 'dark',
      width: 640
    })
    expect(svg).toMatch(/^<svg [^>]*><rect width="640" height="\d+" fill="#/)
  })
})
