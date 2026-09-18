import { type ComponentType, type ReactNode, lazy, use } from 'react'

import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type Root, hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Pane } from '.'
import { PendingNavigationContext } from '../../providers/PendingNavigationContext'
import { Navigator } from '../Navigator'
import {
  paneColumnsRulesOf,
  reportUnrenderedSentinels,
  restoreNavigation,
  scrollViewport,
  setNavigation,
  testBrand,
  withScrollSentinels
} from '../Navigator/testUtils'
import {
  PANE_CHROME_NONE,
  type PaneChromeContextValue
} from './PaneChromeContext'
import { COLLAPSE_AT, EXPAND_AT } from './PaneRoot'
import {
  PaneStackContext,
  type PaneStackContextValue
} from './PaneStackContext'
import { renderPaneColumnsCss } from './paneColumns'

// One microtask isn't enough for stack positions to settle under React 19.
const flushViewportMeasurement = () =>
  act(async () => {
    await Promise.resolve()
  })

const pane = () => document.querySelector('[data-slot="pane"]')

const flush = () =>
  act(async () => {
    await Promise.resolve()
  })

withScrollSentinels()

const renderPane = async (ui: ReactNode) => {
  const result = render(ui)
  await flush()
  return result
}

describe('Pane', () => {
  it('renders a section with its column', async () => {
    await renderPane(<Pane column='list'>Body</Pane>)
    expect(pane()?.tagName).toBe('SECTION')
    expect(pane()).toHaveAttribute('data-column', 'list')
  })

  it('defaults to a detail column, a depth below the root', async () => {
    await renderPane(<Pane>Body</Pane>)
    expect(pane()).toHaveAttribute('data-column', 'detail')
    expect(pane()).toHaveAttribute('data-depth', '1')
  })

  it('passes an ARIA role through to the section', async () => {
    await renderPane(<Pane role='navigation'>Body</Pane>)
    expect(pane()).toHaveAttribute('role', 'navigation')
  })

  it("does not leak ScrollArea's presentation role onto the landmark", async () => {
    await renderPane(<Pane aria-label='Components'>Body</Pane>)
    expect(pane()).not.toHaveAttribute('role')
    expect(screen.getByLabelText('Components')).toBe(pane())
  })

  it.each([
    ['raised', '--intent-bg-raised'],
    ['normal', '--intent-bg-normal']
  ] as const)(
    'publishes the surface it paints, for its sticky chrome (%s)',
    async (emphasis, token) => {
      await renderPane(<Pane emphasis={emphasis}>Body</Pane>)
      expect(pane()).toHaveClass(`[--pane-surface:var(${token})]`)
    }
  )

  it.each(['subtle', 'subtler'] as const)(
    'leaves the surface to whatever it is sitting on (%s)',
    async (emphasis) => {
      await renderPane(<Pane emphasis={emphasis}>Body</Pane>)
      expect(pane()?.className).not.toMatch(/--pane-surface:/)
    }
  )

  it('publishes the content inset its chrome and body share', async () => {
    await renderPane(<Pane>Body</Pane>)
    expect(pane()).toHaveClass('[--content-inset:--spacing(6)]')
  })
})

