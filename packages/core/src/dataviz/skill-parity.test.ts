import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  ACTIONS_LABEL_LIMITS,
  CARD_SIZES,
  CHART_LABEL_LIMITS,
  CHART_PLOT_KINDS,
  COPY_LIMITS,
  validateChartDocument
} from '../dashboard'
import { palette } from './palette'

const readSkill = (name: string) =>
  readFileSync(
    fileURLToPath(
      new URL(`../../../../skills/${name}/SKILL.md`, import.meta.url)
    ),
    'utf-8'
  )
const SKILL = readSkill('audit')
const CHARTS_SKILL = readSkill('charts').replace(/\s+/g, ' ')
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
      if (status.step.light === null) continue
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

  it('teaches the charts skill every plot kind, size, and label limit', () => {
    for (const kind of CHART_PLOT_KINDS)
      expect(CHARTS_SKILL).toContain(`\`${kind}\``)
    for (const size of CARD_SIZES) expect(CHARTS_SKILL).toContain(`\`${size}\``)
    expect(CHARTS_SKILL).toContain(
      `a stat label ${COPY_LIMITS.stat.label} characters, a chart label ${CHART_LABEL_LIMITS.sm} at \`sm\` and \`md\` and ${CHART_LABEL_LIMITS.lg} at \`lg\` and \`full\`, ${ACTIONS_LABEL_LIMITS.stat} to ${ACTIONS_LABEL_LIMITS.lg} beside a More button`
    )
    expect(CHARTS_SKILL).toContain(
      `--chart-${palette.categorical.light.length}`
    )
  })

  it('teaches the charts skill the card keys a chart document rejects', () => {
    const [, list] =
      /It is a chart card without (.+?): `version: 1`/.exec(CHARTS_SKILL) ?? []
    const keys = [...(list ?? '').matchAll(/`(\w+)`/g)].map((m) => m[1]!)
    expect(keys).toEqual(['id', 'size', 'state', 'legend', 'view'])
    const doc = {
      version: 1,
      kind: 'chart',
      label: 'Sales pace',
      source: 'Oztix sales.',
      plot: {
        kind: 'funnel',
        steps: [
          { label: 'Viewed', value: 2 },
          { label: 'Paid', value: 1 }
        ]
      }
    }
    expect(validateChartDocument(doc).ok).toBe(true)
    for (const key of keys)
      expect(validateChartDocument({ ...doc, [key]: 'md' }).ok).toBe(false)
  })
})
