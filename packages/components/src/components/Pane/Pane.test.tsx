import type { ReactNode } from 'react'

import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Pane } from '.'
import { Navigator } from '../Navigator'
import {
  paneColumnsRulesOf,
  reportUnrenderedSentinels,
  scrollViewport,
  testBrand,
  withScrollSentinels
} from '../Navigator/testUtils'
import {
  PANE_CHROME_NONE,
  type PaneChromeContextValue
} from './PaneChromeContext'
import { COLLAPSE_AT, EXPAND_AT } from './PaneRoot'
import {
  type PaneExit,
  PaneStackContext,
  type PaneStackContextValue
} from './PaneStackContext'
import { renderPaneColumnsCss } from './paneColumns'

// The pane's stack position resolves after Navigator.Content registers it and
// a render settles — a plain `flush()` (one microtask) isn't reliably enough
// under React 19; act-await matches Navigator.test.tsx's own helper.
const flushViewportMeasurement = () =>
  act(async () => {
    await Promise.resolve()
  })

const pane = () => document.querySelector('[data-slot="pane"]')

// The pane's viewport measures itself a microtask after mount; flushing it
// inside `act` keeps these renders warning-free.
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
  it('renders a section with its role', async () => {
    await renderPane(<Pane role='detail'>Body</Pane>)
    expect(pane()?.tagName).toBe('SECTION')
    expect(pane()).toHaveAttribute('data-role', 'detail')
  })

  it('defaults to a list pane in a column', async () => {
    await renderPane(<Pane>Body</Pane>)
    expect(pane()).toHaveAttribute('data-role', 'list')
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

  // An alpha-tinted pane paints nothing opaque, so naming a surface here
  // would be a guess about the parent. It inherits one instead.
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
      <Pane role='detail'>
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
      <Pane role='list'>
        <Pane.Header>
          <Pane.Actions>
            <button type='button'>Contents</button>
          </Pane.Actions>
        </Pane.Header>
      </Pane>
    )
    expect(screen.queryByLabelText('Back')).toBeNull()
    // The row is the placement, not a wrapper element: actions claim it alone.
    expect(document.querySelector('[data-slot="pane-actions"]')).toHaveClass(
      'col-start-3',
      'row-start-1',
      'justify-self-end'
    )
  })

  it('reserves an explicit column for each of back, compact title and actions so none can overlap', async () => {
    // Pins the class string, not the rendered layout — jsdom doesn't compute
    // Tailwind's grid math, so this can't prove pixels never touch. See the
    // task report for the browser check that does. What it does prove: the
    // header declares three real tracks and each occupant claims a distinct
    // one, rather than sharing a single cell distinguished only by
    // `justify-self` (the bug this fixes).
    await renderPane(
      <Pane role='detail'>
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
    // Wide actions wrap within their own column rather than reach the caret.
    expect(document.querySelector('[data-slot="pane-actions"]')).toHaveClass(
      'col-start-3',
      'flex-wrap'
    )
  })

  it('draws no header at all when it has no content of any kind', async () => {
    await renderPane(
      <Pane role='detail'>
        <Pane.Header />
      </Pane>
    )
    expect(document.querySelector('[data-slot="pane-header"]')).toBeNull()
  })

  it('insets the scrollbar so it starts below the header', async () => {
    // The bar spans the viewport, which extends under a sticky Pane.Header;
    // without an offset it runs past the pane's rounded top corner. jsdom
    // can't measure layout, so pin the mechanism: the scrollbar's top
    // margin must read off the same published height Pane.Header writes,
    // not a constant — a fixed number would clear an expanded header and
    // leave a gap once it collapses.
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

  // A headerless-pane counterpart was removed here: the offset is a single
  // static class string with `0px` written into it as the CSS fallback, so
  // it reads identically whether or not a header renders — jsdom can't
  // resolve `var()`, so no assertion on this className can tell the two
  // cases apart. The fallback itself is confirmed live in the browser
  // (task-3-report.md), where `var()` actually resolves.

  it('renders a back affordance only when given a target', async () => {
    const { rerender } = await renderPane(
      <Pane role='detail'>
        <Pane.Header>
          <Pane.Title>Button</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    expect(screen.queryByLabelText('Back')).toBeNull()

    rerender(
      <Pane role='detail'>
        <Pane.Header backHref='/components'>
          <Pane.Title>Button</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    await flush()
    // Base UI's Button forces role="button" on its rendered anchor (it's
    // semantically a button, not a navigation link), so this asserts via
    // label rather than role — same pattern as IconButton.test.tsx's own
    // href coverage.
    const back = screen.getByLabelText('Back')
    expect(back.tagName.toLowerCase()).toBe('a')
    expect(back).toHaveAttribute('data-slot', 'icon-button')
  })

  it('never offers a back affordance on a list pane', async () => {
    await renderPane(
      <Pane role='list'>
        <Pane.Header backHref='/'>
          <Pane.Title>Components</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    expect(screen.queryByLabelText('Back')).toBeNull()
  })

  it('takes the whole header with it when the back row is all there was', async () => {
    const { rerender } = await renderPane(
      <Pane role='detail'>
        <Pane.Header backHref='/components' />
      </Pane>
    )
    const header = () => document.querySelector('[data-slot="pane-header"]')
    expect(header()).toHaveClass('[display:var(--pane-back)]')
    expect(header()).not.toHaveClass('grid')

    rerender(
      <Pane role='detail'>
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
      <Pane role='inspector' depth={1}>
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
          <Pane role='list'>
            <Pane.Header onClose={onClose}>
              <Pane.Title>List</Pane.Title>
            </Pane.Header>
          </Pane>
          <Pane role='detail' current>
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
    // One handler threaded to both panes uniformly — only the non-root one
    // may act on it.
    expect(screen.getAllByLabelText('Close')).toHaveLength(1)
    await userEvent.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('never renders a close control on an inspector', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane role='list' current>
            List
          </Pane>
          <Pane role='inspector'>
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
          <Pane role='list'>List</Pane>
          <Pane role='detail' current>
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
          <Pane role='list'>List</Pane>
          <Pane role='detail' current>
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
      <Pane role='detail'>
        <Pane.Header onClose={vi.fn()}>
          <Pane.Title>Detail</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    expect(screen.queryByLabelText('Close')).toBeNull()
  })

  it('finds the root by stack depth, not the list role', async () => {
    // Three `detail` panes, none `list` — a `role === 'list'` shortcut for
    // root-ness would withhold Close from all three instead of just the
    // first.
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane role='detail' current aria-label='First'>
            <Pane.Header onClose={vi.fn()}>
              <Pane.Title>First</Pane.Title>
            </Pane.Header>
          </Pane>
          <Pane role='detail' aria-label='Second'>
            <Pane.Header onClose={vi.fn()}>
              <Pane.Title>Second</Pane.Title>
            </Pane.Header>
          </Pane>
          <Pane role='detail' aria-label='Third'>
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
          <Pane role='list'>List</Pane>
          <Pane role='detail' current>
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
          <Pane role='list'>List</Pane>
          <Pane role='detail' current>
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
          <Pane role='list'>List</Pane>
          <Pane role='detail' current>
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

  it('leaves a header of only Back and Close to the edge property', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current>
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
          <Pane role='list' current>
            List
          </Pane>
          <Pane role='inspector'>
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
          <Pane role='list'>List</Pane>
          <Pane role='detail' current>
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
      <Pane role='detail'>
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
      <Pane role='detail'>
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
        isRoot: false
      }),
      markPushing: () => {},
      moreOpen: false,
      level: 0
    }
    const { rerender } = await renderPane(
      <PaneStackContext value={fakeStack}>
        <Pane role='detail'>
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
        <Pane role='detail'>
          <Pane.Header onBack={() => {}} />
        </Pane>
      </PaneStackContext>
    )
    await flush()
    expect(screen.getByLabelText('Back').tagName).toBe('BUTTON')
  })

  it('never offers Back on a depth-0 pane, whatever its role', async () => {
    await renderPane(
      <Pane role='detail' depth={0}>
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
    // Between the expand and collapse thresholds: the state it is already in
    // wins, so a scroll that crosses neither changes nothing.
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

  // The one-frame drop these pin: `hidden` plus `transition-discrete` held the
  // title's row at full height for the whole fade, then dropped it in a single
  // frame — a 46px snap on the pane docs' own examples, at four different
  // header heights. jsdom has no layout, so what is assertable is the
  // mechanism: the row has to shrink over a transitioned property rather than
  // disappear over `display`.
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
    // The track only collapses if the item in it can be smaller than its
    // content; an item that clips is what makes its automatic minimum zero.
    expect(title.firstElementChild).toHaveClass('overflow-hidden')
  })

  // Closing the row alone leaves the header 8px taller than it has always been
  // collapsed: a grid's `row-gap` outlives the row it separated, and a track
  // floors at zero so a negative margin cannot claw it back.
  it('reclaims the row gap above the title along with the row', async () => {
    await renderPane(titled)
    const header = headerOf()
    expect(header.className).toContain('[--pane-header-gap:')
    // Columns only — the rows space themselves, so the title's spacing is
    // its own to animate. Both derived from the published gap, never restated.
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
      <Pane primaryNav='visible'>
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
    // A static clamp, not part of the collapse's own transition — widening
    // that exception is exactly what this task must not do.
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
    // The heading is the h2, not the button — the button's own text is
    // decorative, so the accessible name comes from its label.
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
    // The button already has its own accessible name; the icon must not add
    // a second announcement.
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon).toHaveClass('hidden', 'lg:inline-block')
  })
})

describe('orchestrator chrome', () => {
  // Chrome now reaches a pane only through registration, so simulating "an
  // orchestrator is hosting this pane" means faking the stack, not wrapping
  // with PaneChromeContext directly — that context is Pane's own to fill.
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
        isRoot: false
      }),
      markPushing: () => {},
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
    await withChrome(<Pane primaryNav='visible'>Body</Pane>, {
      scrollPastAt: 24,
      onScrollPast
    })
    await scroll(80)
    expect(onScrollPast).not.toHaveBeenCalled()
  })

  it('draws Back and Close links from orchestrator chrome', async () => {
    await withChrome(
      <Pane role='detail'>
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
      <Pane role='detail'>
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
  // Stands in for a Next.js parallel-route slot node: an opaque component
  // whose type is not PaneRoot and which the orchestrator cannot see through.
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
            <Pane role='list'>List</Pane>
          </Slot>
          <Slot>
            <Pane role='detail' current>
              Detail
            </Pane>
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
          <Pane role='list' current>
            List
          </Pane>
          <Slot>
            <Pane role='detail'>Detail</Pane>
          </Slot>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(positions()).toEqual(['top', 'ahead'])
  })

  it('leaves a standalone pane unpositioned', async () => {
    render(<Pane role='list'>Alone</Pane>)
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
            <Pane role='detail' current>
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
          <Pane role='list'>List</Pane>
          <Pane role='detail' current>
            Detail
          </Pane>
          <Pane role='inspector'>Details</Pane>
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
          <Pane role='detail' current>
            Detail
          </Pane>
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
            <Pane role='detail' current>
              Outer
              <Pane role='list'>Example inside content</Pane>
            </Pane>
          </Navigator.Content>
        </Navigator>
      )
      await flushViewportMeasurement()
      // The outer pane is the whole stack; the inner one is content.
      expect(positions()).toEqual(['top', null])
    })

    it('still registers with its own orchestrator', async () => {
      render(
        <Navigator value='/a'>
          <Navigator.Content>
            <Pane role='detail' current>
              Outer
              <Navigator value='/x'>
                <Navigator.Content>
                  <Pane role='list'>Inner list</Pane>
                  <Pane role='detail' current>
                    Inner detail
                  </Pane>
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
            <Pane role='detail' current>
              Outer
              <Pane role='list'>Inner</Pane>
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
  // No jsdom test covers the header-pop-in-on-mount defect this component
  // exists to avoid (see PaneBodyTitle.tsx's `useIsomorphicLayoutEffect`
  // comment). Testing-library's `render` calls React's `act()` synchronously,
  // and a sync `act()` call drains the passive-effect queue before returning
  // control — so a passive-effect registration and a layout-effect
  // registration are indistinguishable the instant after `render()` returns;
  // both already show the header. Bypassing `act` to observe the raw timing
  // (via `react-dom/client`'s `createRoot` directly) doesn't help either:
  // outside `act`, the initial render itself doesn't commit synchronously in
  // this test environment, so there's nothing to read before microtasks run.
  // Verified in a real browser instead — see the fix-report for the probe.

  it('renders in the content, not in the header', async () => {
    const { container } = render(
      <Pane role='detail' current>
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
      <Pane role='detail' current>
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
    // The 46px one-frame snap this arrangement exists to remove came from
    // `hidden` on the in-header title: `allow-discrete` held `display: block`
    // for the whole fade, then dropped the row in a single frame.
    const { container } = render(
      <Pane role='detail' current>
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

  // No test asserts "the header's own classes never vary by `collapsed` in a
  // way that changes its box" — `paneHeaderVariants`' `collapsed` variant has
  // only ever toggled its docked shadow's opacity (see variants.ts), for both
  // arrangements, so a jsdom class-string assertion here could never fail: it
  // would be pinning an invariant nothing in this file threatens. The real
  // claim — that a `Pane.BodyTitle` header holds a *constant height* across
  // the collapse — is a rendered-layout fact jsdom cannot measure at all;
  // it's verified in the browser instead (see the fix-report for the probe).

  it('emits one echo, the in-header title winning, when both are present', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <Pane role='detail' current>
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
      <Pane role='detail' current>
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

  // Sizing is a `className` a caller passes, not a prop — it relies on
  // `packages/core`'s `cn` replacing the default display utility rather than
  // joining it. Asserting presence of the override alone would pass even if
  // both classes landed and CSS source order picked the winner; asserting the
  // default's absence is what actually pins the merge.
  it('lets a passed display utility replace the default rather than join it', async () => {
    const { container } = render(
      <Pane role='detail' current>
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

// jsdom applies no stylesheet, so the rendered corner can't be measured here —
// this pins the wiring instead. `backdrop-filter` paints outside an ancestor's
// rounded clip, so the pane's `overflow-hidden` does not contain its own
// chrome: header and footer have to round their outer edge themselves, from
// the radius the pane publishes.
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

    expect(pane).toHaveClass('max-md:[--pane-radius:0px]')
    expect(pane).toHaveClass('rounded-(--pane-radius)')
    expect(header).toHaveClass('rounded-t-(--pane-radius)')
    expect(footer).toHaveClass('rounded-b-(--pane-radius)')
  })
})

describe('depth attributes', () => {
  it('writes the role default on a standalone pane, with no stack membership', async () => {
    await renderPane(<Pane role='detail'>Alone</Pane>)
    expect(pane()).toHaveAttribute('data-depth', '1')
    expect(pane()).not.toHaveAttribute('data-stack')
    expect(pane()).not.toHaveAttribute('data-level')
  })

  it('resolves depth from document order inside a stack, and marks the current pane', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current>
            Detail
          </Pane>
          <Pane role='detail' current>
            Sub
          </Pane>
          <Pane role='inspector'>Details</Pane>
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
    expect(panes.map((p) => p.hasAttribute('data-current'))).toEqual([
      false,
      true,
      true,
      false
    ])
  })

  it('warns when a pane lands deeper than it declared', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current>
            Detail
          </Pane>
          <Pane role='detail' depth={1} current>
            Sub
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(
      warn.mock.calls.some((c) => String(c[0]).includes('depth={2}'))
    ).toBe(true)
    warn.mockRestore()
  })

  it('warns once per message as the stack changes', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const ui = (listCurrent: boolean) => (
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane role='list' current={listCurrent}>
            List
          </Pane>
          <Pane role='detail' current>
            Detail
          </Pane>
          <Pane role='detail' current>
            Sub
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    const { rerender } = render(ui(false))
    await flushViewportMeasurement()
    rerender(ui(true))
    await flushViewportMeasurement()
    rerender(ui(false))
    await flushViewportMeasurement()
    expect(
      warn.mock.calls.filter((c) => String(c[0]).includes('depth={2}'))
    ).toHaveLength(1)
    warn.mockRestore()
  })

  it('warns when two undeclared details resolve by order', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current>
            Detail
          </Pane>
          <Pane role='detail' current>
            Sub
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(warn.mock.calls.some((c) => String(c[0]).includes('depth'))).toBe(
      true
    )
    warn.mockRestore()
  })

  it('lets an explicit depth outrank the role and document order', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' depth={2} current>
            Sub
          </Pane>
          <Pane role='detail' current>
            Detail
          </Pane>
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

  const declaredFirst = (primaryNav: 'auto' | 'hidden' = 'auto') => (
    <Navigator value='a'>
      <Navigator.Primary aria-label='Main'>
        {testBrand}
        <Navigator.Item value='a'>A</Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='list'>List</Pane>
        <Pane role='detail' depth={2} current primaryNav={primaryNav}>
          <Pane.Header onBack={() => {}}>
            <Pane.Title>Sub</Pane.Title>
          </Pane.Header>
        </Pane>
        <Pane role='detail' current>
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

  it('reads primaryNav from the deepest declared depth, wherever it sits', async () => {
    render(declaredFirst('hidden'))
    await flushViewportMeasurement()
    expect(horizontalBar()).toHaveAttribute('data-hidden', 'true')
  })

  const fivePanes = (current: 'D' | 'E' = 'E') => (
    <Navigator value='/a'>
      <Navigator.Content>
        <Pane role='list'>A</Pane>
        <Pane role='detail'>B</Pane>
        <Pane role='detail' depth={2}>
          C
        </Pane>
        <Pane role='detail' depth={3} current={current === 'D'}>
          D
        </Pane>
        <Pane role='detail' depth={3} current={current === 'E'}>
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

  it('covers the row with a current fifth pane that offers Back, never Close', async () => {
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
          <Pane role='detail' current>
            Outer
            <Navigator value='/x'>
              <Navigator.Content>
                <Pane role='list'>Inner list</Pane>
                <Pane role='detail' current>
                  Inner detail
                </Pane>
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
          <Pane role='list'>Outer list</Pane>
          <Pane role='detail' current>
            Outer
            <Navigator value='/x'>
              <Navigator.Content>
                <Pane role='list' current>
                  Inner list
                </Pane>
                <Pane role='detail'>Inner detail</Pane>
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

describe('a pane the row holds for its exit', () => {
  const leaving = (exit: PaneExit | undefined) => {
    const stack: PaneStackContextValue = {
      register: () => {},
      unregister: () => {},
      placeOf: () => ({
        position: 'top',
        depth: 1,
        chrome: PANE_CHROME_NONE,
        isRoot: false,
        exit
      }),
      markPushing: () => {},
      moreOpen: false,
      level: 0
    }
    return (
      <PaneStackContext value={stack}>
        <Pane role='detail' current>
          <Pane.Header>
            <Pane.Title>Leaving</Pane.Title>
          </Pane.Header>
        </Pane>
      </PaneStackContext>
    )
  }
  const pane = () => document.querySelector('[data-slot="pane"]')!

  it('says which way it goes, and keeps its depth so it stays placed', async () => {
    await renderPane(leaving('ahead'))
    expect(pane()).toHaveAttribute('data-exiting', '')
    expect(pane()).toHaveAttribute('data-exit', 'ahead')
    expect(pane()).toHaveAttribute('data-depth', '1')
  })

  it('is out of the accessibility tree and out of reach while it goes', async () => {
    await renderPane(leaving('behind'))
    expect(pane()).toHaveAttribute('aria-hidden', 'true')
    expect(pane()).toHaveAttribute('inert')
    expect(screen.queryByRole('heading', { name: 'Leaving' })).toBeNull()
  })

  it('carries none of it while it is still in the stack', async () => {
    await renderPane(leaving(undefined))
    expect(pane()).not.toHaveAttribute('data-exiting')
    expect(pane()).not.toHaveAttribute('data-exit')
    expect(pane()).not.toHaveAttribute('inert')
    expect(screen.getByRole('heading', { name: 'Leaving' })).toBeVisible()
  })
})
