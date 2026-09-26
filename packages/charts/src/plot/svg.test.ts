import { describe, expect, it } from 'vitest'

import { FONT_FAMILY, SVG_NS, escapeXml } from './svg'

describe('svg helpers', () => {
  it('escapes text for attributes and content', () => {
    expect(escapeXml(`Tom & Jerry's <"show">`)).toBe(
      'Tom &amp; Jerry&#39;s &lt;&quot;show&quot;&gt;'
    )
  })

  it('leaves plain text alone', () => {
    expect(escapeXml('Sold 96%')).toBe('Sold 96%')
  })

  it('names the SVG namespace and the Roadie font first', () => {
    expect(SVG_NS).toBe('http://www.w3.org/2000/svg')
    expect(FONT_FAMILY.split(',')[0]).toBe('Intermission')
  })
})
