// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { Toast } from '@oztix/roadie-components/toast'

import { DocsNavigator, type NavigationDestination } from './Navigation'
import type { PageStatusInfo } from './PageStatus'

const location = vi.hoisted(() => ({ pathname: '/' }))

vi.mock('next/navigation', () => ({
  usePathname: () => location.pathname,
  useRouter: () => ({ push() {}, replace() {}, back() {} }),
  useSearchParams: () => new URLSearchParams()
}))

beforeAll(() => {
  const inert = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver ??= inert as unknown as typeof ResizeObserver
  globalThis.IntersectionObserver ??=
    inert as unknown as typeof IntersectionObserver
  window.matchMedia ??= (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {}
    }) as unknown as MediaQueryList
  Element.prototype.scrollTo ??= () => {}
  Element.prototype.getAnimations ??= () => []
})

afterEach(cleanup)

const destinations: NavigationDestination[] = [
  {
    title: 'Charts',
    href: '/charts',
    overview: true,
    items: [
      { title: 'Charts', href: '/charts' },
      { title: 'Meter', href: '/charts/meter', status: 'beta' },
      { title: 'Funnel', href: '/charts/funnel', status: 'alpha' },
      { title: 'Delta', href: '/charts/delta', status: 'stable' },
      { title: 'Show dashboard', href: '/charts/show-dashboard' }
    ]
  }
]

function renderAt(
  route: string,
  pageWide: Record<string, boolean> = {},
  pageStatus: Record<string, PageStatusInfo> = {}
) {
  location.pathname = route
  // The header's agent menu confirms a copy with a toast.
  render(
    <Toast.Provider>
      <DocsNavigator
        items={destinations}
        pageTitles={{ [route]: 'Page' }}
        pageWide={pageWide}
        markdownTwins={{}}
        pageStatus={pageStatus}
      >
        <p>Body</p>
      </DocsNavigator>
    </Toast.Provider>
  )
}

const backToCharts = () =>
  screen.queryByRole('link', { name: 'Back to Charts', hidden: true })

describe('DocsNavigator header', () => {
  it('gives a page under a section Back to that section', () => {
    renderAt('/charts/meter')
    expect(backToCharts()?.getAttribute('href')).toBe('/charts')
  })

  // Wide pages once dropped their section's list, which made them the root with no Back.
  it('gives a wide page Back to its section too', () => {
    renderAt('/charts/show-dashboard', { '/charts/show-dashboard': true })
    expect(backToCharts()?.getAttribute('href')).toBe('/charts')
  })

  it('gives a section overview no Back', () => {
    renderAt('/charts')
    expect(backToCharts()).toBeNull()
  })

  it('echoes the page title in the header as scroll to top', () => {
    renderAt('/charts/show-dashboard', { '/charts/show-dashboard': true })
    const echoes = screen
      .getAllByRole('button', { name: 'Scroll to top', hidden: true })
      .map((button) => button.textContent)
    expect(echoes).toContain('Page')
  })
})

describe('DocsNavigator status', () => {
  const navLink = (name: string) =>
    screen
      .getAllByRole('link', { hidden: true })
      .find(
        (link) =>
          link.getAttribute('href') === `/charts/${name}` && link.closest('nav')
      )

  it('badges alpha and beta pages in the navigation, and not stable ones', () => {
    renderAt('/charts/meter')
    expect(navLink('meter')?.textContent).toContain('Beta')
    expect(navLink('funnel')?.textContent).toContain('Alpha')
    expect(navLink('delta')?.textContent).not.toMatch(/Stable|Beta|Alpha/)
  })

  it('shows a page its status, the release that added it, and its latest update', () => {
    renderAt(
      '/charts/funnel',
      {},
      {
        '/charts/funnel': {
          status: 'alpha',
          release: {
            added: {
              label: 'Charts',
              version: '0.1.0',
              date: '2026-09-28',
              id: 'release-2026-09-28'
            },
            updated: {
              label: 'Charts',
              version: '0.2.0',
              date: '2026-10-12',
              id: 'release-2026-10-12'
            },
            upcoming: true
          }
        }
      }
    )
    const line = document.querySelector('[data-slot="page-status"]')
    expect(line?.textContent).toBe(
      'AlphaAdded in Charts 0.1.0Updated in 0.2.0, 12 Oct 2026More in the next release'
    )
    expect(
      screen.getByRole('link', { name: 'Charts 0.1.0', hidden: true })
    ).toHaveProperty('pathname', '/overview/changelog')
    expect(
      screen
        .getByRole('link', { name: 'Charts 0.1.0', hidden: true })
        .getAttribute('href')
    ).toBe('/overview/changelog#release-2026-09-28')
    expect(
      screen
        .getByRole('link', { name: 'More in the next release', hidden: true })
        .getAttribute('href')
    ).toBe('/overview/changelog#unreleased')
  })

  it('says a page whose component is only pending is not released yet', () => {
    renderAt(
      '/charts/funnel',
      {},
      {
        '/charts/funnel': {
          status: 'beta',
          release: { added: 'unreleased', updated: null, upcoming: true }
        }
      }
    )
    expect(
      document.querySelector('[data-slot="page-status"]')?.textContent
    ).toBe('BetaNot released yet')
  })

  it('shows no status line on a page without a status', () => {
    renderAt('/charts/meter')
    expect(document.querySelector('[data-slot="page-status"]')).toBeNull()
  })
})
