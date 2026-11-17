// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { preview, previewSvg } from './preview.ts'

const layers = [
  { name: 'Face' as const, d: 'M2 2h44v44H2z' },
  { name: 'Stroke' as const, d: 'M2 2h44' }
]

describe('previewSvg', () => {
  it('draws the outline as SpotIllustration does: every layer stroked white, 4 wide, behind the art', () => {
    const svg = previewSvg(layers, true)
    const outline = svg.slice(svg.indexOf('<g'), svg.indexOf('</g>'))
    expect(outline).toContain('stroke="#ffffff" stroke-width="4"')
    expect(outline.match(/<path/g)).toHaveLength(2)
    expect(outline).toContain('<path d="M2 2h44" fill="none"/>')
    expect(svg.indexOf('</g>')).toBeLessThan(svg.indexOf('fill="#e1d1fb"'))
  })

  it('leaves the outline off when asked', () => {
    expect(previewSvg(layers, false)).not.toContain('<g')
  })
})

describe('preview', () => {
  it.each(['../../package', 'svgs/../../index', 'Heart'])(
    "refuses %s, which isn't the name of a source",
    async (name) => {
      await expect(preview([name], { out: 'unused.png' })).rejects.toThrow(
        'kebab-case'
      )
    }
  )
})
