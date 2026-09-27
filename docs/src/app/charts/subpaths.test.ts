import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'

import chartsPackage from '../../../../packages/charts/package.json'

const docsSource = fileURLToPath(new URL('../..', import.meta.url))

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(tsx?|mdx)$/.test(entry.name) ? [path] : []
  })
}

describe('charts docs', () => {
  const docs = sourceFiles(docsSource)
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n')

  it.each(
    Object.keys(chartsPackage.exports)
      .filter((key) => key !== '.')
      .map((key) => key.slice(2))
  )('document the @oztix/roadie-charts/%s subpath', (subpath) => {
    expect(docs).toMatch(new RegExp(`@oztix/roadie-charts/${subpath}['"\`]`))
  })
})
