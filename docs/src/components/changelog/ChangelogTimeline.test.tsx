// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within
} from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { ReleaseView } from '@/lib/releases'

import { InspectorSlotContext } from '../InspectorSlot'
import { ChangelogTimeline } from './ChangelogTimeline'

const navigation = vi.hoisted(() => ({
  search: new URLSearchParams(),
  replace: vi.fn()
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/overview/changelog',
  useRouter: () => ({ push() {}, replace: navigation.replace, back() {} }),
  useSearchParams: () => navigation.search
}))

// jsdom has no layout, so the test plays the observer: it says which releases are near the screen.
let observed: Element[] = []
let report: IntersectionObserverCallback = () => {}

beforeAll(() => {
  globalThis.IntersectionObserver = class {
    constructor(callback: IntersectionObserverCallback) {
      report = callback
      observed = []
    }
    observe(element: Element) {
      observed.push(element)
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.scrollIntoView ??= () => {}
  Element.prototype.getAnimations ??= () => []
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  window.history.replaceState(null, '', '/')
  navigation.search = new URLSearchParams()
})

function release(n: number, packages: ('components' | 'core')[]): ReleaseView {
  const slug = `components-2-${n}-0`
  return {
    slug,
    href: `/overview/changelog/${slug}`,
    date: `2026-0${(n % 9) + 1}-01`,
    pending: false,
    versions: packages.map((key) => ({
      package: key,
      label: key === 'core' ? 'Core' : 'Components',
      version: `2.${n}.0`
    })),
    headlines: {
      all: { title: `Release ${n}`, summary: '1 fix.' },
      ...Object.fromEntries(
        packages.map((key) => [
          key,
          { title: `${key} ${n}`, summary: '1 fix.' }
        ])
      )
    },
    cards: [],
    items: [
      {
        id: `fix-${n}`,
        kind: 'fixed',
        text: [`Fix ${n}.`],
        packages
      }
    ]
  }
}

const RELEASES = Array.from({ length: 8 }, (_, index) =>
  release(8 - index, index % 2 === 0 ? ['components', 'core'] : ['components'])
)

const PACKAGES = [
  { key: 'components' as const, label: 'Components' },
  { key: 'core' as const, label: 'Core' }
]

function near(...slugs: string[]) {
  act(() =>
    report(
      observed.map((target) => ({
        target,
        isIntersecting: slugs.includes((target as HTMLElement).dataset.release!)
      })) as IntersectionObserverEntry[],
      {} as IntersectionObserver
    )
  )
}

const renderedTitles = () =>
  screen.queryAllByRole('heading', { level: 2 }).map((h) => h.textContent)

function renderTimeline(releases = RELEASES) {
  let inspector: React.ReactNode = null
  const view = render(
    <InspectorSlotContext
      value={{
        setInspector: (content) => {
          inspector = content
        },
        closeInspector() {}
      }}
    >
      <ChangelogTimeline releases={releases} art={{}} packages={PACKAGES} />
    </InspectorSlotContext>
  )
  return { ...view, inspector: () => inspector }
}

describe('ChangelogTimeline', () => {
  it('renders only the releases near the screen, and holds a place for every other', () => {
    renderTimeline()
    expect(renderedTitles()).toEqual(['Release 8', 'Release 7', 'Release 6'])

    near('components-2-3-0', 'components-2-2-0')

    expect(renderedTitles()).toEqual(['Release 3', 'Release 2'])
    const placeholder = document.getElementById('components-2-8-0')
    expect(placeholder?.childElementCount).toBe(0)
    expect(document.querySelectorAll('[data-release]')).toHaveLength(8)
  })

  it('keeps a release at its measured height once it leaves, for that filter only', () => {
    renderTimeline()
    const newest = document.getElementById('components-2-8-0')!
    vi.spyOn(newest, 'getBoundingClientRect').mockReturnValue({
      height: 500
    } as DOMRect)

    near('components-2-3-0')
    expect(newest.style.height).toBe('500px')

    fireEvent.click(screen.getByRole('button', { name: 'Core' }))
    // Filtered to Core it holds less, so it falls back to an estimate.
    expect(document.getElementById('components-2-8-0')!.style.height).toBe(
      '248px'
    )
  })

  it('lists each month in the rail, linked to its newest release', () => {
    const later = { ...release(9, ['components']), date: '2026-09-20' }
    const { inspector } = renderTimeline([later, ...RELEASES])
    render(<>{inspector()}</>)
    const rail = screen.getByRole('navigation', { name: 'Releases by month' })
    expect(
      within(rail)
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href')])
    ).toEqual([
      ['September', '#components-2-9-0'],
      ['August', '#components-2-7-0'],
      ['July', '#components-2-6-0'],
      ['June', '#components-2-5-0'],
      ['May', '#components-2-4-0'],
      ['April', '#components-2-3-0'],
      ['March', '#components-2-2-0'],
      ['February', '#components-2-1-0']
    ])
  })

  it('jumps to a month from the rail, rendered or not', () => {
    const scrolled: Element[] = []
    vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(function (
      this: Element
    ) {
      scrolled.push(this)
    })
    const { inspector } = renderTimeline()
    render(<>{inspector()}</>)
    fireEvent.click(screen.getByRole('link', { name: 'March' }))

    expect(scrolled[0]).toBe(document.getElementById('components-2-2-0'))
    expect(window.location.hash).toBe('#components-2-2-0')
  })

  it('narrows the history to one package, retitled for it, and puts it in the URL', () => {
    renderTimeline()
    fireEvent.click(screen.getByRole('button', { name: 'Core' }))

    expect(navigation.replace).toHaveBeenLastCalledWith(
      '/overview/changelog?package=core',
      { scroll: false }
    )
    expect(document.querySelectorAll('[data-release]')).toHaveLength(4)
    near('components-2-8-0', 'components-2-6-0')
    expect(renderedTitles()).toEqual(['core 8', 'core 6'])
  })

  it('reads the package from the URL', () => {
    navigation.search = new URLSearchParams('package=core')
    renderTimeline()
    expect(document.querySelectorAll('[data-release]')).toHaveLength(4)
  })
})
