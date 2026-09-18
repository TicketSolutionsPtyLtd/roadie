import { useState } from 'react'

import { cleanup, render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Pane } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Navigator } from '../Navigator'
import {
  REM,
  STACK_INSET,
  TIER_WIDTHS,
  contentMarkup,
  mount,
  readRow,
  rowMarkup,
  rowShapes,
  useStylesheet,
  withRegisteredPositions,
  withoutStyleQueries
} from './testUtils'

const fallbackCss = withoutStyleQueries(roadieCss)

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(fallbackCss)
})
afterAll(() => removeStylesheet())
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

const TWO_COLUMNS = 46.25 * REM

type Box = { left: number; right: number }

const overlaps = (a: Box, b: Box) =>
  Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1

const focusable = (pane: HTMLElement) => {
  const button = pane.querySelector<HTMLButtonElement>('button')!
  button.focus()
  const focused = document.activeElement === button
  button.blur()
  return focused
}

describe('without container style queries', () => {
  it('drops every style query and keeps the rest', () => {
    expect(roadieCss).toContain('style(--pane-parked-0')
    expect(fallbackCss).not.toMatch(/@container[^{]*style\(/)
    expect(fallbackCss).toContain('@container panes (width >= 46.25rem)')
  })

  const shapes = rowShapes().filter(
    ({ spec }) => !spec.panes.some((pane) => pane.depth === 'deep')
  )
  const families = Map.groupBy(shapes, (shape) =>
    shape.name.replace(/ \/ .*/, '')
  )

  it.each([...families.keys()])(
    'shows the top pane, and the root beside it once two fit: %s',
    (family) => {
      const problems: string[] = []
      for (const { name, spec } of families.get(family)!) {
        const positioned = withRegisteredPositions(spec)
        for (const width of TIER_WIDTHS) {
          const content = mount(contentMarkup(rowMarkup(positioned)), width)
          const frame = content.getBoundingClientRect()
          const panes = Array.from(
            content.querySelectorAll<HTMLElement>(
              '[data-slot="navigator-panes"] > [data-slot="pane"]'
            )
          )
          const layouts = readRow(content)
          const where = `${name} at ${width}px`
          const stackIndexes = positioned.panes.map((_, index) => index)
          const top = positioned.panes.findIndex(
            (pane) => pane.position === 'top'
          )
          const shown = stackIndexes.filter((index) => layouts[index]!.shown)
          const boxes = panes
            .filter((pane, index) => layouts[index]!.shown)
            .map((pane) => {
              const box = pane.getBoundingClientRect()
              return {
                left: box.left - frame.left,
                right: box.right - frame.left
              }
            })

          if (!layouts[top]!.shown) problems.push(`${where}: top hidden`)
          for (const [index, box] of boxes.entries()) {
            if (box.left < -1 || box.right > width + 1)
              problems.push(`${where}: pane ${index} off screen`)
            for (const other of boxes.slice(index + 1)) {
              if (overlaps(box, other)) problems.push(`${where}: overlap`)
            }
          }
          for (const index of stackIndexes) {
            if (!layouts[index]!.shown && focusable(panes[index]!))
              problems.push(`${where}: parked pane ${index} focusable`)
          }

          const rootIndex = positioned.panes.findIndex(
            (pane, index) =>
              pane.depth === 0 &&
              getComputedStyle(panes[index]!).display !== 'none'
          )
          const expected =
            width < TWO_COLUMNS || rootIndex === -1
              ? [top]
              : [...new Set([rootIndex, top])].sort((a, b) => a - b)
          if (shown.join() !== expected.join())
            problems.push(`${where}: shows ${shown} not ${expected}`)

          const topPane = layouts[top]!
          const beside = expected.length === 2
          const rooted =
            spec.overflow === true ||
            spec.panes.some((pane) => pane.depth === 0 && !pane.overflow)
          const isRoot = positioned.panes[top]!.depth === (rooted ? 0 : 1)
          if (topPane.back !== (!beside && !isRoot) || topPane.close !== beside)
            problems.push(
              `${where}: back ${topPane.back}, close ${topPane.close}`
            )
          if (spec.inspector) {
            const depths = spec.panes.map((pane) => Number(pane.depth))
            const levels = Math.max(...depths) - (rooted ? 0 : 1) + 1
            const fits =
              width >= TWO_COLUMNS && (levels < 2 || width >= 69 * REM)
            if (layouts.at(-1)!.shown !== fits)
              problems.push(`${where}: inspector shown ${!fits}`)
          }
          const stackedWidth = width - 2 * STACK_INSET
          if (width < TWO_COLUMNS && Math.abs(topPane.width - stackedWidth) > 1)
            problems.push(`${where}: top is ${topPane.width}px wide`)
        }
      }
      expect(problems.slice(0, 5)).toEqual([])
    }
  )
})

describe('a navigator without container style queries', () => {
  function Drill() {
    const [open, setOpen] = useState(true)
    return (
      <Navigator value='/a'>
        <Pane column='list'>
          <Pane.Header>
            <Pane.Title>Gigs</Pane.Title>
          </Pane.Header>
        </Pane>
        {open ? (
          <Pane>
            <Pane.Header onBack={() => setOpen(false)}>
              <Pane.Title>Tiny Ruins</Pane.Title>
            </Pane.Header>
          </Pane>
        ) : null}
      </Navigator>
    )
  }

  const frameOf = (width: number) => {
    const host = document.createElement('div')
    host.style.width = `${width}px`
    document.body.append(host)
    return host
  }

  const paneOf = (column: 'list' | 'detail') =>
    document.querySelector<HTMLElement>(
      `[data-slot="pane"][data-column="${column}"]`
    )
  const onScreen = (pane: HTMLElement | null) =>
    pane !== null && getComputedStyle(pane).visibility === 'visible'

  it('goes back from the detail to the list on a phone', async () => {
    const { getByRole } = render(<Drill />, { container: frameOf(400) })
    await expect
      .poll(() => [onScreen(paneOf('list')), onScreen(paneOf('detail'))])
      .toEqual([false, true])
    await userEvent.click(getByRole('button', { name: /back/i }))
    expect(paneOf('detail')).toBeNull()
    await expect.poll(() => onScreen(paneOf('list'))).toBe(true)
  })

  it('shows the list beside the detail, and closes it, once two fit', async () => {
    const { getByRole } = render(<Drill />, { container: frameOf(1200) })
    await expect
      .poll(() => [onScreen(paneOf('list')), onScreen(paneOf('detail'))])
      .toEqual([true, true])
    await userEvent.click(getByRole('button', { name: 'Close' }))
    expect(paneOf('detail')).toBeNull()
    await expect.poll(() => onScreen(paneOf('list'))).toBe(true)
  })
})

describe('server HTML without container style queries, before hydration', () => {
  const serve = (ui: React.ReactElement, width: number) => {
    const host = document.createElement('div')
    host.style.width = `${width}px`
    host.innerHTML = renderToString(ui)
    document.body.append(host)
    return host
  }
  const shownIn = (host: HTMLElement) =>
    Array.from(
      host.querySelectorAll<HTMLElement>('[data-slot="pane"][data-stack]')
    )
      .filter((pane) => getComputedStyle(pane).visibility === 'visible')
      .map((pane) => pane.dataset.column)

  const ListAndDetail = ({ reached }: { reached: boolean }) => (
    <Navigator value='/a'>
      <Pane column='list'>
        <button>Gigs</button>
      </Pane>
      <Pane reached={reached}>
        <button>Tiny Ruins</button>
      </Pane>
    </Navigator>
  )

  it.each([400, 1200])(
    'keeps an unreached detail off the list, at %ipx',
    (width) => {
      const host = serve(<ListAndDetail reached={false} />, width)
      expect(shownIn(host)).toEqual(['list'])
    }
  )

  it('shows only the reached detail on a phone, and the list leaves the tab order', () => {
    const host = serve(<ListAndDetail reached />, 400)
    expect(shownIn(host)).toEqual(['detail'])
    const covered = host.querySelector<HTMLButtonElement>(
      '[data-column="list"] button'
    )!
    covered.focus()
    expect(document.activeElement).not.toBe(covered)
  })

  it('puts the list on its root track beside a reached detail once two fit', () => {
    const host = serve(<ListAndDetail reached />, 1200)
    expect(shownIn(host)).toEqual(['list', 'detail'])
    const [list, detail] = Array.from(
      host.querySelectorAll<HTMLElement>('[data-slot="pane"][data-stack]'),
      (pane) => pane.getBoundingClientRect()
    )
    expect(list!.width).toBeLessThanOrEqual(24 * REM)
    expect(list!.right).toBeLessThanOrEqual(detail!.left)
  })

  it.each([400, 1200])('shows a lone unreached pane, at %ipx', (width) => {
    const host = serve(
      <Navigator value='/a'>
        <Pane reached={false}>Solo</Pane>
      </Navigator>,
      width
    )
    expect(shownIn(host)).toEqual(['detail'])
  })
})
