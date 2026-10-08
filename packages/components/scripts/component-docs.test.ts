import { describe, expect, it } from 'vitest'

import {
  caseSlugs,
  componentSlug,
  exportedFolders,
  findMissingDocs
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
