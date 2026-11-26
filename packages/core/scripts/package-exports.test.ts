import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { exportEntries, readExports } from './package-exports.mjs'

const fixture = path.join(import.meta.dirname, 'manifest/fixtures/workspace')

describe('exportEntries', () => {
  it.each([
    [
      'conditions',
      { types: './dist/a.d.ts', import: './dist/a.js' },
      './dist/a.js',
      'js'
    ],
    ['a default', { default: './dist/b.js' }, './dist/b.js', 'js'],
    [
      'nested conditions',
      { import: { types: './dist/n.d.ts', default: './dist/n.js' } },
      './dist/n.js',
      'js'
    ],
    ['a string', './dist/vue.js', './dist/vue.js', 'js'],
    [
      'a stylesheet',
      { style: './src/css/a.css', default: './src/css/a.css' },
      './src/css/a.css',
      'css'
    ],
    [
      'JSON',
      './dist/roadie.manifest.json',
      './dist/roadie.manifest.json',
      'json'
    ],
    [
      'files shipped as they are',
      './src/thumbnails/*',
      './src/thumbnails/*',
      'asset'
    ]
  ])('reads %s as the file an app imports', (_, value, target, kind) => {
    expect(exportEntries({ './x': value })).toEqual([
      expect.objectContaining({ subpath: './x', target, kind })
    ])
  })

  it('lists every file any condition points at', () => {
    const [entry] = exportEntries({
      './load': {
        types: './dist/load.d.ts',
        node: './dist/load.node.js',
        import: './dist/load.js'
      }
    })
    expect(entry?.files).toEqual([
      './dist/load.d.ts',
      './dist/load.node.js',
      './dist/load.js'
    ])
  })

  it('reads a string exports block as the root subpath', () => {
    expect(exportEntries('./src/index.js')).toEqual([
      expect.objectContaining({ subpath: '.', target: './src/index.js' })
    ])
  })
})

describe('readExports', () => {
  it('finds the TypeScript source of each built JavaScript subpath', () => {
    const dir = path.join(fixture, 'skins')
    expect(
      readExports(dir).map(({ subpath, source }) => [subpath, source])
    ).toEqual([
      ['./chip/core', path.join(dir, 'src/widgets/chip/core/index.ts')],
      ['./chip/react', path.join(dir, 'src/widgets/chip/react/index.ts')],
      ['./chip/vue', path.join(dir, 'src/widgets/chip/vue/index.ts')]
    ])
  })

  it('leaves out the source of JavaScript that has none', () => {
    const [entry] = exportEntries({ './widget': './src/widget.js' }, fixture)
    expect(entry).toEqual(expect.objectContaining({ kind: 'js' }))
    expect(entry?.source).toBeUndefined()
  })
})
