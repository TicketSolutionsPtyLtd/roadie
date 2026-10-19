import { describe, expect, it } from 'vitest'

import {
  caseSlugs,
  componentSlug,
  exportedFolders,
  findMissingDocs,
  findMissingStatus,
  pageStatus
} from './component-docs.mjs'

describe('componentSlug', () => {
  it.each([
    ['Button', 'button'],
    ['DateRangePicker', 'date-range-picker'],
    ['OTPField', 'otp-field'],
    ['QRCode', 'qr-code']
  ])('turns %s into %s', (folder, slug) => {
    expect(componentSlug(folder)).toBe(slug)
  })
})

describe('exportedFolders', () => {
  it('reads component folders from export paths, not subpath names', () => {
    expect(
      exportedFolders({
        '.': { import: './dist/index.js' },
        './css': { default: './src/css/components.css' },
        './qr-code': { import: './dist/components/QRCode/index.js' },
        './spot-illustrations': {
          import: './dist/components/SpotIllustration/index.js'
        },
        './hooks': { import: './dist/hooks/index.js' }
      })
    ).toEqual(['QRCode', 'SpotIllustration'])
  })

  it('takes a pattern, as charts keeps folders straight under dist', () => {
    expect(
      exportedFolders(
        {
          '.': { import: './dist/index.js' },
          './css': './src/css/charts.css',
          './line-chart': { import: './dist/LineChart/index.js' },
          './scatter': './dist/Scatter/index.js',
          './tables': { import: './dist/tables/index.js' }
        },
        /^\.\/dist\/([A-Z]\w+)\//
      )
    ).toEqual(['LineChart', 'Scatter'])
  })
})

describe('caseSlugs', () => {
  it('reads every case label, stacked or not', () => {
    expect(
      caseSlugs(`switch (name) {
    case 'button':
      return null
    case 'label':
    case 'date-range-picker':
      return null
    default:
      return null
  }`)
    ).toEqual(['button', 'label', 'date-range-picker'])
  })

  it('skips commented-out labels', () => {
    expect(
      caseSlugs(`switch (name) {
    case 'button':
    // case 'gauge':
    /* case 'meter': */
    /*
    case 'dial':
    */
      return null
  }`)
    ).toEqual(['button'])
  })
})

describe('findMissingDocs', () => {
  const documented = {
    components: ['Button', 'StatTile'],
    pages: ['button', 'stat-tile'],
    tiles: ['button', 'stat-tile']
  }

  it('passes when every component has a page and a tile', () => {
    expect(findMissingDocs({ ...documented, allowList: {} })).toEqual({
      missing: [],
      staleAllowList: []
    })
  })

  it('names both pieces when a component has neither', () => {
    expect(
      findMissingDocs({
        ...documented,
        components: [...documented.components, 'Gauge'],
        allowList: {}
      }).missing
    ).toEqual([{ component: 'Gauge', missing: ['docs page', 'index tile'] }])
  })

  it.each([
    ['docs page', ['button'], ['button', 'stat-tile']],
    ['index tile', ['button', 'stat-tile'], ['button']]
  ])('names a missing %s on its own', (piece, pages, tiles) => {
    expect(
      findMissingDocs({ ...documented, pages, tiles, allowList: {} }).missing
    ).toEqual([{ component: 'StatTile', missing: [piece] }])
  })

  it('skips an allow-listed component', () => {
    expect(
      findMissingDocs({
        components: ['Button', 'Records'],
        pages: ['button'],
        tiles: ['button'],
        allowList: { Records: 'Documented on foundations/records.' }
      })
    ).toEqual({ missing: [], staleAllowList: [] })
  })

  it('keeps an allow-list entry that has only a page', () => {
    expect(
      findMissingDocs({
        ...documented,
        tiles: ['button'],
        allowList: { StatTile: 'Tile pending.' }
      })
    ).toEqual({ missing: [], staleAllowList: [] })
  })

  it('flags an allow-list entry that is documented or gone', () => {
    expect(
      findMissingDocs({
        ...documented,
        allowList: { Button: 'Missing.', Removed: 'Missing.' }
      }).staleAllowList
    ).toEqual(['Button', 'Removed'])
  })
})

describe('pageStatus', () => {
  it.each([
    [
      "export const metadata = {\n  title: 'Button',\n  status: 'stable',\n  category: 'Actions'\n}\n",
      'stable'
    ],
    [
      'export const metadata = {\n  title: "Badge",\n  status: "beta"\n}\n',
      'beta'
    ],
    [
      "export const metadata = {\n  title: 'Toolbar'\n}\n\nA `status: 'alpha'` in prose.\n",
      undefined
    ],
    ['# No metadata', undefined]
  ])('reads the status from the metadata block only (%#)', (source, status) => {
    expect(pageStatus(source)).toBe(status)
  })
})

describe('findMissingStatus', () => {
  it('flags pages with no status or one outside alpha, beta, stable, and deprecated', () => {
    expect(
      findMissingStatus([
        { slug: 'button', status: 'stable' },
        { slug: 'record-table', status: 'alpha' },
        { slug: 'toolbar', status: undefined },
        { slug: 'badge', status: 'experimental' }
      ])
    ).toEqual([
      { slug: 'toolbar', status: undefined },
      { slug: 'badge', status: 'experimental' }
    ])
  })
})
