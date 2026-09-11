import type { ReactNode } from 'react'

import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Pane } from '.'
import { Navigator } from '../Navigator'
import {
  PANE_CHROME_NONE,
  type PaneChromeContextValue
} from './PaneChromeContext'
import { COLLAPSE_AT, EXPAND_AT } from './PaneRoot'
import {
  PaneStackContext,
  type PaneStackContextValue
} from './PaneStackContext'

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

  it('marks the inspector role so it yields first', async () => {
    await renderPane(<Pane role='inspector'>Contents</Pane>)
    expect(pane()).toHaveAttribute('data-role', 'inspector')
  })

  it('scrolls in a nested viewport, not the section itself', async () => {
    await renderPane(<Pane>Body</Pane>)
    expect(
      pane()?.querySelector('[data-slot="pane-viewport"]')
    ).toBeInTheDocument()
  })

  it("does not leak ScrollArea's presentation role onto the landmark", async () => {
    await renderPane(<Pane aria-label='Components'>Body</Pane>)
    expect(pane()).not.toHaveAttribute('role')
    expect(screen.getByLabelText('Components')).toBe(pane())
  })

  it('renders standalone with no Navigator present', async () => {
    await renderPane(<Pane role='detail'>Standalone</Pane>)
    expect(screen.getByText('Standalone')).toBeInTheDocument()
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

  it('renders actions in the header', async () => {
    await renderPane(
      <Pane>
        <Pane.Header>
          <Pane.Title>Components</Pane.Title>
          <Pane.Actions>
            <button type='button'>Add</button>
          </Pane.Actions>
        </Pane.Header>
      </Pane>
    )
    const header = document.querySelector('[data-slot="pane-header"]')
    expect(header?.querySelector('[data-slot="pane-actions"]')).toBeTruthy()
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

  it('keeps actions at every width, unlike the back affordance', async () => {
    await renderPane(
      <Pane role='detail'>
        <Pane.Header backHref='/components'>
          <Pane.Actions>
            <button type='button'>Contents</button>
          </Pane.Actions>
        </Pane.Header>
      </Pane>
    )
    const header = document.querySelector('[data-slot="pane-header"]')
    expect(
      document.querySelector('[data-slot="pane-actions"]')
    ).not.toHaveClass('lg:hidden')
    // Actions outlive the back row, so the header cannot collapse with it.
    expect(header).not.toHaveClass('lg:hidden')
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

  it('wraps wide actions within their own column instead of reaching the back caret', async () => {
    await renderPane(
      <Pane role='detail'>
        <Pane.Header backHref='/components'>
          <Pane.Actions>
            <button type='button'>Contents</button>
          </Pane.Actions>
        </Pane.Header>
      </Pane>
    )
    expect(screen.getByLabelText('Back').closest('div')).toHaveAttribute(
      'data-slot',
      'pane-back'
    )
    // Overflow wraps rather than running under the caret. The column itself
    // (not a max-w hack) is what keeps actions off the back affordance now —
    // see the three-column assertion below.
    expect(document.querySelector('[data-slot="pane-actions"]')).toHaveClass(
      'flex-wrap'
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
    expect(screen.getByLabelText('Back').closest('div')).toHaveClass(
      'col-start-1'
    )
    expect(
      document.querySelector('[data-slot="pane-title-compact"]')
    ).toHaveClass('col-start-2', 'min-w-0', 'truncate')
    expect(document.querySelector('[data-slot="pane-actions"]')).toHaveClass(
      'col-start-3'
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

  it('publishes its measured height on the pane', async () => {
    await renderPane(
      <Pane>
        <Pane.Header>
          <Pane.Title>Components</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    const paneEl = document.querySelector<HTMLElement>('[data-slot="pane"]')
    // jsdom reports offsetHeight 0, but the property must still be written —
    // its presence is what sticky content offsets against.
    expect(paneEl?.style.getPropertyValue('--pane-header-height')).toBe('0px')
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
    expect(screen.getByLabelText('Back').tagName.toLowerCase()).toBe('a')
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

  it('drops the back row from lg up, where the pane is a column', async () => {
    await renderPane(
      <Pane role='detail'>
        <Pane.Header backHref='/components'>
          <Pane.Title>Button</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    expect(screen.getByLabelText('Back').closest('div')).toHaveClass(
      'lg:hidden'
    )
  })

  it('takes the whole header with it when the back row is all there was', async () => {
    const { rerender } = await renderPane(
      <Pane role='detail'>
        <Pane.Header backHref='/components' />
      </Pane>
    )
    const header = () => document.querySelector('[data-slot="pane-header"]')
    expect(header()).toHaveClass('lg:hidden')

    rerender(
      <Pane role='detail'>
        <Pane.Header backHref='/components'>
          <Pane.Title>Button</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    await flush()
    expect(header()).not.toHaveClass('lg:hidden')
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

  it('never renders a close control on the root pane, even given the same handler', async () => {
    await renderTwoColumnStack(vi.fn())
    const [rootHeader] = document.querySelectorAll('[data-slot="pane-header"]')
    expect(rootHeader?.querySelector('[aria-label="Close"]')).toBeNull()
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

  it('shares the back affordance cell, gated to the opposite band', async () => {
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
      'row-start-1',
      'lg:hidden'
    )
    expect(screen.getByLabelText('Close').closest('div')).toHaveClass(
      'col-start-1',
      'row-start-1',
      'max-lg:hidden'
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

  it('never renders a close control on the root pane from onBack alone', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane role='list'>
            <Pane.Header onBack={vi.fn()}>
              <Pane.Title>List</Pane.Title>
            </Pane.Header>
          </Pane>
          <Pane role='detail' current>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    const [rootHeader] = document.querySelectorAll('[data-slot="pane-header"]')
    expect(rootHeader?.querySelector('[aria-label="Close"]')).toBeNull()
  })

  it('renders no close control from backHref alone', async () => {
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
    expect(screen.queryByLabelText('Close')).toBeNull()
  })

  it('never renders a close control on an inspector from onBack alone', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane role='list' current>
            List
          </Pane>
          <Pane role='inspector'>
            <Pane.Header onBack={vi.fn()}>
              <Pane.Title>Inspector</Pane.Title>
            </Pane.Header>
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(screen.queryByLabelText('Close')).toBeNull()
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
    expect(document.querySelector('[data-slot="pane-header"]')).toBeTruthy()
    expect(screen.getByLabelText('Close')).toBeInTheDocument()
  })
})

describe('Pane.Header collapse on scroll', () => {
  const scrolled = (viewport: HTMLElement, top: number) => {
    Object.defineProperty(viewport, 'scrollTop', {
      value: top,
      configurable: true
    })
    fireEvent.scroll(viewport)
  }

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

  it('starts expanded', async () => {
    await renderPane(
      <Pane>
        <Pane.Header>
          <Pane.Title>Components</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    expect(headerOf()).toHaveAttribute('data-collapsed', 'false')
  })

  it('collapses once the viewport scrolls past the threshold', async () => {
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
    expect(headerOf()).toHaveAttribute('data-collapsed', 'true')
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

  it('gives the compact title a pointer cursor', async () => {
    await renderPane(titled)
    expect(screen.getByRole('button', { name: 'Scroll to top' })).toHaveClass(
      'cursor-pointer'
    )
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
      positionOf: () => null,
      chromeOf: () => ({ ...PANE_CHROME_NONE, ...chrome }),
      isRootOf: () => false
    }
    return renderPane(
      <PaneStackContext value={fakeStack}>{ui}</PaneStackContext>
    )
  }

  // rAF is what the pane coalesces scroll reports through, so the test has to
  // drive it rather than wait on it.
  const captureFrames = () => {
    const frames: ((time: number) => void)[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) =>
      frames.push(callback)
    )
    return {
      flush: () => act(async () => frames.splice(0).forEach((f) => f(0)))
    }
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const scrollViewport = async (top: number, flush: () => Promise<void>) => {
    const viewport = document.querySelector<HTMLElement>(
      '[data-slot="pane-viewport"]'
    )!
    Object.defineProperty(viewport, 'scrollTop', { value: top, writable: true })
    fireEvent.scroll(viewport)
    await flush()
  }

  it('reports its scroll position while it describes auto nav behaviour', async () => {
    const onViewportScroll = vi.fn()
    const { flush } = captureFrames()
    await withChrome(<Pane>Body</Pane>, { onViewportScroll })
    await scrollViewport(80, flush)
    expect(onViewportScroll).toHaveBeenCalledWith(80)
  })

  it('stays silent when it has opted out of auto', async () => {
    const onViewportScroll = vi.fn()
    const { flush } = captureFrames()
    await withChrome(<Pane primaryNav='visible'>Body</Pane>, {
      onViewportScroll
    })
    await scrollViewport(80, flush)
    expect(onViewportScroll).not.toHaveBeenCalled()
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

  it('orders two panes contributed by one wrapper', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Slot>
            <Pane role='list'>List</Pane>
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
    const frames: ((time: number) => void)[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) =>
      frames.push(callback)
    )
    render(
      <Navigator value='/foundations'>
        <Navigator.Primary aria-label='Main'>
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
    Object.defineProperty(viewport, 'scrollTop', { value: 80, writable: true })
    fireEvent.scroll(viewport)
    await act(async () => frames.splice(0).forEach((frame) => frame(0)))
    expect(
      document.querySelector(
        '[data-slot="navigator-primary"][data-orientation="horizontal"]'
      )
    ).toHaveAttribute('data-collapsed', 'true')
  })
})

describe('stack geometry', () => {
  // The geometry itself now lives on `paneVariants`' `stackPosition` variant,
  // keyed off the pane's own `data-stack-position` rather than a direct-child
  // selector on Navigator.Content — see variants.ts. jsdom never compiles
  // Tailwind, so this only proves the class strings landed on the right
  // element, including the transition and motion-reduce ones below — it
  // cannot see the resolved `transition-property` the way a real browser
  // can, which is the one property this rework exists to fix (Tailwind v4
  // emits `translate` as its own property, not `transform`, and a
  // class-string match can't tell those two apart, nor can it catch
  // Tailwind itself failing to emit a named property). That gap was checked
  // by hand in the browser instead; see the task report.
  const paneEls = () =>
    Array.from(document.querySelectorAll('[data-slot="pane"]'))

  // `motion-reduce:transition-none` has no `max-lg:` gate — unlike the rest
  // of the geometry, it must hold at every breakpoint. It is the one rule
  // moved from Navigator.Content that was never scoped to the stacked band,
  // so scoping it here would be a silent narrowing, not a move.
  const expectSharedTransition = (
    pane: Element | undefined,
    properties = 'translate,opacity,visibility'
  ) => {
    expect(pane).toHaveClass(`motion-safe:max-lg:transition-[${properties}]`)
    expect(pane).toHaveClass('motion-safe:max-lg:duration-slow')
    expect(pane).toHaveClass('motion-safe:max-lg:ease-enter')
    expect(pane).toHaveClass('motion-reduce:transition-none')
  }

  it('gives the top pane the shared stack geometry with no translate', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    const top = paneEls().find(
      (p) => p.getAttribute('data-stack-position') === 'top'
    )
    expect(top).toHaveClass('max-lg:absolute!')
    expect(top).toHaveClass('max-lg:inset-0')
    expect(top).not.toHaveClass('max-lg:-translate-x-1/3')
    expect(top).not.toHaveClass('max-lg:translate-x-full')
    expect(top).not.toHaveClass('max-lg:invisible')
    expectSharedTransition(top, 'translate,opacity')
    expect(top).not.toHaveClass(
      'motion-safe:max-lg:transition-[translate,opacity,visibility]'
    )
  })

  it('parks the behind pane left and dimmed', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    const behind = paneEls().find(
      (p) => p.getAttribute('data-stack-position') === 'behind'
    )
    expect(behind).toHaveClass('max-lg:-translate-x-1/3')
    expect(behind).toHaveClass('max-lg:opacity-90')
    expect(behind).toHaveClass('max-lg:pointer-events-none')
    expect(behind).toHaveClass('max-lg:invisible')
    expectSharedTransition(behind)
  })

  it('parks the ahead pane fully off-screen right', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane role='list' current>
            List
          </Pane>
          <Pane role='detail'>Detail</Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    const ahead = paneEls().find(
      (p) => p.getAttribute('data-stack-position') === 'ahead'
    )
    expect(ahead).toHaveClass('max-lg:translate-x-full')
    expect(ahead).toHaveClass('max-lg:opacity-100')
    expect(ahead).toHaveClass('max-lg:pointer-events-none')
    expect(ahead).toHaveClass('max-lg:invisible')
    expectSharedTransition(ahead)
  })

  it('gives a standalone pane none of the stack geometry', async () => {
    await renderPane(<Pane role='detail'>Standalone</Pane>)
    const standalone = pane()
    expect(standalone).not.toHaveAttribute('data-stack-position')
    expect(standalone).not.toHaveClass('max-lg:absolute!')
    expect(standalone).not.toHaveClass('max-lg:-translate-x-1/3')
    expect(standalone).not.toHaveClass('max-lg:translate-x-full')
  })

  it('gives an inspector none of the stack geometry inside a Navigator', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane role='list' current>
            List
          </Pane>
          <Pane role='inspector'>Inspector</Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    const inspector = paneEls().find(
      (p) => p.getAttribute('data-role') === 'inspector'
    )
    expect(inspector).not.toHaveAttribute('data-stack-position')
    expect(inspector).not.toHaveClass('max-lg:absolute!')
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
        warn.mock.calls.some((c) =>
          String(c[0]).includes('identified no panes')
        )
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
  // only ever produced `shadow-md`/`shadow-none` (see variants.ts), for both
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

    expect(pane.className).toContain('--pane-radius')
    expect(pane).toHaveClass('rounded-(--pane-radius)')
    expect(header).toHaveClass('rounded-t-(--pane-radius)')
    expect(footer).toHaveClass('rounded-b-(--pane-radius)')
  })
})
