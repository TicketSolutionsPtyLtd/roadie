import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, page } from 'vitest/browser'

import { Navigator } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Pane } from '../Pane'
import { forgetPaneScroll } from '../Pane/paneScroll'
import { useStylesheet } from '../Pane/testUtils'
import { Toast, type ToastPosition, createToastManager } from '../Toast'

// Frozen so the stack's geometry can be read straight away.
const FREEZE = '[data-slot="toast"] { transition: none !important; }'
const OFFSET = '--toast-viewport-offset-top'
const CLEARANCE = '--toast-viewport-clear-top'

let removeStylesheets = () => {}
beforeAll(async () => {
  const removeRoadie = useStylesheet(roadieCss)
  const removeFreeze = useStylesheet(FREEZE)
  removeStylesheets = () => {
    removeFreeze()
    removeRoadie()
  }
  await commands.reduceMotion(true)
})
afterAll(async () => {
  removeStylesheets()
  await commands.reduceMotion(false)
  await page.viewport(1920, 1080)
})
afterEach(() => {
  cleanup()
  forgetPaneScroll()
})

const WIDE = { width: 1280, height: 800, edge: 24 }
const PHONE = { width: 390, height: 844, edge: 16 }

const frames = (count = 4) =>
  new Promise<void>((settle) => {
    const step = (left: number) =>
      left === 0 ? settle() : requestAnimationFrame(() => step(left - 1))
    step(count)
  })

async function settle() {
  await frames()
  for (const animation of document.getAnimations()) animation.finish()
  await frames()
}

function App({
  manager,
  position,
  detailReached = true
}: {
  manager: ReturnType<typeof createToastManager>
  position: ToastPosition
  detailReached?: boolean
}) {
  return (
    <Toast.Provider toastManager={manager}>
      <div style={{ height: '100vh', display: 'grid' }}>
        <Navigator value='/shows/paperbark'>
          <Pane column='list'>
            <Pane.Header>
              <Pane.Title>Shows</Pane.Title>
            </Pane.Header>
            <p>Paperbark Sessions</p>
          </Pane>
          <Pane reached={detailReached}>
            <Pane.Header onBack={() => {}}>
              <Pane.Title>Paperbark Sessions</Pane.Title>
              <Pane.Search value='' onValueChange={() => {}} />
            </Pane.Header>
            <div style={{ height: 4000 }}>Doors 7pm</div>
          </Pane>
        </Navigator>
      </div>
      <Toast.Viewport position={position} />
    </Toast.Provider>
  )
}

async function renderApp(position: ToastPosition) {
  const manager = createToastManager()
  const { container, rerender } = render(
    <App manager={manager} position={position} />
  )
  await settle()
  act(() => {
    manager.add({ title: 'Saved', timeout: 0 })
  })
  await waitFor(() => {
    const toast = document.querySelector('[data-slot="toast"]')
    expect(toast).not.toBeNull()
    expect(toast).not.toHaveAttribute('data-starting-style')
  })
  const headers = () =>
    Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="pane-header"]')
    ).filter(
      (header) =>
        getComputedStyle(header).visibility === 'visible' &&
        header.getBoundingClientRect().right > 0
    )
  const lowestHeaderEdge = () =>
    Math.max(
      ...headers().map((header) => header.getBoundingClientRect().bottom)
    )
  const toast = () =>
    document.querySelector('[data-slot="toast"]')!.getBoundingClientRect()
  const detail = container.querySelectorAll<HTMLElement>(
    '[data-slot="pane-viewport"]'
  )[1]!
  const popToList = async () => {
    rerender(
      <App manager={manager} position={position} detailReached={false} />
    )
    await settle()
  }
  return { lowestHeaderEdge, toast, detail, popToList }
}

async function collapse(viewport: HTMLElement) {
  viewport.scrollTop = 600
  viewport.dispatchEvent(new Event('scroll'))
  await settle()
  await waitFor(() =>
    expect(viewport.querySelector('[data-slot="pane-header"]')).toHaveAttribute(
      'data-collapsed',
      'true'
    )
  )
  await settle()
}

describe('a top toast in a Pane app', () => {
  it.each([
    ['wide window with side-by-side panes', WIDE],
    ['phone', PHONE]
  ] as const)(
    'sits below the header on a %s, and follows it as it collapses',
    async (_, size) => {
      await page.viewport(size.width, size.height)
      const { lowestHeaderEdge, toast, detail } = await renderApp('top-end')

      const open = lowestHeaderEdge()
      expect(open).toBeGreaterThan(40)
      expect(toast().top).toBeCloseTo(open + size.edge, 0)

      await collapse(detail)
      const collapsed = lowestHeaderEdge()
      expect(collapsed).toBeLessThan(open)
      await waitFor(() =>
        expect(toast().top).toBeCloseTo(collapsed + size.edge, 0)
      )
    }
  )

  it.each([
    ['with reduced motion', true],
    ['with motion', false]
  ] as const)(
    'moves to the new top header after a phone pops back, %s',
    async (_, reduce) => {
      await commands.reduceMotion(reduce)
      await page.viewport(PHONE.width, PHONE.height)
      const { lowestHeaderEdge, toast, popToList } = await renderApp('top-end')
      const detailEdge = lowestHeaderEdge()

      await popToList()
      const listEdge = lowestHeaderEdge()
      expect(listEdge).toBeLessThan(detailEdge)
      await waitFor(() =>
        expect(toast().top).toBeCloseTo(listEdge + PHONE.edge, 0)
      )
      await commands.reduceMotion(true)
    }
  )

  it('adds your own top offset on top of the header', async () => {
    await page.viewport(WIDE.width, WIDE.height)
    const removeOffset = useStylesheet(`:root { ${OFFSET}: 40px; }`)
    try {
      const { lowestHeaderEdge, toast } = await renderApp('top-end')
      expect(toast().top).toBeCloseTo(lowestHeaderEdge() + WIDE.edge + 40, 0)
      cleanup()
      await frames()
      expect(
        getComputedStyle(document.documentElement).getPropertyValue(OFFSET)
      ).toBe('40px')
    } finally {
      removeOffset()
    }
  })

  it('leaves a bottom toast where it was', async () => {
    await page.viewport(WIDE.width, WIDE.height)
    const { toast } = await renderApp('bottom-end')

    expect(WIDE.height - toast().bottom).toBeCloseTo(WIDE.edge, 0)
  })

  it('clears the header clearance once the app unmounts', async () => {
    await page.viewport(WIDE.width, WIDE.height)
    await renderApp('top-end')
    expect(document.documentElement.style.getPropertyValue(CLEARANCE)).not.toBe(
      ''
    )
    cleanup()
    await frames()

    expect(document.documentElement.style.getPropertyValue(CLEARANCE)).toBe('')
  })
})