describe('Pane.Header', () => {
  it('renders the title as an h2 so it never collides with the page h1', async () => {
    await renderPane(
      <Pane>
        <Pane.Header>
          <Pane.Title>Components</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    expect(
      screen.getByRole('heading', { level: 2, name: 'Components' })
    ).toBeInTheDocument()
  })

  it('keeps interactive title children out of the compact-title button', async () => {
    const { container } = await renderPane(
      <Pane>
        <Pane.Header>
          <Pane.Title>
            <a href='/reports'>Reports</a>
          </Pane.Title>
        </Pane.Header>
      </Pane>
    )

    const compact = container.querySelector('[data-slot="pane-title-compact"]')!
    expect(compact).toHaveTextContent('Reports')
    expect(compact.querySelector('a, button')).toBeNull()
  })

  it('sizes the title as a page heading, not a compact surface title', async () => {
    await renderPane(
      <Pane>
        <Pane.Header>
          <Pane.Title>Components</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    expect(screen.getByRole('heading', { name: 'Components' })).toHaveClass(
      'text-display-ui-3'
    )
  })

  it('lets render replace the heading while keeping the compact echo', async () => {
    await renderPane(
      <Pane>
        <Pane.Header>
          <Pane.Title render={(props) => <h1 {...props} />}>
            Components
          </Pane.Title>
        </Pane.Header>
      </Pane>
    )
    expect(
      screen.getByRole('heading', { level: 1, name: 'Components' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Scroll to top' })
    ).toBeInTheDocument()
  })

  it('paints its own surface rather than inheriting a transparent one', async () => {
    await renderPane(
      <Pane>
        <Pane.Header>
          <Pane.Title>Components</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    const header = document.querySelector('[data-slot="pane-header"]')
    expect(header).not.toHaveClass('bg-inherit')
    expect(header).toHaveClass(
      'bg-[color-mix(in_oklab,var(--pane-surface,var(--intent-bg-normal))_80%,transparent)]',
      'backdrop-blur-md'
    )
  })

  it('lands actions opposite the back affordance in the top row', async () => {
    await renderPane(
      <Pane>
        <Pane.Header backHref='/components'>
          <Pane.Title>Button</Pane.Title>
          <Pane.Actions>
            <button type='button'>Contents</button>
          </Pane.Actions>
        </Pane.Header>
      </Pane>
    )
    const actions = document.querySelector('[data-slot="pane-actions"]')
    expect(actions?.parentElement).toBe(
      document.querySelector('[data-slot="pane-header"]')
    )
    expect(actions).toHaveClass(
      'col-start-3',
      'row-start-1',
      'justify-self-end'
    )
    expect(screen.getByLabelText('Back').closest('div')).toHaveClass(
      'col-start-1',
      'row-start-1',
      'justify-self-start'
    )
  })

  it('places actions in the top row even with no back affordance', async () => {
    await renderPane(
      <Pane column='list'>
        <Pane.Header>
          <Pane.Actions>
            <button type='button'>Contents</button>
          </Pane.Actions>
        </Pane.Header>
      </Pane>
    )
    expect(screen.queryByLabelText('Back')).toBeNull()
    expect(document.querySelector('[data-slot="pane-actions"]')).toHaveClass(
      'col-start-3',
      'row-start-1',
      'justify-self-end'
    )
  })

  it('reserves an explicit column for each of back, compact title and actions so none can overlap', async () => {
    await renderPane(
      <Pane>
        <Pane.Header backHref='/components'>
          <Pane.Title>Components</Pane.Title>
          <Pane.Actions>
            <button type='button'>Add</button>
          </Pane.Actions>
        </Pane.Header>
      </Pane>
    )
    expect(document.querySelector('[data-slot="pane-header"]')).toHaveClass(
      'grid-cols-[auto_minmax(0,1fr)_auto]'
    )
    const back = screen.getByLabelText('Back').closest('div')
    expect(back).toHaveClass('col-start-1')
    expect(back).toHaveAttribute('data-slot', 'pane-back')
    expect(
      document.querySelector('[data-slot="pane-title-compact"]')
    ).toHaveClass('col-start-2', 'min-w-0', 'truncate')
    expect(document.querySelector('[data-slot="pane-actions"]')).toHaveClass(
      'col-start-3',
      'flex-wrap'
    )
  })

  it('draws no header at all when it has no content of any kind', async () => {
    await renderPane(
      <Pane>
        <Pane.Header />
      </Pane>
    )
    expect(document.querySelector('[data-slot="pane-header"]')).toBeNull()
  })

  it('insets the scrollbar so it starts below the header', async () => {
    await renderPane(
      <Pane>
        <Pane.Header>
          <Pane.Title>Components</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    const scrollbar = document.querySelector(
      '[data-slot="scroll-area-scrollbar"]'
    )

    expect(scrollbar?.className).toContain('--pane-header-height')
  })

  it('renders a back affordance only when given a target', async () => {
    const { rerender } = await renderPane(
      <Pane>
        <Pane.Header>
          <Pane.Title>Button</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    expect(screen.queryByLabelText('Back')).toBeNull()

    rerender(
      <Pane>
        <Pane.Header backHref='/components'>
          <Pane.Title>Button</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    await flush()
    // Base UI's Button forces role="button" on its anchor.
    const back = screen.getByLabelText('Back')
    expect(back.tagName.toLowerCase()).toBe('a')
    expect(back).toHaveAttribute('data-slot', 'icon-button')
  })

  it('never offers a back affordance on a list pane', async () => {
    await renderPane(
      <Pane column='list'>
        <Pane.Header backHref='/'>
          <Pane.Title>Components</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    expect(screen.queryByLabelText('Back')).toBeNull()
  })

  it('takes the whole header with it when the back row is all there was', async () => {
    const { rerender } = await renderPane(
      <Pane>
        <Pane.Header backHref='/components' />
      </Pane>
    )
    const header = () => document.querySelector('[data-slot="pane-header"]')
    expect(header()).toHaveClass('[display:var(--pane-back)]')
    expect(header()).not.toHaveClass('grid')

    rerender(
      <Pane>
        <Pane.Header backHref='/components'>
          <Pane.Title>Button</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    await flush()
    expect(header()).toHaveClass('grid')
    expect(header()).not.toHaveClass('[display:var(--pane-back)]')
  })
})

describe('the pane element', () => {
  it('is a section with no role, and Base UI stays quiet about it', async () => {
    const warn = vi.spyOn(console, 'warn')
    const error = vi.spyOn(console, 'error')
    await renderPane(<Pane>Body</Pane>)
    const pane = document.querySelector('[data-slot="pane"]')!
    expect(pane.tagName).toBe('SECTION')
    expect(pane).not.toHaveAttribute('role')
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    warn.mockRestore()
    error.mockRestore()
  })
})

describe('an inspector', () => {
  it('never shows Back, even with a declared depth', async () => {
    await renderPane(
      <Pane column='inspector' depth={1}>
        <Pane.Header backHref='/events'>
          <Pane.Title>On this page</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    expect(screen.queryByRole('link', { name: /Back/ })).toBeNull()
  })
})

describe('Pane.Header close affordance', () => {
  const renderTwoColumnStack = async (onClose: () => void) => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane column='list'>
            <Pane.Header onClose={onClose}>
              <Pane.Title>List</Pane.Title>
            </Pane.Header>
          </Pane>
          <Pane>
            <Pane.Header onClose={onClose}>
              <Pane.Title>Detail</Pane.Title>
            </Pane.Header>
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
  }

  it('renders a close control on a non-root pane and calls its handler', async () => {
    const onClose = vi.fn()
    await renderTwoColumnStack(onClose)
    expect(screen.getAllByLabelText('Close')).toHaveLength(1)
    await userEvent.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('never renders a close control on an inspector', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane column='list'>List</Pane>
          <Pane column='inspector'>
            <Pane.Header onClose={vi.fn()}>
              <Pane.Title>Inspector</Pane.Title>
            </Pane.Header>
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(screen.queryByLabelText('Close')).toBeNull()
  })

  it('renders no close control without a handler', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane column='list'>List</Pane>
          <Pane>
            <Pane.Header>
              <Pane.Title>Detail</Pane.Title>
            </Pane.Header>
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(screen.queryByLabelText('Close')).toBeNull()
  })

  it('shares the back affordance cell', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane column='list'>List</Pane>
          <Pane>
            <Pane.Header backHref='/a' onClose={vi.fn()}>
              <Pane.Title>Detail</Pane.Title>
            </Pane.Header>
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(screen.getByLabelText('Back').closest('div')).toHaveClass(
      'col-start-1',
      'row-start-1'
    )
    expect(screen.getByLabelText('Close').closest('div')).toHaveClass(
      'col-start-1',
      'row-start-1'
    )
  })

  it('renders no close control on a standalone pane with no orchestrator', async () => {
    await renderPane(
      <Pane>
        <Pane.Header onClose={vi.fn()}>
          <Pane.Title>Detail</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    expect(screen.queryByLabelText('Close')).toBeNull()
  })

  it('finds the root by stack depth, not the list role', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane aria-label='First'>
            <Pane.Header onClose={vi.fn()}>
              <Pane.Title>First</Pane.Title>
            </Pane.Header>
          </Pane>
          <Pane aria-label='Second'>
            <Pane.Header onClose={vi.fn()}>
              <Pane.Title>Second</Pane.Title>
            </Pane.Header>
          </Pane>
          <Pane aria-label='Third'>
            <Pane.Header onClose={vi.fn()}>
              <Pane.Title>Third</Pane.Title>
            </Pane.Header>
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(screen.getAllByLabelText('Close')).toHaveLength(2)
  })

  it('renders a close control from onBack alone and calls it on click', async () => {
    const onBack = vi.fn()
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane column='list'>List</Pane>
          <Pane>
            <Pane.Header onBack={onBack}>
              <Pane.Title>Detail</Pane.Title>
            </Pane.Header>
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(screen.getByLabelText('Back')).toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Close'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('prefers onClose over onBack when both are given', async () => {
    const onBack = vi.fn()
    const onClose = vi.fn()
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane column='list'>List</Pane>
          <Pane>
            <Pane.Header onBack={onBack} onClose={onClose}>
              <Pane.Title>Detail</Pane.Title>
            </Pane.Header>
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    await userEvent.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onBack).not.toHaveBeenCalled()
  })

  it('renders a close link from backHref alone', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane column='list'>List</Pane>
          <Pane>
            <Pane.Header backHref='/a'>
              <Pane.Title>Detail</Pane.Title>
            </Pane.Header>
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(screen.getByLabelText('Close')).toHaveAttribute('href', '/a')
  })

  it('uses a matching previous history entry for both Back and Close', async () => {
    const previousNavigation = Object.getOwnPropertyDescriptor(
      window,
      'navigation'
    )
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    const parentUrl = new URL('/a', window.location.href).href
    setNavigation({
      activation: {
        entry: { key: 'root' },
        navigationType: 'push'
      },
      currentEntry: { index: 1 },
      entries: () => [
        { index: 0, sameDocument: true, url: parentUrl },
        { index: 1, sameDocument: true, url: window.location.href }
      ]
    })

    try {
      render(
        <Navigator value='/detail'>
          <Navigator.Content>
            <Pane column='list'>List</Pane>
            <Pane>
              <Pane.Header backHref='/a'>
                <Pane.Title>Detail</Pane.Title>
              </Pane.Header>
            </Pane>
          </Navigator.Content>
        </Navigator>
      )
      await flushViewportMeasurement()

      const backLink = screen.getByLabelText('Back')
      const closeLink = screen.getByLabelText('Close')
      expect(backLink).toHaveAttribute('href', '/a')
      expect(closeLink).toHaveAttribute('href', '/a')

      fireEvent.click(backLink)
      fireEvent.click(closeLink)
      expect(back).toHaveBeenCalledTimes(2)
    } finally {
      back.mockRestore()
      restoreNavigation(previousNavigation)
    }
  })

  it('leaves a header of only Back and Close to the edge property', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane column='list'>List</Pane>
          <Pane>
            <Pane.Header backHref='/a' />
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    const header = document.querySelector('[data-slot="pane-header"]')
    expect(header).toHaveClass('[display:var(--pane-edge)]')
    expect(header).not.toHaveClass('grid')
  })

  it('never offers Back or Close on an inspector, and draws no header for them alone', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane column='list'>List</Pane>
          <Pane column='inspector'>
            <Pane.Header backHref='/a' onBack={vi.fn()} />
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(screen.queryByLabelText(/^Back/)).toBeNull()
    expect(screen.queryByLabelText('Close')).toBeNull()
    expect(document.querySelector('[data-slot="pane-header"]')).toBeNull()
  })

  it('still draws the header when Close is its only content', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane column='list'>List</Pane>
          <Pane>
            <Pane.Header onClose={vi.fn()} />
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(document.querySelector('[data-slot="pane-header"]')).toHaveClass(
      '[display:var(--pane-close)]'
    )
    expect(screen.getByLabelText('Close')).toBeInTheDocument()
  })
})

describe('Pane.Header back name', () => {
  it('names the round icon Back "Back to …" and shows no label', async () => {
    await renderPane(
      <Pane>
        <Pane.Header backHref='/tickets' backLabel='Tickets'>
          <Pane.Title>Glamping</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    const back = screen.getByLabelText('Back to Tickets')
    expect(back.tagName).toBe('A')
    expect(back).toHaveAttribute('href', '/tickets')
    expect(back).toHaveAttribute('data-slot', 'icon-button')
    expect(back).toHaveClass('btn-icon-md')
    expect(back).toHaveTextContent('')
  })

  it('names a handler Back with the label too', async () => {
    const onBack = vi.fn()
    await renderPane(
      <Pane>
        <Pane.Header onBack={onBack} backLabel='Tickets' />
      </Pane>
    )
    const back = screen.getByLabelText('Back to Tickets')
    expect(back.tagName).toBe('BUTTON')
    expect(back).toHaveAttribute('data-slot', 'icon-button')
    await userEvent.click(back)
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('takes the orchestrator label only when the header supplies no target of its own', async () => {
    const fakeStack: PaneStackContextValue = {
      register: () => {},
      unregister: () => {},
      placeOf: () => ({
        position: null,
        depth: 1,
        chrome: { backHref: '/tickets', backLabel: 'Tickets' },
        isRoot: false,
        registered: true
      }),
      markPushing: () => {},
      topNow: () => null,
      moreOpen: false,
      level: 0
    }
    const { rerender } = await renderPane(
      <PaneStackContext value={fakeStack}>
        <Pane>
          <Pane.Header />
        </Pane>
      </PaneStackContext>
    )
    expect(screen.getByLabelText('Back to Tickets')).toHaveAttribute(
      'href',
      '/tickets'
    )
    rerender(
      <PaneStackContext value={fakeStack}>
        <Pane>
          <Pane.Header onBack={() => {}} />
        </Pane>
      </PaneStackContext>
    )
    await flush()
    expect(screen.getByLabelText('Back').tagName).toBe('BUTTON')
  })

  it('never offers Back on a depth-0 pane, whatever its role', async () => {
    await renderPane(
      <Pane depth={0}>
        <Pane.Header backHref='/' />
      </Pane>
    )
    expect(screen.queryByLabelText(/^Back/)).toBeNull()
  })
})

describe('Pane.Header collapse on scroll', () => {
  const scrolled = scrollViewport

  const viewportOf = () =>
    document.querySelector('[data-slot="pane-viewport"]') as HTMLElement
  const headerOf = () =>
    document.querySelector('[data-slot="pane-header"]') as HTMLElement
  const titleOf = () =>
    document.querySelector('[data-slot="pane-title"]') as HTMLElement

  const collapse = async () => {
    await act(async () => {
      scrolled(viewportOf(), COLLAPSE_AT + 1)
      await Promise.resolve()
    })
  }

  const titled = (
    <Pane>
      <Pane.Header>
        <Pane.Title>Components</Pane.Title>
      </Pane.Header>
    </Pane>
  )

  it('starts expanded and collapses once the viewport scrolls past the threshold', async () => {
    await renderPane(
      <Pane>
        <Pane.Header>
          <Pane.Title>Components</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    expect(headerOf()).toHaveAttribute('data-collapsed', 'false')
    await act(async () => {
      scrolled(viewportOf(), COLLAPSE_AT + 1)
      await Promise.resolve()
    })
    expect(headerOf()).toHaveAttribute('data-collapsed', 'true')
  })

  it('stays expanded when the first report comes from a pane an ancestor hides', async () => {
    await renderPane(titled)
    await act(async () => {
      reportUnrenderedSentinels(viewportOf())
      await Promise.resolve()
    })
    expect(headerOf()).toHaveAttribute('data-collapsed', 'false')
    expect(titleOf()).toHaveClass('grid-rows-[1fr]')
  })

  it('fades its docked shadow in on a pseudo-element, never transitioning box-shadow', async () => {
    await renderPane(titled)
    expect(headerOf()).toHaveClass('after:shadow-md', 'after:opacity-0')
    expect(headerOf().className).not.toMatch(/transition-\[box-shadow\]/)
    expect(headerOf().className).not.toMatch(/(^|\s)shadow-/)
    await act(async () => {
      scrolled(viewportOf(), COLLAPSE_AT + 1)
      await Promise.resolve()
    })
    expect(headerOf()).toHaveClass('after:opacity-100')
  })

  it('does not flap between the two thresholds', async () => {
    await renderPane(
      <Pane>
        <Pane.Header>
          <Pane.Title>Components</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    await act(async () => {
      scrolled(viewportOf(), COLLAPSE_AT + 1)
      await Promise.resolve()
    })
    await act(async () => {
      scrolled(viewportOf(), Math.round((EXPAND_AT + COLLAPSE_AT) / 2))
      await Promise.resolve()
    })
    expect(headerOf()).toHaveAttribute('data-collapsed', 'true')

    await act(async () => {
      scrolled(viewportOf(), EXPAND_AT - 1)
      await Promise.resolve()
    })
    expect(headerOf()).toHaveAttribute('data-collapsed', 'false')
  })

  it('collapses the in-header title over its own grid row, never over display', async () => {
    await renderPane(titled)
    await collapse()

    const title = titleOf()
    expect(title).not.toHaveClass('hidden')
    expect(title).toHaveClass('grid-rows-[0fr]')
    const transitions = title.className.match(/transition-\[[^\]]+\]/g) ?? []
    expect(transitions.length).toBeGreaterThan(0)
    for (const transition of transitions) {
      expect(transition).not.toContain('display')
    }
    expect(
      transitions.some((transition) =>
        transition.includes('grid-template-rows')
      )
    ).toBe(true)
  })

  it('holds the title row open at its content height while expanded', async () => {
    await renderPane(titled)
    const title = titleOf()
    expect(title).toHaveClass('grid', 'grid-rows-[1fr]')
    // Clipping zeroes the item's automatic minimum, so the track can collapse.
    expect(title.firstElementChild).toHaveClass('overflow-hidden')
  })

  it('reclaims the row gap above the title along with the row', async () => {
    await renderPane(titled)
    const header = headerOf()
    expect(header.className).toContain('[--pane-header-gap:')
    expect(header).toHaveClass('gap-x-(--pane-header-gap)')
    expect(header.className).toMatch(
      /\[&>\*:not\(\[data-slot=pane-back\]\).*:not\(\[data-slot=pane-title\]\)\]:mt-\(--pane-header-gap\)/
    )

    const expanded = titleOf()
    expect(expanded).toHaveClass('mt-(--pane-header-gap)')
    expect(expanded.className.match(/transition-\[[^\]]+\]/g)?.[0]).toContain(
      'margin-top'
    )

    await collapse()
    expect(titleOf()).toHaveClass('mt-0')
  })

  it('suppresses the row animation under reduced motion', async () => {
    await renderPane(titled)
    const title = titleOf()
    for (const transition of title.className.match(/transition-\[[^\]]+\]/g) ??
      []) {
      expect(title.className).toContain(`motion-safe:${transition}`)
    }
    expect(title).toHaveClass('motion-reduce:transition-none')
  })

  it('still collapses its own header when it has opted out of auto nav', async () => {
    await renderPane(
      <Pane tabBar='visible'>
        <Pane.Header>
          <Pane.Title>Components</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    await act(async () => {
      scrolled(viewportOf(), COLLAPSE_AT + 1)
      await Promise.resolve()
    })
    expect(headerOf()).toHaveAttribute('data-collapsed', 'true')
  })

  it('floors the header at one control height so a title-only header still reserves control-sized chrome', async () => {
    await renderPane(titled)
    const header = headerOf()
    expect(header).toHaveClass(
      'min-h-[calc(--spacing(4)_+_--spacing(10)_+_var(--pane-header-pad-b))]'
    )
    const transitions = header.className.match(/transition-\[[^\]]+\]/g) ?? []
    for (const transition of transitions) {
      expect(transition).not.toContain('min-height')
    }
  })

  it('exposes the compact title as a scroll-to-top button', async () => {
    await renderPane(
      <Pane>
        <Pane.Header>
          <Pane.Title>Components</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    const button = screen.getByRole('button', { name: 'Scroll to top' })
    expect(button).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Components', level: 2 })
    ).toBeInTheDocument()
  })

  it('keeps the compact button out of the tab order while expanded', async () => {
    await renderPane(
      <Pane>
        <Pane.Header>
          <Pane.Title>Components</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    expect(
      screen.getByRole('button', { name: 'Scroll to top' })
    ).toHaveAttribute('tabindex', '-1')
  })

  it('scrolls the viewport to the top when the compact title is tapped', async () => {
    await renderPane(
      <Pane>
        <Pane.Header>
          <Pane.Title>Components</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    const viewport = viewportOf()
    const scrollTo = vi.fn()
    viewport.scrollTo = scrollTo as unknown as typeof viewport.scrollTo

    await act(async () => {
      scrolled(viewport, 40)
      await Promise.resolve()
    })
    await userEvent.click(screen.getByRole('button', { name: 'Scroll to top' }))
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('renders no compact title outside a Pane', () => {
    render(<Pane.Title>Loose</Pane.Title>)
    expect(screen.queryByRole('button', { name: 'Scroll to top' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Loose' })).toBeInTheDocument()
  })

  it('shows a faint up affordance beside the compact title from lg up, hidden below it', async () => {
    await renderPane(titled)
    const button = screen.getByRole('button', { name: 'Scroll to top' })
    const icon = button.querySelector('svg')
    expect(icon).not.toBeNull()
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon).toHaveClass('hidden', 'lg:inline-block')
  })
})

describe('orchestrator chrome', () => {
  // Chrome only arrives through registration, so fake the stack, not PaneChromeContext.
  const withChrome = async (
    ui: ReactNode,
    chrome: Partial<PaneChromeContextValue>
  ) => {
    const fakeStack: PaneStackContextValue = {
      register: () => {},
      unregister: () => {},
      placeOf: () => ({
        position: null,
        depth: 1,
        chrome: { ...PANE_CHROME_NONE, ...chrome },
        isRoot: false,
        registered: true
      }),
      markPushing: () => {},
      topNow: () => null,
      moreOpen: false,
      level: 0
    }
    return renderPane(
      <PaneStackContext value={fakeStack}>{ui}</PaneStackContext>
    )
  }

  const viewport = () =>
    document.querySelector<HTMLElement>('[data-slot="pane-viewport"]')!
  const scroll = (top: number) =>
    act(async () => {
      scrollViewport(viewport(), top)
    })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reports crossing its threshold while it describes auto nav behaviour', async () => {
    const onScrollPast = vi.fn()
    await withChrome(<Pane>Body</Pane>, { scrollPastAt: 24, onScrollPast })
    await scroll(80)
    expect(onScrollPast).toHaveBeenLastCalledWith(true)
    await scroll(24)
    expect(onScrollPast).toHaveBeenLastCalledWith(false)
  })

  it('reports nothing until it is first scrolled, as a pane newly on top', async () => {
    const onScrollPast = vi.fn()
    await withChrome(<Pane>Body</Pane>, { scrollPastAt: 24, onScrollPast })
    expect(onScrollPast).not.toHaveBeenCalled()
    await scroll(10)
    expect(onScrollPast).toHaveBeenCalledWith(false)
  })

  it('schedules no frame on scroll unless the orchestrator asks for direction', async () => {
    await withChrome(<Pane>Body</Pane>, {
      scrollPastAt: 24,
      onScrollPast: () => {}
    })
    const raf = vi.spyOn(window, 'requestAnimationFrame')
    await scroll(80)
    fireEvent.scroll(viewport())
    expect(raf).not.toHaveBeenCalled()
  })

  it('reads direction once a frame, and reports each frame that scrolled down', async () => {
    const frames: ((time: number) => void)[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) =>
      frames.push(callback)
    )
    const flush = () =>
      act(async () => frames.splice(0).forEach((frame) => frame(0)))
    const onScrollDown = vi.fn()
    await withChrome(<Pane>Body</Pane>, {
      scrollPastAt: 24,
      onScrollPast: () => {},
      onScrollDown
    })
    await flush()
    let top = 100
    Object.defineProperty(viewport(), 'scrollTop', {
      configurable: true,
      get: () => top
    })
    await flush()
    top = 140
    fireEvent.scroll(viewport())
    fireEvent.scroll(viewport())
    expect(frames).toHaveLength(1)
    await flush()
    expect(onScrollDown).toHaveBeenCalledOnce()
    top = 90
    fireEvent.scroll(viewport())
    await flush()
    expect(onScrollDown).toHaveBeenCalledOnce()
  })

  it('cancels a pending direction frame when it unmounts', async () => {
    const raf = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(() => 7)
    const cancel = vi.spyOn(window, 'cancelAnimationFrame')
    const { unmount } = await withChrome(<Pane>Body</Pane>, {
      scrollPastAt: 24,
      onScrollPast: () => {},
      onScrollDown: () => {}
    })
    raf.mockClear()
    fireEvent.scroll(viewport())
    expect(raf).toHaveBeenCalledOnce()
    unmount()
    expect(cancel).toHaveBeenCalledWith(7)
  })

  it('stays silent when it has opted out of auto', async () => {
    const onScrollPast = vi.fn()
    await withChrome(<Pane tabBar='visible'>Body</Pane>, {
      scrollPastAt: 24,
      onScrollPast
    })
    await scroll(80)
    expect(onScrollPast).not.toHaveBeenCalled()
  })

  it('draws Back and Close links from orchestrator chrome', async () => {
    await withChrome(
      <Pane>
        <Pane.Header />
      </Pane>,
      { backHref: '/section' }
    )
    const back = screen.getByLabelText('Back')
    expect(back.tagName).toBe('A')
    expect(back).toHaveAttribute('href', '/section')
    expect(screen.getByLabelText('Close')).toHaveAttribute('href', '/section')
  })

  it("lets a consumer's onBack outrank the orchestrator's link", async () => {
    await withChrome(
      <Pane>
        <Pane.Header onBack={() => {}} />
      </Pane>,
      { backHref: '/section' }
    )
    const back = screen.getByLabelText('Back')
    expect(back.tagName).toBe('BUTTON')
    expect(back).not.toHaveAttribute('href')
  })
})

describe('Pane.Search', () => {
  it('is a controlled searchbox reporting its value', async () => {
    const onValueChange = vi.fn()
    await renderPane(
      <Pane>
        <Pane.Header>
          <Pane.Search
            value=''
            onValueChange={onValueChange}
            placeholder='Filter components'
          />
        </Pane.Header>
      </Pane>
    )
    const input = screen.getByRole('searchbox', { name: 'Filter components' })
    await userEvent.type(input, 'b')
    expect(onValueChange).toHaveBeenCalledWith('b')
  })
})

describe('Pane.Footer', () => {
  it('renders sticky bottom chrome', async () => {
    await renderPane(
      <Pane>
        <Pane.Footer>
          <button type='button'>Save</button>
        </Pane.Footer>
      </Pane>
    )
    expect(document.querySelector('[data-slot="pane-footer"]')).toBeTruthy()
  })
})

describe('pane registration through a wrapper', () => {
  // Stands in for a Next.js parallel-route slot, which the orchestrator can't see through.
  const Slot = ({ children }: { children: ReactNode }) => <>{children}</>

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const positions = () =>
    Array.from(document.querySelectorAll('[data-slot="pane"]')).map((p) =>
      p.getAttribute('data-stack-position')
    )

  it('gives a wrapped pane a stack position', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Slot>
            <Pane column='list'>List</Pane>
          </Slot>
          <Slot>
            <Pane>Detail</Pane>
          </Slot>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(positions()).toEqual(['behind', 'top'])
  })

  it('marks a pane declared after the top one as ahead', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane column='list'>List</Pane>
          <Slot>
            <Pane reached={false}>Detail</Pane>
          </Slot>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(positions()).toEqual(['top', 'ahead'])
  })

  it('leaves a standalone pane unpositioned', async () => {
    render(<Pane column='list'>Alone</Pane>)
    await flushViewportMeasurement()
    expect(positions()).toEqual([null])
  })

  it('hands chrome to the wrapped top pane', async () => {
    render(
      <Navigator value='/foundations/colors'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='/foundations' href='/foundations'>
            Foundations
            <Navigator.Secondary aria-label='Foundations pages'>
              <Navigator.Item
                value='/foundations/colors'
                href='/foundations/colors'
              >
                Colors
              </Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Slot>
            <Pane>
              <Pane.Header>
                <Pane.Title>Foundations</Pane.Title>
              </Pane.Header>
            </Pane>
          </Slot>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    const viewport = Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="pane-viewport"]')
    ).at(-1)!
    await act(async () => {
      scrollViewport(viewport, 80)
    })
    expect(
      document.querySelector(
        '[data-slot="navigator-primary"][data-orientation="horizontal"]'
      )
    ).toHaveAttribute('data-collapsed', 'true')
  })
})

describe('stack geometry', () => {
  const paneEls = () =>
    Array.from(document.querySelectorAll('[data-slot="pane"]'))

  it('writes no geometry classes; the stylesheet keys on the attributes', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane column='list'>List</Pane>
          <Pane>Detail</Pane>
          <Pane column='inspector'>Details</Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    for (const el of paneEls()) {
      expect(el.className).not.toMatch(/max-lg:|lg:|2xl:/)
    }
    expect(paneEls()[0]).toHaveAttribute('data-stack-position', 'behind')
    expect(paneEls()[1]).toHaveAttribute('data-stack-position', 'top')
    expect(paneEls()[2]).not.toHaveAttribute('data-stack')
  })

  it('insets the stack from md by a gutter the row publishes', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane>Detail</Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(document.querySelector('[data-slot="navigator-panes"]')).toHaveClass(
      '[--pane-stack-inset:0px]',
      'md:[--pane-stack-inset:--spacing(3)]'
    )
  })

  describe('a pane inside a pane', () => {
    const positions = () =>
      Array.from(document.querySelectorAll('[data-slot="pane"]')).map((p) =>
        p.getAttribute('data-stack-position')
      )

    it('does not join the surrounding orchestrator stack', async () => {
      render(
        <Navigator value='/a'>
          <Navigator.Content>
            <Pane>
              Outer
              <Pane column='list'>Example inside content</Pane>
            </Pane>
          </Navigator.Content>
        </Navigator>
      )
      await flushViewportMeasurement()
      expect(positions()).toEqual(['top', null])
    })

    it('still registers with its own orchestrator', async () => {
      render(
        <Navigator value='/a'>
          <Navigator.Content>
            <Pane>
              Outer
              <Navigator value='/x'>
                <Navigator.Content>
                  <Pane column='list'>Inner list</Pane>
                  <Pane>Inner detail</Pane>
                </Navigator.Content>
              </Navigator>
            </Pane>
          </Navigator.Content>
        </Navigator>
      )
      await flushViewportMeasurement()
      expect(positions()).toEqual(['top', 'behind', 'top'])
    })

    it('leaves the zero-pane warning alone', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      render(
        <Navigator value='/a'>
          <Navigator.Content>
            <Pane>
              Outer
              <Pane column='list'>Inner</Pane>
            </Pane>
          </Navigator.Content>
        </Navigator>
      )
      await flushViewportMeasurement()
      expect(
        warn.mock.calls.some((c) => String(c[0]).includes('no Pane registered'))
      ).toBe(false)
      warn.mockRestore()
    })
  })
})

describe('Pane.BodyTitle', () => {
  it('renders in the content, not in the header', async () => {
    const { container } = render(
      <Pane>
        <Pane.Header />
        <Pane.BodyTitle>Reports</Pane.BodyTitle>
      </Pane>
    )
    await flushViewportMeasurement()

    const body = container.querySelector('[data-slot="pane-body-title"]')!
    expect(body).not.toBeNull()
    expect(body.closest('[data-slot="pane-header"]')).toBeNull()
    expect(
      screen.getByRole('heading', { name: 'Reports', level: 1 })
    ).toBeInTheDocument()
  })

  it('gives the header a compact echo of it', async () => {
    const { container } = render(
      <Pane>
        <Pane.Header />
        <Pane.BodyTitle>Reports</Pane.BodyTitle>
      </Pane>
    )
    await flushViewportMeasurement()

    const echo = container
      .querySelector('[data-slot="pane-header"]')!
      .querySelector('[data-slot="pane-title-compact"]')!
    expect(echo).not.toBeNull()
    expect(echo).toHaveAccessibleName('Scroll to top')
  })

  it('never hides the body title with display, so the header cannot reflow', async () => {
    const { container } = render(
      <Pane>
        <Pane.Header />
        <Pane.BodyTitle>Reports</Pane.BodyTitle>
      </Pane>
    )
    await flushViewportMeasurement()

    const body = container.querySelector('[data-slot="pane-body-title"]')!
    expect(body).not.toHaveClass('hidden')
    const transitions = body.className.match(/transition-\[[^\]]+\]/g) ?? []
    for (const transition of transitions) {
      expect(transition).not.toContain('display')
      expect(transition).not.toContain('height')
    }
  })

  it('emits one echo, the in-header title winning, when both are present', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <Pane>
        <Pane.Header>
          <Pane.Title>Header title</Pane.Title>
        </Pane.Header>
        <Pane.BodyTitle>Content title</Pane.BodyTitle>
      </Pane>
    )
    await flushViewportMeasurement()

    const echoes = container
      .querySelector('[data-slot="pane-header"]')!
      .querySelectorAll('[data-slot="pane-title-compact"]')
    expect(echoes).toHaveLength(1)
    expect(echoes[0]!.textContent).toBe('Header title')
    expect(
      warn.mock.calls.some((c) => String(c[0]).includes('Pane.BodyTitle'))
    ).toBe(true)
    warn.mockRestore()
  })

  it('scrolls the pane to the top when the content title echo is tapped', async () => {
    render(
      <Pane>
        <Pane.Header />
        <Pane.BodyTitle>Reports</Pane.BodyTitle>
      </Pane>
    )
    await flushViewportMeasurement()

    const viewport = document.querySelector(
      '[data-slot="pane-viewport"]'
    ) as HTMLElement
    const scrollTo = vi.fn()
    viewport.scrollTo = scrollTo as unknown as typeof viewport.scrollTo

    await userEvent.click(screen.getByRole('button', { name: 'Scroll to top' }))
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('lets a passed display utility replace the default rather than join it', async () => {
    const { container } = render(
      <Pane>
        <Pane.Header />
        <Pane.BodyTitle className='text-display-prose-2 text-subtle'>
          Reports
        </Pane.BodyTitle>
      </Pane>
    )
    await flushViewportMeasurement()

    const body = container.querySelector('[data-slot="pane-body-title"]')!
    expect(body).toHaveClass('text-display-prose-2')
    expect(body).not.toHaveClass('text-display-ui-3')
  })
})

// `backdrop-filter` escapes an ancestor's rounded clip, so chrome rounds its own edge.
describe('Pane chrome clipping', () => {
  it('rounds the sticky chrome to the radius the pane publishes', async () => {
    const { container } = await renderPane(
      <Pane>
        <Pane.Header>
          <Pane.Title>Title</Pane.Title>
        </Pane.Header>
        <p>Body</p>
        <Pane.Footer>Footer</Pane.Footer>
      </Pane>
    )

    const pane = container.querySelector('[data-slot="pane"]')!
    const header = container.querySelector('[data-slot="pane-header"]')!
    const footer = container.querySelector('[data-slot="pane-footer"]')!

    expect(pane).toHaveClass(
      'max-md:[--pane-radius:var(--pane-radius-phone,0px)]'
    )
    expect(pane).toHaveClass('rounded-(--pane-radius)')
    expect(header).toHaveClass('rounded-t-(--pane-radius)')
    expect(footer).toHaveClass('rounded-b-(--pane-radius)')
  })
})

describe('depth attributes', () => {
  it('writes the role default on a standalone pane, with no stack membership', async () => {
    await renderPane(<Pane>Alone</Pane>)
    expect(pane()).toHaveAttribute('data-depth', '1')
    expect(pane()).not.toHaveAttribute('data-stack')
    expect(pane()).not.toHaveAttribute('data-level')
  })

  it('resolves depth from document order inside a stack, and marks the reached panes', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane column='list'>List</Pane>
          <Pane>Detail</Pane>
          <Pane reached={false}>Sub</Pane>
          <Pane column='inspector'>Details</Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    const panes = Array.from(document.querySelectorAll('[data-slot="pane"]'))
    expect(panes.map((p) => p.getAttribute('data-depth'))).toEqual([
      '0',
      '1',
      '2',
      null
    ])
    expect(panes.map((p) => p.hasAttribute('data-stack'))).toEqual([
      true,
      true,
      true,
      false
    ])
    expect(panes.map((p) => p.getAttribute('data-level'))).toEqual([
      '0',
      '0',
      '0',
      '0'
    ])
    expect(panes.map((p) => p.hasAttribute('data-reached'))).toEqual([
      true,
      true,
      false,
      true
    ])
  })

  const hydrateFromServer = async (ui: ReactNode) => {
    const host = document.createElement('div')
    host.innerHTML = renderToString(ui)
    document.body.append(host)
    let root: Root | null = null
    await act(async () => {
      root = hydrateRoot(host, ui)
    })
    await flushViewportMeasurement()
    return {
      host,
      rerender: async (next: ReactNode) => {
        act(() => root?.render(next))
        await flushViewportMeasurement()
      },
      unmount: () => act(() => root?.unmount())
    }
  }

  const serverWarnings = (warn: { mock: { calls: unknown[][] } }) =>
    warn.mock.calls.filter((c) => String(c[0]).includes('server-rendered'))

  it('warns when the server drew a pane at another depth', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { unmount } = await hydrateFromServer(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane column='list'>List</Pane>
          <Pane>Detail</Pane>
          <Pane depth={1}>Sub</Pane>
        </Navigator.Content>
      </Navigator>
    )
    expect(serverWarnings(warn).map((c) => String(c[0]))).toEqual([
      expect.stringContaining('server-rendered at depth 1 but sits at 2')
    ])
    unmount()
    warn.mockRestore()
  })

  it('checks a server-rendered pane once, as it registers', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const ui = (listReached: boolean) => (
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane column='list' reached={listReached}>
            List
          </Pane>
          <Pane>Detail</Pane>
          <Pane depth={1}>Sub</Pane>
        </Navigator.Content>
      </Navigator>
    )
    const { rerender, unmount } = await hydrateFromServer(ui(false))
    await rerender(ui(true))
    await rerender(ui(false))
    expect(serverWarnings(warn)).toHaveLength(1)
    unmount()
    warn.mockRestore()
  })

  it('does not warn when undeclared details are drawn by render order', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { host, unmount } = await hydrateFromServer(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane column='list'>List</Pane>
          <Pane>Detail</Pane>
          <Pane>Sub</Pane>
        </Navigator.Content>
      </Navigator>
    )
    expect(serverWarnings(warn)).toEqual([])
    expect(
      Array.from(host.querySelectorAll('[data-slot="pane"]'), (pane) =>
        pane.getAttribute('data-depth')
      )
    ).toEqual(['0', '1', '2'])
    unmount()
    warn.mockRestore()
  })

  it('does not warn for a pane the client mounts', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane column='list'>List</Pane>
          <Pane>Detail</Pane>
          <Pane depth={1}>Sub</Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(serverWarnings(warn)).toEqual([])
    warn.mockRestore()
  })

  it('lets an explicit depth outrank the role and document order', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane column='list'>List</Pane>
          <Pane depth={2}>Sub</Pane>
          <Pane>Detail</Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    const panes = Array.from(document.querySelectorAll('[data-slot="pane"]'))
    expect(panes.map((p) => p.getAttribute('data-depth'))).toEqual([
      '0',
      '2',
      '1'
    ])
  })

  const declaredFirst = (tabBar: 'auto' | 'hidden' = 'auto') => (
    <Navigator value='a'>
      <Navigator.Primary aria-label='Main'>
        {testBrand}
        <Navigator.Item value='a'>A</Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane column='list'>List</Pane>
        <Pane depth={2} tabBar={tabBar}>
          <Pane.Header onBack={() => {}}>
            <Pane.Title>Sub</Pane.Title>
          </Pane.Header>
        </Pane>
        <Pane>
          <Pane.Header onBack={() => {}}>
            <Pane.Title>Detail</Pane.Title>
          </Pane.Header>
        </Pane>
      </Navigator.Content>
    </Navigator>
  )
  const horizontalBar = () =>
    document.querySelector<HTMLElement>(
      '[data-slot="navigator-primary"][data-orientation="horizontal"]'
    )!

  it('tops the stack with the deepest declared depth, wherever it sits', async () => {
    render(declaredFirst())
    await flushViewportMeasurement()
    const [list, sub, detail] = stackPanes()
    expect(
      [list, sub, detail].map((p) => p!.getAttribute('data-stack-position'))
    ).toEqual(['behind', 'top', 'behind'])

    const stacked = paneColumnsRulesOf(renderPaneColumnsCss()).filter(
      (rule) =>
        rule.body.includes('--pane-back') &&
        rule.selector.startsWith(
          '[data-slot="navigator-panes"][data-level="0"]'
        ) &&
        !rule.conditions.some((c) => c.startsWith('@container'))
    )
    const bodyOf = (element: Element) =>
      stacked.filter((rule) => element.matches(rule.selector))[0]!.body
    expect(bodyOf(sub!)).toContain('translate: 0 0;')
    expect(bodyOf(sub!)).toContain('--pane-back: grid;')
    expect(bodyOf(detail!)).toContain('translate: calc(-33%')

    const scrolled = [sub!, detail!].map((p) => {
      const spy = vi.fn()
      p.querySelector<HTMLElement>('[data-slot="pane-viewport"]')!.scrollTo =
        spy
      return spy
    })
    await userEvent.click(
      screen
        .getAllByRole('button', { name: 'A' })
        .find((tab) => horizontalBar().contains(tab))!
    )
    expect(scrolled[0]).toHaveBeenCalledWith(
      expect.objectContaining({ top: 0 })
    )
    expect(scrolled[1]).not.toHaveBeenCalled()
  })

  it('reads tabBar from the deepest declared depth, wherever it sits', async () => {
    render(declaredFirst('hidden'))
    await flushViewportMeasurement()
    expect(horizontalBar()).toHaveAttribute('data-hidden', 'true')
  })

  const fivePanes = (reached: 'D' | 'E' = 'E') => (
    <Navigator value='/a'>
      <Navigator.Content>
        <Pane column='list'>A</Pane>
        <Pane>B</Pane>
        <Pane depth={2}>C</Pane>
        <Pane depth={3} reached={reached === 'D'}>
          D
        </Pane>
        <Pane depth={3} reached={reached === 'E'}>
          <Pane.Header onBack={() => {}}>
            <Pane.Title>E</Pane.Title>
          </Pane.Header>
        </Pane>
      </Navigator.Content>
    </Navigator>
  )
  const stackPanes = () =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-slot="pane"]'))

  it('writes a fifth stack pane at its resolved depth, in the stack', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(fivePanes())
    await flushViewportMeasurement()
    const panes = stackPanes()
    expect(panes.map((p) => p.getAttribute('data-depth'))).toEqual([
      '0',
      '1',
      '2',
      '3',
      'deep'
    ])
    const fifth = panes[4]!
    expect(fifth).toHaveAttribute('data-stack')
    expect(fifth).toHaveAttribute('data-level', '0')
    warn.mockRestore()
  })

  it('covers the row with a reached fifth pane that offers Back, never Close', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(fivePanes())
    await flushViewportMeasurement()
    const fifth = stackPanes()[4]!
    const rules = paneColumnsRulesOf(renderPaneColumnsCss())
    const bodies = (element: Element) =>
      rules
        .filter((rule) => element.matches(rule.selector))
        .map((rule) => rule.body)
    const own = bodies(fifth)
    expect(own.some((body) => body.includes('z-index: 3'))).toBe(true)
    expect(own).toContain(
      'translate: 0 0; visibility: visible; pointer-events: auto;'
    )
    expect(own).toContain('--pane-back: grid; --pane-edge: grid;')
    expect(own.some((body) => body.includes('--pane-close: grid'))).toBe(false)
    const cell = (slot: string) => fifth.querySelector(`[data-slot="${slot}"]`)!
    expect(bodies(cell('pane-back'))).toEqual(['display: var(--pane-back);'])
    expect(bodies(cell('pane-close'))).toEqual(['display: var(--pane-close);'])
    warn.mockRestore()
  })

  it('nests a second Navigator one level down', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane>
            Outer
            <Navigator value='/x'>
              <Navigator.Content>
                <Pane column='list'>Inner list</Pane>
                <Pane>Inner detail</Pane>
              </Navigator.Content>
            </Navigator>
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    const rows = Array.from(
      document.querySelectorAll('[data-slot="navigator-panes"]')
    )
    expect(rows.map((r) => r.getAttribute('data-level'))).toEqual(['0', '1'])
    const panes = Array.from(document.querySelectorAll('[data-slot="pane"]'))
    expect(panes.map((p) => p.getAttribute('data-level'))).toEqual([
      '0',
      '1',
      '1'
    ])
    expect(panes.map((p) => p.getAttribute('data-depth'))).toEqual([
      '0',
      '0',
      '1'
    ])
  })

  it('reveals the inner root without revealing the outer one', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane column='list'>Outer list</Pane>
          <Pane>
            Outer
            <Navigator value='/x'>
              <Navigator.Content>
                <Pane column='list'>Inner list</Pane>
                <Pane reached={false}>Inner detail</Pane>
              </Navigator.Content>
            </Navigator>
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    const [outer, inner] = Array.from(
      document.querySelectorAll('[data-slot="navigator-panes"]')
    )
    expect(outer).not.toHaveAttribute('data-reveal')
    expect(inner).not.toHaveAttribute('data-reveal')
    const panes = Array.from(document.querySelectorAll('[data-slot="pane"]'))
    expect(panes.map((p) => p.getAttribute('data-stack-position'))).toEqual([
      'behind',
      'top',
      'top',
      'ahead'
    ])
  })
})

