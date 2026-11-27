import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { generateExports } from './generate-exports.mjs'

function workspace(folders: Record<string, string>) {
  const dir = mkdtempSync(path.join(tmpdir(), 'generate-exports-'))
  writeFileSync(
    path.join(dir, 'package.json'),
    `${JSON.stringify({ name: 'x', exports: { './gone': './dist/gone.js' }, files: ['dist'] }, null, 2)}\n`
  )
  for (const [folder, file] of Object.entries(folders)) {
    mkdirSync(path.join(dir, folder), { recursive: true })
    if (file) writeFileSync(path.join(dir, folder, file), '')
  }
  return dir
}

const quietly = { log: () => {} }

describe('generateExports', () => {
  it('gives each source folder with an index a kebab-case subpath, between the fixed ones', () => {
    const dir = workspace({
      'src/components/DateRangePicker': 'index.tsx',
      'src/components/QRCode': 'index.ts',
      'src/components/Draft': 'Draft.tsx',
      'src/components/Indicator': 'index.tsx',
      'src/components/utils': 'index.ts'
    })
    generateExports(
      dir,
      {
        source: 'src/components',
        capitalOnly: true,
        exclude: ['Indicator'],
        before: { '.': './dist/index.js' },
        after: { './roadie.manifest.json': './dist/roadie.manifest.json' }
      },
      quietly
    )
    const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'))
    expect(pkg.exports).toEqual({
      '.': './dist/index.js',
      './date-range-picker': {
        types: './dist/components/DateRangePicker/index.d.ts',
        import: './dist/components/DateRangePicker/index.js'
      },
      './qr-code': {
        types: './dist/components/QRCode/index.d.ts',
        import: './dist/components/QRCode/index.js'
      },
      './roadie.manifest.json': './dist/roadie.manifest.json'
    })
    expect(Object.keys(pkg.exports)).toEqual([
      '.',
      './date-range-picker',
      './qr-code',
      './roadie.manifest.json'
    ])
    expect(pkg.files).toEqual(['dist'])
  })

  it('takes lowercase folders unless told to take only capitalised ones', () => {
    const dir = workspace({
      'src/tables': 'index.ts',
      'src/LineChart': 'index.tsx'
    })
    generateExports(dir, { source: 'src' }, quietly)
    const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'))
    expect(Object.keys(pkg.exports)).toEqual(['./line-chart', './tables'])
    expect(pkg.exports['./tables'].import).toBe('./dist/tables/index.js')
  })
})
