import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ENGINE_FREE = ['Chart', 'ChartLegend', 'ChartTooltip', 'ChartPatterns']

// Vite's import-analysis plugin rewrites `new URL(dynamic, import.meta.url)`
// at build time, so a templated folder name resolves wrong; join plain paths
// instead.
const SRC_DIR = dirname(dirname(fileURLToPath(import.meta.url)))

describe('the card frame never loads the chart engine', () => {
  it.each(ENGINE_FREE)('%s imports no @tanstack module', (folder) => {
    const dir = join(SRC_DIR, folder)
    for (const file of readdirSync(dir).filter(
      (f) => /\.tsx?$/.test(f) && !f.includes('.test.')
    ))
      expect(readFileSync(join(dir, file), 'utf8')).not.toMatch(
        /from ['"]@tanstack\//
      )
  })
})

// Type-only imports are erased, so only value imports can pull the engine in.
const VALUE_IMPORT =
  /(?:import|export)\s+(?!type\s)[^'"]*?from\s+['"]([^'"]+)['"]/g

function resolveSource(from: string, specifier: string) {
  const base = join(dirname(from), specifier)
  return [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts')].find(existsSync)
}

function importGraph(entry: string) {
  const seen = new Set<string>()
  const packages = new Set<string>()
  const visit = (file: string) => {
    if (seen.has(file)) return
    seen.add(file)
    for (const [, specifier = ''] of readFileSync(file, 'utf8').matchAll(
      VALUE_IMPORT
    )) {
      if (!specifier.startsWith('.')) {
        packages.add(specifier)
        continue
      }
      const resolved = resolveSource(file, specifier)
      if (resolved) visit(resolved)
    }
  }
  visit(entry)
  return { files: [...seen], packages: [...packages] }
}

describe('server table derivation stays engine-free', () => {
  it.each([
    'LineChart',
    'BarChart',
    'RankedBars',
    'StackedBars',
    'Histogram',
    'Funnel',
    'Heatmap',
    'Scatter',
    'SmallMultiples'
  ])(
    '%s/table.ts imports no engine, directly or through its helpers',
    (folder) => {
      const { files, packages } = importGraph(join(SRC_DIR, folder, 'table.ts'))
      expect(files.length).toBeGreaterThan(1)
      expect(packages.filter((p) => p.startsWith('@tanstack/'))).toEqual([])
      expect(files.filter((f) => /[/\\]definition\.tsx?$/.test(f))).toEqual([])
    }
  )
})

describe('the tables entry stays engine-free', () => {
  it('imports no engine and no chart definition', () => {
    const { packages, files } = importGraph(join(SRC_DIR, 'tables', 'index.ts'))
    expect(packages.filter((p) => p.startsWith('@tanstack/'))).toEqual([])
    expect(files.filter((f) => /[/\\]definition\.tsx?$/.test(f))).toEqual([])
    expect(
      files.filter((f) => /[/\\][A-Z]\w+[/\\]table\.ts$/.test(f))
    ).toHaveLength(9)
  })
})
