import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SRC_DIR = dirname(fileURLToPath(import.meta.url))

const clientEntries = readdirSync(SRC_DIR).filter((folder) => {
  try {
    return readFileSync(join(SRC_DIR, folder, 'index.tsx'), 'utf8').startsWith(
      "'use client'"
    )
  } catch {
    return false
  }
})

// Under RSC every export of a 'use client' module is a client reference, so a
// plain function exported there throws when a server calls it.
describe("'use client' entries", () => {
  it('cover every chart', () => {
    expect(clientEntries).toEqual(
      expect.arrayContaining(['LineChart', 'SmallMultiples', 'Chart'])
    )
  })

  // 30s: cold-transforms the chart engine (TanStack), which is slow under
  // turbo's parallel load and flakes past Vitest's 5s default.
  it.each(clientEntries)(
    '%s exports only components',
    async (folder) => {
      const entry: Record<string, unknown> = await import(
        `./${folder}/index.tsx`
      )
      for (const [name, value] of Object.entries(entry))
        expect(
          typeof value === 'function' && /^[A-Z]/.test(name),
          `${folder} exports ${name}`
        ).toBe(true)
    },
    30_000
  )
})

describe('tables entry', () => {
  it('offers a table for every chart kind', async () => {
    const tables = await import('./tables')
    expect(Object.keys(tables).sort()).toEqual([
      'barChartTable',
      'cardTable',
      'funnelTable',
      'heatmapTable',
      'histogramTable',
      'lineChartTable',
      'plotTable',
      'rankedBarsTable',
      'scatterTable',
      'smallMultiplesTable',
      'stackedBarsTable'
    ])
  })
})
