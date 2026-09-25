import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(
  new URL('./dataviz-textures.css', import.meta.url),
  'utf8'
)
const roadie = readFileSync(new URL('./roadie.css', import.meta.url), 'utf8')

describe('dataviz textures', () => {
  it('defines a pattern for every categorical slot', () => {
    for (let slot = 1; slot <= 8; slot++)
      expect(css).toContain(`[data-chart-texture='${slot}']`)
  })
  it('only applies under forced colours and print', () => {
    expect(css).toMatch(/@media \(forced-colors: active\), print \{/)
  })
  it('is imported by roadie.css after the dataviz tokens', () => {
    expect(roadie.indexOf('dataviz-textures.css')).toBeGreaterThan(
      roadie.indexOf('dataviz.css')
    )
  })
})