describe('a pane whose content suspends', () => {
  function later() {
    let resolve = () => {}
    const promise = new Promise<void>((done) => {
      resolve = done
    })
    return { promise, resolve }
  }
  const Wait = ({
    on,
    children
  }: {
    on: Promise<void>
    children: ReactNode
  }) => {
    use(on)
    return children
  }
  const loadingBody = () => document.querySelector('[data-slot="pane-loading"]')

  it('keeps the pane on screen with a skeleton header and body', async () => {
    const data = later()
    await renderPane(
      <Pane aria-label='Ticket'>
        <Pane.Header>
          <Pane.Title>Ticket</Pane.Title>
        </Pane.Header>
        <Wait on={data.promise}>Loaded</Wait>
      </Pane>
    )
    expect(screen.getByRole('region', { name: 'Ticket' })).toBe(pane())
    expect(screen.queryByText('Ticket')).toBeNull()
    expect(document.querySelector('[data-slot="pane-header"]')).not.toBeNull()
    expect(loadingBody()).toHaveAttribute('aria-busy', 'true')
    expect(
      loadingBody()?.querySelector('[data-slot="skeleton"]')
    ).not.toBeNull()
    await act(async () => data.resolve())
    expect(screen.getByText('Loaded')).toBeInTheDocument()
    expect(screen.getAllByText('Ticket').length).toBeGreaterThan(0)
    expect(loadingBody()).toBeNull()
  })

  it('wraps a lazy child without reading it, so the pane itself never suspends', async () => {
    const data = later()
    // A still-streaming server child is a lazy node, which the types don't allow.
    const loaded = (<p>Loaded</p>) as unknown as ComponentType
    const streaming = lazy(async () => {
      await data.promise
      return { default: loaded }
    }) as unknown as ReactNode
    await renderPane(
      <Pane>
        <Pane.Header>
          <Pane.Title>Ticket</Pane.Title>
        </Pane.Header>
        {streaming}
      </Pane>
    )
    expect(pane()).not.toBeNull()
    expect(loadingBody()).not.toBeNull()
    await act(async () => data.resolve())
    expect(screen.getByText('Loaded')).toBeInTheDocument()
  })

  it('releases its pending hold when it unmounts while suspended', async () => {
    const data = later()
    const release = vi.fn()
    const store = {
      subscribe: () => () => {},
      get: () => null,
      start: () => {},
      settle: () => {},
      hold: vi.fn(() => release)
    }
    const { unmount } = await renderPane(
      <PendingNavigationContext value={store}>
        <Pane>
          <Pane.Body>
            <Wait on={data.promise}>Loaded</Wait>
          </Pane.Body>
        </Pane>
      </PendingNavigationContext>
    )
    expect(store.hold).toHaveBeenCalledTimes(1)
    expect(release).not.toHaveBeenCalled()
    unmount()
    expect(release).toHaveBeenCalledTimes(1)
  })

  it('keeps the real header when the wait is inside Pane.Body', async () => {
    const data = later()
    await renderPane(
      <Pane>
        <Pane.Header>
          <Pane.Title>Ticket</Pane.Title>
        </Pane.Header>
        <Pane.Body>
          <Wait on={data.promise}>Loaded</Wait>
        </Pane.Body>
      </Pane>
    )
    expect(
      screen.getByRole('heading', { name: 'Ticket', level: 2 })
    ).toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="pane-header"]')).toHaveLength(
      1
    )
    expect(loadingBody()).toHaveAttribute('aria-busy', 'true')
    await act(async () => data.resolve())
    expect(screen.getByText('Loaded')).toBeInTheDocument()
    expect(loadingBody()).toBeNull()
  })

  it("shows the pane's loading, and Pane.Body's over it", async () => {
    const data = later()
    const { rerender } = await renderPane(
      <Pane loading={<p>Pane skeleton</p>}>
        <Pane.Body>
          <Wait on={data.promise}>Loaded</Wait>
        </Pane.Body>
      </Pane>
    )
    expect(loadingBody()).toHaveTextContent('Pane skeleton')
    rerender(
      <Pane loading={<p>Pane skeleton</p>}>
        <Pane.Body loading={<p>Body skeleton</p>}>
          <Wait on={data.promise}>Loaded</Wait>
        </Pane.Body>
      </Pane>
    )
    expect(loadingBody()).toHaveTextContent('Body skeleton')
  })

  it("puts the pane's loading under the skeleton header when the whole pane waits", async () => {
    const data = later()
    await renderPane(
      <Pane loading={<p>Pane skeleton</p>}>
        <Wait on={data.promise}>Loaded</Wait>
      </Pane>
    )
    expect(loadingBody()).toHaveTextContent('Pane skeleton')
    expect(document.querySelector('[data-slot="pane-header"]')).not.toBeNull()
  })
})
