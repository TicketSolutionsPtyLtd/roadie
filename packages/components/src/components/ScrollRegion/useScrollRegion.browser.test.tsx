import { type ComponentProps, useRef } from 'react'

import { cleanup, render } from '@testing-library/react'
import axe from 'axe-core'
import { renderToString } from 'react-dom/server'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { useScrollRegion } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

function ScrollingTable({
  columns = 8,
  ...props
}: { columns?: number } & ComponentProps<'div'>) {
  const ref = useRef<HTMLDivElement>(null)
  useScrollRegion(ref)
  return (
    <div
      ref={ref}
      data-testid='scroller'
      className='is-focusable'
      style={{ overflowX: 'auto' }}
      {...props}
    >
      <table>
        <tbody>
          <tr>
            {Array.from({ length: columns }, (_, index) => (
              <td key={index} className='whitespace-nowrap'>
                Feathered Anchor Sessions
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function renderAt(ui: ComponentProps<typeof ScrollingTable>[] = [{}]) {
  return render(
    <div id='frame' style={{ width: 320 }}>
      <button type='button'>Before</button>
      <h2 id='refunds'>Refunds</h2>
      {ui.map((props, index) => (
        <ScrollingTable key={index} {...props} />
      ))}
      <button type='button'>After</button>
    </div>
  ).container
}

// Typed as a tuple so a test can name the ones it rendered.
const scrollers = (container: Element) =>
  [...container.querySelectorAll<HTMLElement>('[data-testid="scroller"]')] as [
    HTMLElement,
    HTMLElement,
    ...HTMLElement[]
  ]

async function untilRegion(scroller: HTMLElement) {
  await expect
    .poll(() => scroller.getAttribute('tabindex'), { timeout: 2_000 })
    .toBe('0')
  expect(scroller).toHaveAttribute('role', 'region')
}

describe('useScrollRegion', () => {
  it('lets a keyboard user reach and scroll a wide table outside Prose', async () => {
    const container = renderAt()
    const [scroller] = scrollers(container)
    await untilRegion(scroller)
    expect(scroller).toHaveAttribute('aria-labelledby', 'refunds')

    container.querySelector('button')!.focus()
    await userEvent.tab()
    expect(document.activeElement).toBe(scroller)
    // Playwright's WebKit scrolls on only some synthetic presses, so keep pressing.
    await expect
      .poll(
        async () => {
          await userEvent.keyboard('{ArrowRight}')
          return scroller.scrollLeft
        },
        { timeout: 5_000 }
      )
      .toBeGreaterThan(0)
  })

  it('leaves a table that fits out of the tab order, and adds it once it overflows', async () => {
    const container = renderAt([{}, { columns: 1 }])
    const [wide, fits] = scrollers(container)
    await untilRegion(wide)
    expect(fits).not.toHaveAttribute('tabindex')
    expect(fits).not.toHaveAttribute('role')

    container.querySelector<HTMLElement>('#frame')!.style.width = '3000px'
    await expect.poll(() => wide.hasAttribute('tabindex')).toBe(false)
    expect(wide).not.toHaveAttribute('aria-labelledby')

    container.querySelector<HTMLElement>('#frame')!.style.width = '320px'
    await untilRegion(wide)
  })

  it('keeps a name and tab stop the author set', async () => {
    const container = renderAt([
      { 'aria-label': 'Refund windows' },
      { tabIndex: -1 }
    ])
    const [named, unreachable] = scrollers(container)
    await untilRegion(named)
    expect(named).toHaveAttribute('aria-label', 'Refund windows')
    expect(named).not.toHaveAttribute('aria-labelledby')
    expect(unreachable).toHaveAttribute('tabindex', '-1')
    expect(unreachable).not.toHaveAttribute('role')
  })

  it('renders nothing extra on the server', () => {
    expect(renderToString(<ScrollingTable />)).not.toMatch(
      /tabindex|role=|aria-label/
    )
  })

  it('gives tables under one heading unique names that pass axe', async () => {
    const container = renderAt([{}, {}])
    const [first, second] = scrollers(container)
    await untilRegion(first)
    await untilRegion(second)
    expect(first).toHaveAttribute('aria-labelledby', 'refunds')
    expect(second).toHaveAttribute('aria-label', 'Refunds, table 2')
    const { violations } = await axe.run(container, {
      runOnly: ['scrollable-region-focusable', 'landmark-unique']
    })
    expect(violations.map(({ id }) => id)).toEqual([])
  })
})
