// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { DocsNavigator, type NavigationDestination } from './Navigation'

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
      { title: 'Meter', href: '/charts/meter' },
      { title: 'Show dashboard', href: '/charts/show-dashboard' }
    ]
  }
]

function renderAt(route: string, pageWide: Record<string, boolean> = {}) {
  location.pathname = route
  render(
    <DocsNavigator
      items={destinations}
      pageTitles={{ [route]: 'Page' }}
      pageWide={pageWide}
    >
      <p>Body</p>
    </DocsNavigator>
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
