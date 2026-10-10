import { type ReactElement, act } from 'react'

import { cleanup, render } from '@testing-library/react'
import axe from 'axe-core'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished,
  vi
} from 'vitest'
import { userEvent } from 'vitest/browser'

import { Prose } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(
    `${roadieCss}\n* { transition: none !important }`
  )
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const CELL = '<td style="white-space: nowrap">Feathered Anchor Sessions</td>'
const wideTable = (caption = '', columns = 8) =>
  `<table>${caption && `<caption>${caption}</caption>`}<tbody><tr>${CELL.repeat(columns)}</tr></tbody></table>`
const NARROW_TABLE =
  '<table><tbody><tr><td>Main</td><td>7:30pm</td></tr></tbody></table>'

// A call, not a component: Prose only finds tables written as elements.
const wideTableElement = (id?: string) => (
  <table id={id}>
    <tbody>
      <tr>
        {Array.from({ length: 8 }, (_, index) => (
          <td key={index} className='whitespace-nowrap'>
            Feathered Anchor Sessions
          </td>
        ))}
      </tr>
    </tbody>
  </table>
)

function renderAt(ui: ReactElement, width = 320) {
  return render(
    <div id='frame' style={{ width }}>
      <button type='button'>Before</button>
      {ui}
      <button type='button'>After</button>
    </div>
  ).container
}

// Typed as a tuple so a test can name the ones it rendered.
const scrollers = (container: Element) =>
  [...container.querySelectorAll<HTMLElement>('.prose-scroll')] as [
    HTMLElement,
    HTMLElement,
    ...HTMLElement[]
  ]

const isRegion = (scroller: Element) =>
  scroller.getAttribute('tabindex') === '0' &&
  scroller.getAttribute('role') === 'region'

async function untilRegion(scroller: HTMLElement) {
  await expect.poll(() => isRegion(scroller), { timeout: 2_000 }).toBe(true)
}

async function tabFromBefore(container: Element) {
  container.querySelector<HTMLElement>('button')!.focus()
  await userEvent.tab()
  return document.activeElement
}

const nameOf = (scroller: Element) => {
  const id = scroller.getAttribute('aria-labelledby')
  return id
    ? scroller.ownerDocument.getElementById(id)?.textContent
    : scroller.getAttribute('aria-label')
}

