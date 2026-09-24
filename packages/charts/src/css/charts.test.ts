import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(import.meta.dirname, 'charts.css'), 'utf-8')

describe('charts.css', () => {
  it('textures every series slot under forced colours', () => {
    const forced = css.slice(css.indexOf('@media (forced-colors: active)'))
    for (let slot = 1; slot <= 8; slot++)
      expect(forced).toContain(`[data-ts-key^='series-${slot}:']`)
  })

  it('haloes every label mark', () => {
    expect(css).toMatch(/\[data-ts-key\^='label-'\] \{[^}]*paint-order: stroke/)
  })
})
