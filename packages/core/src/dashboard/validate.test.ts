import { describe, expect, it } from 'vitest'

import { validateDashboard } from './validate'

const stat = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  kind: 'stat',
  size: 'stat',
  label: 'Tickets sold',
  value: 1842,
  ...extra
})
const spec = (cards: unknown[]) => ({
  version: 1,
  title: 'Show',
  sections: [{ title: 'At a glance', cards }]
})
const four = [stat('a'), stat('b'), stat('c'), stat('d')]
const paths = (input: unknown) =>
  validateDashboard(input).problems.map((p) => p.path)

describe('validateDashboard', () => {
  it('passes a clean description', () => {
    const result = validateDashboard(spec(four))
    expect(result.ok).toBe(true)
    expect(result.problems).toEqual([])
  })

  it('never throws on junk', () => {
    for (const junk of [null, 42, 'x', { version: 2 }, { sections: 'no' }])
      expect(validateDashboard(junk).ok).toBe(false)
  })

  it('reports schema problems with paths', () => {
    expect(paths(spec([{ ...stat('a'), kind: 'pie' }]))).toContain(
      'sections[0].cards[0].kind'
    )
  })

  it('reports duplicate ids', () => {
    const result = validateDashboard(
      spec([stat('a'), stat('a'), stat('b'), stat('c')])
    )
    expect(result.ok).toBe(false)
    expect(result.problems).toContainEqual(
      expect.objectContaining({
        path: 'sections[0].cards[1].id',
        severity: 'error'
      })
    )
  })

  it('checks sizes per kind', () => {
    expect(paths(spec([stat('a', { size: 'lg' })]))).toContain(
      'sections[0].cards[0].size'
    )
    expect(
      paths(
        spec([
          { id: 'n', kind: 'note', size: 'stat', label: 'Note', body: 'Text' }
        ])
      )
    ).toContain('sections[0].cards[0].size')
  })

  it('warns about row gaps', () => {
    const result = validateDashboard(spec([stat('a'), stat('b'), stat('c')]))
    expect(result.ok).toBe(true)
    expect(result.problems[0]).toMatchObject({
      path: 'sections[0]',
      severity: 'warning'
    })
    expect(result.problems[0]!.message).toMatch(/desktop/)
  })

  it('rejects a headline with both value and takeaway', () => {
    const chart = {
      id: 'p',
      kind: 'chart',
      size: 'full',
      label: 'Sales pace',
      value: 1,
      takeaway: 'Ahead of similar shows',
      plot: { kind: 'static', src: '/p.svg', alt: 'Pace' },
      table: { columns: [{ key: 'a', header: 'A', kind: 'number' }], rows: [] },
      source: 'Oztix sales.'
    }
    expect(paths(spec([chart]))).toContain('sections[0].cards[0].takeaway')
  })

  it('limits visual columns to two', () => {
    const table = {
      id: 't',
      kind: 'table',
      size: 'full',
      label: 'Upcoming shows',
      takeaway: 'Two shows are behind',
      source: 'Oztix sales.',
      columns: ['a', 'b', 'c'].map((key) => ({
        key,
        header: key,
        kind: 'sparkline'
      })),
      rows: []
    }
    expect(paths(spec([table]))).toContain('sections[0].cards[0].columns')
  })

  it('warns when copy will truncate at its size', () => {
    const result = validateDashboard(
      spec([
        stat('a', { label: 'Tickets sold across every venue' }),
        stat('b'),
        stat('c'),
        stat('d')
      ])
    )
    expect(result.problems).toContainEqual(
      expect.objectContaining({
        path: 'sections[0].cards[0].label',
        severity: 'warning'
      })
    )
  })

  it('flags dashes and title case in copy', () => {
    const cards = [
      stat('a', { context: 'This week — up' }),
      stat('b', { label: 'Tickets Sold Today' }),
      stat('c'),
      stat('d')
    ]
    expect(paths(spec(cards))).toEqual(
      expect.arrayContaining([
        'sections[0].cards[0].context',
        'sections[0].cards[1].label'
      ])
    )
  })
})