describe('Prose tables', () => {
  it.each([
    [
      'children',
      <Prose key='prose'>
        <h2 id='set-times'>Set times</h2>
        {wideTableElement('table')}
      </Prose>
    ],
    [
      'dangerouslySetInnerHTML',
      <Prose
        key='prose'
        dangerouslySetInnerHTML={{
          __html: `<h2 id="set-times">Set times</h2>${wideTable().replace('<table>', '<table id="table">')}`
        }}
      />
    ]
  ])(
    'lets a keyboard user reach and scroll a wide table passed as %s',
    async (_, ui) => {
      const container = renderAt(ui)
      const table = container.querySelector('#table')!
      const scroller = table.parentElement!
      expect(scroller).toHaveClass('prose-scroll')
      await untilRegion(scroller)
      expect(nameOf(scroller)).toBe('Set times')

      expect(await tabFromBefore(container)).toBe(scroller)
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
    }
  )

  it('shows the is-focusable ring on a focused table', async () => {
    const container = renderAt(<Prose>{wideTableElement()}</Prose>)
    const [scroller] = scrollers(container)
    await untilRegion(scroller)
    await tabFromBefore(container)

    const ringWidth = getComputedStyle(document.documentElement)
      .getPropertyValue('--focus-ring-width')
      .trim()
    const style = getComputedStyle(scroller)
    expect(style.outlineStyle).toBe('solid')
    expect(style.outlineWidth).toBe(ringWidth)
    expect(style.outlineColor).not.toMatch(/^rgba\(0, 0, 0, 0\)$|transparent/)
  })

  it('keeps a table that fits out of the tab order', async () => {
    const container = renderAt(
      <Prose>
        {wideTableElement()}
        <table id='fits'>
          <tbody>
            <tr>
              <td>Main</td>
            </tr>
          </tbody>
        </table>
      </Prose>
    )
    const [wide, fits] = scrollers(container)
    await untilRegion(wide)
    expect(fits.contains(container.querySelector('#fits'))).toBe(true)
    expect(fits).not.toHaveAttribute('tabindex')
    expect(fits).not.toHaveAttribute('role')

    wide.focus()
    await userEvent.tab()
    expect(document.activeElement).toHaveTextContent('After')
  })

  it('adds and removes the tab stop as the table starts and stops overflowing', async () => {
    // Two columns fit once the frame is wider than the prose measure.
    const container = renderAt(
      <Prose dangerouslySetInnerHTML={{ __html: wideTable('', 2) }} />
    )
    const frame = container.querySelector<HTMLElement>('#frame')!
    const [scroller] = scrollers(container)
    await untilRegion(scroller)

    frame.style.width = '3000px'
    await expect.poll(() => scroller.hasAttribute('tabindex')).toBe(false)
    expect(scroller).not.toHaveAttribute('role')
    expect(scroller).not.toHaveAttribute('aria-label')

    frame.style.width = '320px'
    await untilRegion(scroller)
  })

  it.each([
    [
      'children',
      <Prose key='prose'>
        <div className='prose-scroll'>{wideTableElement()}</div>
      </Prose>
    ],
    [
      'dangerouslySetInnerHTML',
      <Prose
        key='prose'
        dangerouslySetInnerHTML={{
          __html: `<div class="prose-scroll">${wideTable()}</div>`
        }}
      />
    ]
  ])(
    'makes an existing .prose-scroll a region without wrapping it again, as %s',
    async (_, ui) => {
      const container = renderAt(ui)
      const all = scrollers(container)
      expect(all).toHaveLength(1)
      await untilRegion(all[0])
      expect(all[0].querySelector('table')?.parentElement).toBe(all[0])
    }
  )

  it.each([
    [
      'children',
      <Prose key='prose'>
        {wideTableElement('control')}
        <div className='not-prose'>{wideTableElement('class')}</div>
        <div data-not-prose>{wideTableElement('attribute')}</div>
      </Prose>
    ],
    [
      'dangerouslySetInnerHTML',
      <Prose
        key='prose'
        dangerouslySetInnerHTML={{
          __html: `${wideTable().replace('<table>', '<table id="control">')}
            <div class="not-prose">${wideTable().replace('<table>', '<table id="class">')}</div>
            <div data-not-prose>${wideTable().replace('<table>', '<table id="attribute">')}</div>`
        }}
      />
    ]
  ])('leaves tables in an escape alone, as %s', async (_, ui) => {
    const container = renderAt(ui)
    const control = container.querySelector('#control')!.parentElement!
    await untilRegion(control)
    expect(scrollers(container)).toEqual([control])
    expect(container.querySelector('#class')?.parentElement).toHaveClass(
      'not-prose'
    )
    expect(
      container.querySelector('#attribute')?.parentElement
    ).toHaveAttribute('data-not-prose')
  })

  it('names each table by its caption, else its heading, numbering repeats', async () => {
    const container = renderAt(
      <Prose
        dangerouslySetInnerHTML={{
          __html: `${wideTable()}${wideTable()}
            <h2>No id</h2>
            <h2 id="tiers">Tiers</h2>${wideTable()}${wideTable()}
            ${wideTable(' Ticket tiers ')}`
        }}
      />
    )
    const all = scrollers(container)
    for (const scroller of all) await untilRegion(scroller)
    expect(all.map(nameOf)).toEqual([
      'Table',
      'Table 2',
      'Tiers',
      'Tiers, table 2',
      'Ticket tiers'
    ])
  })

  it('wraps tables in HTML that changes after the first render', async () => {
    const { container, rerender } = render(
      <div style={{ width: 320 }}>
        <Prose dangerouslySetInnerHTML={{ __html: NARROW_TABLE }} />
      </div>
    )
    expect(scrollers(container)).toHaveLength(1)
    rerender(
      <div style={{ width: 320 }}>
        <Prose dangerouslySetInnerHTML={{ __html: wideTable('Set times') }} />
      </div>
    )
    await expect.poll(() => scrollers(container).length).toBe(1)
    const [scroller] = scrollers(container)
    await untilRegion(scroller)
    expect(nameOf(scroller)).toBe('Set times')
  })

  it('keeps a full-width table full width once wrapped', () => {
    const { container } = render(
      <div style={{ width: 1400 }}>
        <Prose className='[&_table]:w-full'>
          <table id='table' className='prose-bleed'>
            <tbody>
              <tr>
                <td>Main</td>
              </tr>
            </tbody>
          </table>
        </Prose>
      </div>
    )
    const prose = container.querySelector('[data-slot="prose"]')!
    expect(
      container.querySelector('#table')!.getBoundingClientRect().width
    ).toBe(prose.getBoundingClientRect().width)
  })

  it.each([
    [
      'render',
      <Prose key='prose' render={<article />}>
        {wideTableElement()}
      </Prose>,
      'ARTICLE'
    ],
    [
      'as',
      <Prose key='prose' as='section'>
        {wideTableElement()}
      </Prose>,
      'SECTION'
    ]
  ])('wraps tables when Prose renders through %s', async (_, ui, tag) => {
    const container = renderAt(ui)
    expect(container.querySelector('[data-slot="prose"]')?.tagName).toBe(tag)
    const [scroller] = scrollers(container)
    await untilRegion(scroller)
  })

  it.each([
    [
      'children',
      <div key='frame' style={{ width: 320 }}>
        <Prose>
          <h2 id='set-times'>Set times</h2>
          {wideTableElement()}
        </Prose>
      </div>
    ],
    [
      'dangerouslySetInnerHTML',
      <div key='frame' style={{ width: 320 }}>
        <Prose
          dangerouslySetInnerHTML={{
            __html: `<h2 id="set-times">Set times</h2>${wideTable()}`
          }}
        />
      </div>
    ]
  ])(
    'server-renders %s without a tab stop and hydrates without a warning',
    async (_, ui) => {
      const container = document.createElement('div')
      container.innerHTML = renderToString(ui)
      expect(container.innerHTML).not.toMatch(/tabindex|role="region"/)
      document.body.append(container)
      onTestFinished(() => container.remove())

      const consoleError = vi.spyOn(console, 'error')
      onTestFinished(() => consoleError.mockRestore())
      const onRecoverableError = vi.fn()
      const root = await act(async () =>
        hydrateRoot(container, ui, { onRecoverableError })
      )
      onTestFinished(() => act(() => root.unmount()))

      const [scroller] = scrollers(container)
      await untilRegion(scroller)
      expect(onRecoverableError).not.toHaveBeenCalled()
      expect(consoleError).not.toHaveBeenCalled()
    }
  )

  it.each([
    [
      'children',
      <Prose key='prose'>
        <h2 id='set-times'>Set times</h2>
        {wideTableElement()}
        {wideTableElement()}
        <table>
          <tbody>
            <tr>
              <td>Main</td>
            </tr>
          </tbody>
        </table>
      </Prose>
    ],
    [
      'dangerouslySetInnerHTML',
      <Prose
        key='prose'
        dangerouslySetInnerHTML={{
          __html: `${wideTable()}${wideTable()}${NARROW_TABLE}`
        }}
      />
    ]
  ])(
    'passes axe’s scrollable region and unique landmark rules, as %s',
    async (_, ui) => {
      const container = renderAt(ui)
      const [first, second] = scrollers(container)
      await untilRegion(first)
      await untilRegion(second)
      const { violations } = await axe.run(container, {
        runOnly: ['scrollable-region-focusable', 'landmark-unique']
      })
      expect(violations.map(({ id }) => id)).toEqual([])
    }
  )
})
