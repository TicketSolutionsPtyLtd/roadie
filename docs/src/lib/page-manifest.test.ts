import { describe, expect, it } from 'vitest'

import {
  CHARTS,
  COMPONENTS,
  type CatalogueCategory,
  FOUNDATIONS,
  countEntries,
  getCatalogue
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
      'DataTable'
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
})
