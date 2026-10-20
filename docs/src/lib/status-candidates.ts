import type {
  Change,
  PageRelease,
  ReleaseHistory,
  ReleaseRef
} from './releases'
import type { PageStatus } from './status'

export type StatusCandidate = {
  route: string
  from: 'alpha' | 'beta'
  to: 'beta' | 'stable'
  added: ReleaseRef
  days: number
}

const BETA_DAYS = 30
const ALPHA_DAYS = 90
const DAY = 24 * 60 * 60 * 1000

const daysBetween = (from: string, to: string) =>
  Math.floor((Date.parse(to) - Date.parse(from)) / DAY)

const breaks = (route: string) => (change: Change) =>
  change.breaking &&
  change.pages.some((page) => page.href.split('#')[0] === route)

/**
 * Pages due a status review, per `docs/contributing/DOCS_PAGES.md`: beta
 * shipped 30 days ago with no breaking change since, and alpha shipped 90
 * days ago. App use is checked by hand.
 */
export function statusCandidates(
  pages: { route: string; status: PageStatus; release: PageRelease }[],
  { releases, unreleased }: ReleaseHistory,
  today: string
): StatusCandidate[] {
  return pages.flatMap<StatusCandidate>(
    ({ route, status, release: { added } }) => {
      if (status !== 'alpha' && status !== 'beta') return []
      if (!added || added === 'unreleased' || !added.date) return []
      const days = daysBetween(added.date, today)
      if (status === 'alpha')
        return days >= ALPHA_DAYS
          ? [{ route, from: status, to: 'beta', added, days }]
          : []
      // Newest first, so the releases before the added one came after it.
      const index = releases.findIndex((release) => release.id === added.id)
      const since = index >= 0 ? releases.slice(0, index) : releases
      const broken = [...unreleased.changes, ...since.flatMap((r) => r.changes)]
      return days >= BETA_DAYS && !broken.some(breaks(route))
        ? [{ route, from: status, to: 'stable', added, days }]
        : []
    }
  )
}
