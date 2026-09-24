import { readFileSync, readdirSync } from 'node:fs'
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
