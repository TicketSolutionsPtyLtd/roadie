/** How settled a documented API is. `docs/contributing/DOCS_PAGES.md` defines each. */
export const PAGE_STATUSES = ['alpha', 'beta', 'stable', 'deprecated'] as const

export type PageStatus = (typeof PAGE_STATUSES)[number]

export const STATUS_DETAILS: Record<
  PageStatus,
  {
    label: string
    intent: 'warning' | 'info' | 'success' | 'danger'
    /** Shown in the navigation beside the page's title. */
    inNavigation: boolean
  }
> = {
  alpha: { label: 'Alpha', intent: 'warning', inNavigation: true },
  beta: { label: 'Beta', intent: 'info', inNavigation: true },
  stable: { label: 'Stable', intent: 'success', inNavigation: false },
  deprecated: { label: 'Deprecated', intent: 'danger', inNavigation: false }
}

export const STATUS_ROUTE = '/overview/changelog#status'
