import { readdir } from 'fs/promises'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

import {
  BRAND,
  CHARTS,
  COMPONENTS,
  CONTENT,
  type CatalogueCategory,
  FOUNDATIONS,
  countEntries,
  getCatalogue,
  getPageStatuses,
  parseStatus
} from './page-manifest'

const entriesIn = (groups: CatalogueCategory[], group: string) =>
  groups.find(({ name }) => name === group)?.entries ?? []

describe('getCatalogue', () => {
  it('cross lists a page in another catalogue without moving its route', async () => {
    const components = await getCatalogue(COMPONENTS)
    const status = entriesIn(components, 'Status')

    expect(status).toContainEqual(
      expect.objectContaining({
        title: 'Meter',
        href: '/charts/meter',
        crossListedFrom: '/charts'
      })
    )
    expect(entriesIn(components, 'Collections')).toContainEqual(
      expect.objectContaining({
        title: 'DataTable',
        href: '/charts/data-table',
        crossListedFrom: '/charts'
      })
    )
  })

  it('keeps the page in its own catalogue once, unmarked', async () => {
    const charts = await getCatalogue(CHARTS)
    const meters = charts
      .flatMap(({ entries }) => entries)
      .filter(({ href }) => href === '/charts/meter')

    expect(meters).toEqual([
      expect.objectContaining({ category: 'Data pieces' })
    ])
    expect(meters[0]).not.toHaveProperty('crossListedFrom')
  })

  it('does not count cross listings as the catalogue’s own pages', async () => {
    const components = await getCatalogue(COMPONENTS)
    const own = components.map((group) => ({
      ...group,
      entries: group.entries.filter((entry) => !entry.crossListedFrom)
    }))

    expect(countEntries(components)).toBe(countEntries(own))
  })

  it('sorts cross listings by title, ignoring their own catalogue order', async () => {
    const status = entriesIn(await getCatalogue(COMPONENTS), 'Status')
    const titles = status.map(({ title }) => title)

    expect(titles).toContain('StatTile')
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)))
  })

  it('orders data pieces by their page order', async () => {
    const pieces = entriesIn(await getCatalogue(CHARTS), 'Data pieces')
    expect(pieces.map(({ title }) => title)).toEqual([
      'StatTile',
      'Meter',
      'Sparkline',
      'DataTable',
      'Delta'
    ])
  })

  it('groups charts in the catalogue order', async () => {
    const charts = await getCatalogue(CHARTS)
    expect(charts.map(({ name }) => name)).toEqual(CHARTS.categories)
  })

  it('leaves hidden pages out', async () => {
    const foundations = await getCatalogue(FOUNDATIONS)
    const hrefs = foundations.flatMap(({ entries }) =>
      entries.map(({ href }) => href)
    )
    expect(hrefs).not.toContain('/foundations/data-visualisation')
  })
})

describe('Chart types group', () => {
  it('sits between data pieces and chart parts', () => {
    expect(CHARTS.categories).toEqual([
      'Guidelines',
      'Layout',
      'Data pieces',
      'Chart types',
      'Chart parts',
      'Examples'
    ])
  })

  it('lists the time and bar charts first, in page order', async () => {
    const types = entriesIn(await getCatalogue(CHARTS), 'Chart types')
    expect(types.slice(0, 4).map(({ title }) => title)).toEqual([
      'LineChart',
      'BarChart',
      'RankedBars',
      'StackedBars'
    ])
  })

  it('lists all eleven chart types in page order', async () => {
    const types = entriesIn(await getCatalogue(CHARTS), 'Chart types')
    expect(types.map(({ title }) => title)).toEqual([
      'LineChart',
      'BarChart',
      'RankedBars',
      'StackedBars',
      'DonutChart',
      'StackedArea',
      'Histogram',
      'Funnel',
      'Heatmap',
      'Scatter',
      'SmallMultiples'
    ])
  })
})

describe('Component groups', () => {
  it('renders only the declared groups, in order', async () => {
    const components = await getCatalogue(COMPONENTS)
    expect(components.map(({ name }) => name)).toEqual(COMPONENTS.categories)
  })

  it('lists dashboard period with the other date components', async () => {
    const dates = entriesIn(await getCatalogue(COMPONENTS), 'Date and time')
    expect(dates).toContainEqual(
      expect.objectContaining({
        href: '/charts/dashboard-period',
        crossListedFrom: '/charts'
      })
    )
    expect(dates).toContainEqual(
      expect.objectContaining({ href: '/components/date-range-picker' })
    )
  })
})

describe('Content catalogue', () => {
  it('lists the writing guides and cross lists date and time', async () => {
    const content = await getCatalogue(CONTENT)

    expect(entriesIn(content, 'Writing')).toContainEqual(
      expect.objectContaining({ href: '/content/voice-and-tone' })
    )
    expect(entriesIn(content, 'Formats')).toContainEqual(
      expect.objectContaining({
        href: '/foundations/date-and-time',
        crossListedFrom: '/foundations'
      })
    )
  })
})

describe('the Brand catalogue', () => {
  it('lists every page under /brand in its Brand group, so the overview and home count miss none', async () => {
    const dirs = await readdir(join(import.meta.dirname, '../app/brand'), {
      withFileTypes: true
    })
    const pages = dirs
      .filter((dir) => dir.isDirectory())
      .map((dir) => `/brand/${dir.name}`)
    const brand = await getCatalogue(BRAND)

    expect(
      entriesIn(brand, 'Brand')
        .map(({ href }) => href)
        .sort()
    ).toEqual(pages.sort())
    expect(countEntries(brand)).toBe(pages.length)
  })
})

describe('parseStatus', () => {
  it.each(['alpha', 'beta', 'stable', 'deprecated'])('takes %s', (status) => {
    expect(parseStatus(status, '/components/x')).toBe(status)
  })

  it('takes no status as none', () => {
    expect(parseStatus(undefined, '/components/x')).toBeUndefined()
  })

  it('fails on no status where one is required', () => {
    expect(() => parseStatus(undefined, '/roadie-widgets/x', true)).toThrow(
      '/roadie-widgets/x has no status'
    )
  })

  it.each(['experimental', 'Beta', 1])('fails on %s', (status) => {
    expect(() => parseStatus(status, '/components/x')).toThrow(
      '/components/x has status'
    )
  })
})

describe('getPageStatuses', () => {
  it('reads the status of every page that sets one', async () => {
    const statuses = await getPageStatuses()
    expect(statuses['/components/record-table']).toBe('alpha')
    expect(statuses['/foundations/records']).toBe('alpha')
    expect(statuses['/components/button']).toBe('stable')
    expect(statuses['/foundations/colors']).toBeUndefined()
  })
})
