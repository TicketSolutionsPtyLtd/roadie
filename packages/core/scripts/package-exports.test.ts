import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { exportEntries, isShipped, readExports } from './package-exports.mjs'

const fixture = path.join(import.meta.dirname, 'manifest/fixtures/workspace')

describe('exportEntries', () => {
  it.each([
    [
      'import before default',
      { default: './dist/a.cjs', import: './dist/a.js' },
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
        node: { default: './dist/load.node.js' },
        import: './dist/load.js'
      }
    })
    expect(entry?.files).toEqual([
      './dist/load.d.ts',
      './dist/load.node.js',
      './dist/load.js'
    ])
  })

  it('skips a subpath an exports block hides with null', () => {
    expect(
      exportEntries({ './a': './dist/a.js', './private/*': null })
    ).toEqual([expect.objectContaining({ subpath: './a' })])
  })

  it('reads a string exports block as the root subpath', () => {
    expect(exportEntries('./src/index.js')).toEqual([
      expect.objectContaining({ subpath: '.', target: './src/index.js' })
    ])
  })

  it('leaves out the source of JavaScript that has none', () => {
    const [entry] = exportEntries({ './widget': './src/widget.js' }, fixture)
    expect(entry).toEqual(expect.objectContaining({ kind: 'js' }))
    expect(entry?.source).toBeUndefined()
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
})

describe('isShipped', () => {
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
    'dist/a.test.d.ts',
    'dist/testUtils.d.ts',
    'dist/testUtils-Bx1.js',
    'dist/Sortable/lanes.testUtils.js',
    'dist/Sortable/lanes.testUtils.d.ts',
    'dist/lanes.testUtils-Bx1.js',
    'dist/Sortable.lanesTestUtils.js',
    'dist/lanes-test-utils.js',
    'dist/lanes_testUtils.js',
    'dist/lanes.test_utils.js',
    'dist/test-utils/index.js',
    'dist/testUtils/index.js',
    'dist/Sortable/lanes.testUtils/index.js',
    'dist/_test/browser.js',
    'dist/Hero/fixtures.js',
    'dist/plot/testChart.js',
    'dist/plot/browserTesting.d.ts',
    'dist/test/setup.js',
    'dist/tests/setup.js',
    'src/components/Toolbar/Toolbar.ssr.tsx',
    'dist/components/Toolbar/Toolbar.ssr.js',
    'src/components/Pane/paneColumns.ts',
    'dist/utils/renderCounter.d.ts',
    'src/a.spec.ts'
  ])('leaves out %s', (file) => {
    expect(isShipped(file)).toBe(false)
  })

  it.each([
    'src/css/roadie.css',
    'dist/testing.js',
    'dist/attest.js',
    'dist/latest.d.ts',
    'dist/contest/index.js',
    'dist/latestUtils.js',
    'dist/contestUtils.js',
    'dist/contest-utils.js',
    'dist/Contest/latest.utils.js',
    'dist/contest_utils/index.js',
    'dist/prefixtures.js',
    'dist/plot/hitTesting.js',
    'dist/plot/testCharts.js',
    'dist/components/Toolbar/ToolbarSsr.js',
    'src/components/Pane/PaneColumns.tsx'
  ])('ships %s', (file) => {
    expect(isShipped(file)).toBe(true)
  })
})
