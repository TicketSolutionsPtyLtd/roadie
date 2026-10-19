import { describe, expect, it } from 'vitest'

import type { Change, Release, ReleaseHistory, ReleaseRef } from './releases'
import { statusCandidates } from './status-candidates'

const change = (href: string, breaking: boolean): Change => ({
  id: href,
  kind: 'changed',
  breaking,
  packages: ['@oztix/roadie-components'],
  summary: '',
  details: '',
  pages: [{ title: href, href }]
})

const release = (
  id: string,
  date: string,
  changes: Change[] = []
): Release => ({
  id,
  date,
  time: null,
  packages: [],
  changes
})

const ref = ({ id, date }: Release): ReleaseRef => ({
  label: 'Components',
  version: id,
  date,
  id
})

const old = release('2.0.0', '2026-08-01')
const recent = release('2.1.0', '2026-10-10')
const history = (
  releases: Release[],
  pending: Change[] = []
): ReleaseHistory => ({
  unreleased: { packages: [], changes: pending },
  releases
})

const page = (
  route: string,
  status: 'alpha' | 'beta' | 'stable',
  added: Release
) => ({
  route,
  status,
  release: { added: ref(added), updated: null, upcoming: false }
})

describe('statusCandidates', () => {
  it('lists beta pages shipped 30 days ago and alpha pages shipped 90 days ago', () => {
    const pages = [
      page('/components/old-beta', 'beta', old),
      page('/components/new-beta', 'beta', recent),
      page('/components/old-alpha', 'alpha', release('1.0.0', '2026-07-01')),
      page('/components/new-alpha', 'alpha', old),
      page('/components/stable', 'stable', old)
    ]
    expect(
      statusCandidates(pages, history([recent, old]), '2026-10-19')
    ).toEqual([
      expect.objectContaining({
        route: '/components/old-beta',
        to: 'stable',
        days: 79
      }),
      expect.objectContaining({
        route: '/components/old-alpha',
        to: 'beta',
        days: 110
      })
    ])
  })

  it('skips a beta page broken since it shipped, or about to be', () => {
    const broken = release('2.1.0', '2026-10-10', [
      change('/components/a#props', true)
    ])
    const ownRelease = release('2.0.0', '2026-08-01', [
      change('/components/b', true)
    ])
    const pages = [
      page('/components/a', 'beta', ownRelease),
      page('/components/b', 'beta', ownRelease),
      page('/components/c', 'beta', ownRelease)
    ]
    expect(
      statusCandidates(
        pages,
        history([broken, ownRelease], [change('/components/c', true)]),
        '2026-10-19'
      ).map(({ route }) => route)
    ).toEqual(['/components/b'])
  })

  it('skips a page with no dated release', () => {
    expect(
      statusCandidates(
        [
          {
            route: '/components/new',
            status: 'beta',
            release: { added: 'unreleased', updated: null, upcoming: true }
          }
        ],
        history([]),
        '2026-10-19'
      )
    ).toEqual([])
  })
})
