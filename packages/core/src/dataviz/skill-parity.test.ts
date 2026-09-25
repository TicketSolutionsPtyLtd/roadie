import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { CARD_SIZES } from '../dashboard'
import { palette } from './palette'

const SKILL = readFileSync(
  fileURLToPath(new URL('../../../../skills/audit/SKILL.md', import.meta.url)),
  'utf-8'
)
const tokens = readFileSync(
  new URL('../css/tokens.css', import.meta.url),
  'utf8'
)

describe('dataviz parity', () => {
  it('teaches the audit skill the chart token prefix and slot count', () => {
    expect(SKILL).toContain('--chart-1')
    expect(SKILL).toContain(`--chart-${palette.categorical.light.length}`)
    expect(SKILL).toContain('chartColorVar')
  })

  it('mirrors the status colours in tokens.css', () => {
    for (const status of Object.values(palette.status)) {
      const [l, c, h] = status.value.light
      expect(tokens).toContain(
        `--color-${status.intent}-${status.step.light}: oklch(${l} ${c} ${h})`
      )
    }
  })

  it('documents the dashboard sizes and validator', () => {
    for (const size of CARD_SIZES) expect(SKILL).toContain(`\`${size}\``)
    expect(SKILL).toContain('validateDashboard')
    expect(SKILL).toContain('DataTable')
  })
})
