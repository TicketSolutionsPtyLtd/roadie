import { describe, expect, it } from 'vitest'

import { packProblems } from './check-pack.mjs'

const maps: Record<string, object> = {
  'dist/a.js.map': { sources: ['../src/a.ts'], sourcesContent: ['code'] },
  'dist/a.d.ts.map': { sources: ['../src/a.ts'] },
  'dist/b.d.ts.map': { sources: ['../src/b.ts'] },
  'dist/c.js.map': {
    sources: ['../src/c.ts', '../src/d.ts'],
    sourcesContent: ['code', null]
  }
}
const read = (file: string) => JSON.stringify(maps[file])

describe('packProblems', () => {
  it.each([
    'src/css/focusRing.browser.test.tsx',
    'src/css/safelist.test.ts',
    'src/css/contrastTestUtils.ts',
    'src/css/testUtils.ts',
    'src/Chart/__screenshots__/line.png',
    'scripts/manifest/fixtures/package.json',
    'src/fixture/a.json',
    'src/__mocks__/x.js',
    'src/test-utils.ts',
    'src/TestUtils.ts',
    'src/a.test-d.ts',
    'dist/a.test.d.ts'
  ])('flags %s as a test file', (file) => {
    expect(packProblems([file], read)).toEqual([`${file} is a test file`])
  })

  it.each([
    'src/css/roadie.css',
    'dist/testing.js',
    'dist/attest.js',
    'dist/latest.d.ts',
    'dist/contest/index.js'
  ])('ships %s', (file) => {
    expect(packProblems([file], read)).toEqual([])
  })

  it('accepts a map that embeds its sources', () => {
    expect(packProblems(['dist/a.js.map'], read)).toEqual([])
  })

  it('accepts a map whose sources ship', () => {
    expect(packProblems(['dist/b.d.ts.map', 'src/b.ts'], read)).toEqual([])
  })

  it('flags a map whose sources neither ship nor are embedded', () => {
    expect(packProblems(['dist/a.d.ts.map'], read)).toEqual([
      "dist/a.d.ts.map points at ../src/a.ts, which the tarball doesn't ship"
    ])
  })

  it('flags only the sources a map leaves out', () => {
    expect(packProblems(['dist/c.js.map'], read)).toEqual([
      "dist/c.js.map points at ../src/d.ts, which the tarball doesn't ship"
    ])
  })

  it('flags an export the tarball leaves out', () => {
    const exports = {
      '.': { types: './dist/index.d.ts', import: './dist/index.js' },
      './roadie.manifest.json': './dist/roadie.manifest.json',
      './css': { style: './src/css/ui.css', default: './src/css/ui.css' }
    }
    expect(
      packProblems(
        ['dist/index.d.ts', 'dist/index.js', 'src/css/ui.css'],
        read,
        exports
      )
    ).toEqual([
      "exports points at ./dist/roadie.manifest.json, which the tarball doesn't ship"
    ])
  })

  it('accepts a wildcard export with a file to match', () => {
    const exports = { './thumbnails/*': './src/thumbnails/*' }
    expect(packProblems(['src/thumbnails/hero.svg'], read, exports)).toEqual([])
    expect(packProblems(['dist/index.js'], read, exports)).toEqual([
      "exports points at ./src/thumbnails/*, which the tarball doesn't ship"
    ])
  })

  it('accepts an export that files leaves out by name', () => {
    const exports = { './internal': './src/internal.js' }
    expect(packProblems([], read, exports, ['src/internal.js'])).toEqual([])
  })
})
