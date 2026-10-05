import { describe, expect, it } from 'vitest'

import { textWidth } from '../plot/endLabels'
import { plotFrame } from '../plot/frame'
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

describe('renderSmallMultiplesSvg captions', () => {
  const LONG = 'Kelpie Moon Festival of Bonfires and Strange Machines gate'

  it('cuts a caption that would run into the next panel, keeping it in a title', () => {
    const svg = renderSmallMultiplesSvg(
      {
        ...gatesExample,
        data: gatesExample.data.map((row) =>
          row.gate === 'North gate' ? { ...row, gate: LONG } : row
        )
      },
      { mode: 'light', width: 640 }
    )
    const caption = svg.match(
      /<text x="0"[^>]*><title>([^<]*)<\/title>([^<]*)<\/text>/
    )
    expect(caption?.[1]).toBe(LONG)
    expect(caption?.[2]).toMatch(/^Kelpie Moon.*…$/)
    const panelWidth = (640 - 16) / 2
    expect(
      textWidth(caption![2]!, plotFrame(160, 'default'))
    ).toBeLessThanOrEqual(panelWidth)
  })
})

describe('renderSmallMultiplesSvg with nothing to split', () => {
  it('says so instead of drawing an empty grid', () => {
    const svg = renderSmallMultiplesSvg(
      { ...gatesExample, data: [] },
      { mode: 'light', width: 640 }
    )
    expect(svg).toContain('aria-label="Nothing to show for this period yet"')
    expect(svg).toContain('>Nothing to show for this period yet<')
  })
})
