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
  }
> = {
  alpha: { label: 'Alpha', intent: 'warning', flagged: true },
  beta: { label: 'Beta', intent: 'info', flagged: true },
  stable: { label: 'Stable', intent: 'neutral', flagged: false },
  deprecated: { label: 'Deprecated', intent: 'danger', flagged: true }
}

export const STATUS_ROUTE = '/overview/changelog#status'
