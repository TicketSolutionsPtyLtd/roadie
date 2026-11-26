import { describe, expect, it } from 'vitest'

import { packProblems } from './check-pack.mjs'
import { exportEntries } from './package-exports.mjs'

const maps: Record<string, object> = {
  'dist/a.js.map': { sources: ['../src/a.ts'], sourcesContent: ['code'] },
  'dist/a.d.ts.map': { sources: ['../src/a.ts'] },
  'dist/b.d.ts.map': { sources: ['../src/b.ts'] },
  'dist/c.js.map': {
    sources: ['../src/c.ts', '../src/d.ts'],
    sourcesContent: ['code', null]
  },
  'dist/e.js.map': {
    sources: [
      '../src/e.ts',
      '../../../node_modules/.pnpm/aria-query@5.3.2/node_modules/aria-query/lib/index.js',
      '../../../node_modules/.pnpm/aria-query@5.3.2/node_modules/aria-query/lib/roles.js',
      '../../../node_modules/.pnpm/@testing-library+dom@10.4.2/node_modules/@testing-library/dom/dist/index.js'
    ],
    sourcesContent: ['code', 'code', 'code', 'code']
  }
}
const read = (file: string) => JSON.stringify(maps[file])

describe('packProblems', () => {
  it("flags a file that doesn't ship", () => {
    expect(packProblems(['dist/a.test.d.ts'], read)).toEqual([
      'dist/a.test.d.ts is a test file'
    ])
  })

  it('accepts a file that ships', () => {
    expect(packProblems(['dist/testing.js'], read)).toEqual([])
  })

  it.each([
    [
      'dist/node_modules/.pnpm/@testing-library+dom@10.4.2/node_modules/@testing-library/dom/dist/index.js',
      '@testing-library/dom'
    ],
    ['dist/node_modules/aria-query/lib/index.js', 'aria-query'],
    ['dist/node_modules/vitest/dist/index.js', 'vitest'],
    ['node_modules/vitest/dist/index.js', 'vitest'],
    [
      'dist/node_modules/.pnpm/axe-core@4.14.0/node_modules/axe-core/axe.js',
      'axe-core'
    ],
    ['dist/node_modules/@vitest/spy/dist/index.js', '@vitest/spy']
  ])('flags %s as part of a test library', (file, library) => {
    expect(packProblems([file], read)).toEqual([
      `${file} is from ${library}, a test library`
    ])
  })

  it('names each test library once, with how many files it adds', () => {
    const lib =
      'dist/node_modules/.pnpm/aria-query@5.3.0/node_modules/aria-query/lib'
    expect(
      packProblems(
        [`${lib}/index.js`, 'dist/index.js', `${lib}/a.js`, `${lib}/b.js`],
        read
      )
    ).toEqual([
      `${lib}/index.js and 2 more are from aria-query, a test library`
    ])
  })

  it("counts a test library's own map as one of its files, unread", () => {
    const lib = 'dist/node_modules/aria-query/lib'
    expect(
      packProblems([`${lib}/index.js`, `${lib}/index.js.map`], read)
    ).toEqual([
      `${lib}/index.js and 1 more are from aria-query, a test library`
    ])
  })

  it.each([
    'dist/node_modules/.pnpm/@atlaskit+pragmatic-drag-and-drop@1.7.7/node_modules/@atlaskit/pragmatic-drag-and-drop/dist/esm/index.js',
    'dist/node_modules/aria-query-builder/index.js',
    'dist/aria-query/index.js',
    'dist/vitest/index.js'
  ])('ships %s, which is no test library', (file) => {
    expect(packProblems([file], read)).toEqual([])
  })

  it('flags a bundle whose map names a test library', () => {
    expect(packProblems(['dist/e.js.map'], read)).toEqual([
      'dist/e.js.map bundles test libraries: aria-query, @testing-library/dom'
    ])
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
    const exports = exportEntries({
      '.': { types: './dist/index.d.ts', import: './dist/index.js' },
      './roadie.manifest.json': './dist/roadie.manifest.json',
      './css': { style: './src/css/ui.css', default: './src/css/ui.css' }
    })
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
    const exports = exportEntries({ './thumbnails/*': './src/thumbnails/*' })
    expect(packProblems(['src/thumbnails/hero.svg'], read, exports)).toEqual([])
    expect(packProblems(['dist/index.js'], read, exports)).toEqual([
      "exports points at ./src/thumbnails/*, which the tarball doesn't ship"
    ])
  })

  it('accepts an export that files leaves out by name', () => {
    const exports = exportEntries({ './internal': './src/internal.js' })
    expect(packProblems([], read, exports, ['src/internal.js'])).toEqual([])
  })
})
