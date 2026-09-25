import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(import.meta.dirname, 'charts.css'), 'utf-8')
const safelist = readFileSync(
  join(import.meta.dirname, 'safelist.html'),
  'utf-8'
)

describe('charts.css safelist', () => {
  it('names every @utility in safelist.html so Tailwind cannot purge it', () => {
    const utilities = [...css.matchAll(/@utility ([\w-]+)/g)].map((m) => m[1])
    expect(utilities.length).toBeGreaterThan(0)
    for (const utility of utilities) expect(safelist).toContain(utility)
  })
})
