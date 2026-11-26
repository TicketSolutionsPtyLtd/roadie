import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The charts and the dashboard validator must agree on these, so each is
// declared once, in layout.ts, and the charts import it.
const LIMITS = ['SERIES_CAP', 'ANNOTATION_LABEL_LIMIT', 'BAR_INTERVAL_MS']
const OLD_COPIES = ['INTERVAL_MS', 'SERIES_LABEL_LIMIT']

const packages = join(__dirname, '../../..')

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sources(path)
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}

const declarations = (name: string) =>
  readdirSync(packages)
    .filter((pkg) =>
      statSync(join(packages, pkg, 'src'), { throwIfNoEntry: false })
    )
    .flatMap((pkg) => sources(join(packages, pkg, 'src')))
    .filter((file) =>
      new RegExp(`(const|let|var)\\s+${name}\\b`).test(
        readFileSync(file, 'utf8')
      )
    )
    .map((file) => file.slice(packages.length + 1))

describe('plot limits', () => {
  it.each(LIMITS)('%s is declared once, in core layout', (name) => {
    expect(declarations(name)).toEqual(['core/src/dashboard/layout.ts'])
  })

  it.each(OLD_COPIES)('%s is not redeclared', (name) => {
    expect(declarations(name)).toEqual([])
  })
})
