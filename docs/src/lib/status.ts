import type { TwinTable } from './twin-table'

/** How settled a documented API is. `docs/contributing/DOCS_PAGES.md` defines each. */
export const PAGE_STATUSES = ['alpha', 'beta', 'stable', 'deprecated'] as const

export type PageStatus = (typeof PAGE_STATUSES)[number]

export const STATUS_DETAILS: Record<
  PageStatus,
  {
    label: string
    intent: 'warning' | 'info' | 'danger' | 'neutral'
    /** A badge in the navigation and beside the page's title. Stable is the norm, so it goes unmarked. */
    flagged: boolean
    summary: string
  }
> = {
  alpha: {
    label: 'Alpha',
    intent: 'warning',
    flagged: true,
    summary: 'Can break in a minor release. Pin the version.'
  },
  beta: {
    label: 'Beta',
    intent: 'info',
    flagged: true,
    summary: 'Ready to use. A minor release can still break it.'
  },
  stable: {
    label: 'Stable',
    intent: 'neutral',
    flagged: false,
    summary: 'Breaks only in a major release.'
  },
  deprecated: {
    label: 'Deprecated',
    intent: 'danger',
    flagged: true,
    summary: 'Being removed. Its page names the replacement.'
  }
}

export const statusTable = (): TwinTable => ({
  head: ['Status', 'Means'],
  rows: PAGE_STATUSES.map((status) => [
    STATUS_DETAILS[status].label,
    STATUS_DETAILS[status].summary
  ])
})

export const STATUS_ROUTE = '/overview/changelog#status'
