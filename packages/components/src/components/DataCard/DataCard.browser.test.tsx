import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import { COPY_LIMITS } from '@oztix/roadie-core/dashboard-layout'

import { DataCard } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Meter } from '../Meter'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { Sparkline } from '../Sparkline'
import { StatTile } from '../StatTile'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const WIDTHS = [158, 240, 280, 343, 460]

function lines(root: HTMLElement) {
  return [
    ...root.querySelectorAll<HTMLElement>(
      'h3, [data-slot=data-card-value], p.truncate'
    )
  ]
}

describe('DataCard copy never wraps', () => {
  for (const width of WIDTHS)
    it(`stays on one line at ${width}px`, () => {
      const { container } = render(
        <div style={{ width }}>
          <DataCard
            label='Gross revenue'
            value={118400}
            format='compactCurrency'
            delta={{ value: -0.04, format: 'percent' }}
            context='On last week, before fees'
          />
        </div>
      )
      for (const line of lines(container)) {
        const height = line.getBoundingClientRect().height
        const lineHeight = Number.parseFloat(getComputedStyle(line).lineHeight)
        expect(height).toBeLessThanOrEqual(lineHeight * 1.2)
      }
      const row = container.querySelector('[data-slot=data-card-value-row]')!
      const [value, delta] = [...row.children].map((el) =>
        el.getBoundingClientRect()
      )
      expect(Math.abs(value!.bottom - delta!.bottom)).toBeLessThan(8)
    })

  it('truncates house-length copy only past its limit at phone stat width', () => {
    const { container } = render(
      <div style={{ width: 158 }}>
        <DataCard
          label='Tickets sold'
          value={1842}
          delta={{ value: 214 }}
          context='This week, of 2,400'
        />
      </div>
    )
    for (const line of lines(container))
      expect(line.scrollWidth).toBeLessThanOrEqual(line.clientWidth)
  })

  it('keeps house-length label and context on one line at 158px', () => {
    const cases = [
      { label: 'Gross ticket income', context: 'On last week, 20 wks' },
      { label: 'GA sold vs VIP now', context: 'Ahead, similar shows' },
      { label: 'VIP sold, GA behind', context: 'GA: 1,210 of 1,610' },
      { label: 'Tickets sold', context: 'Similar shows = 100' },
      { label: 'Sell-through', context: 'VIP is 27 pts short' }
    ]
    expect(Math.max(...cases.map((c) => c.label.length))).toBe(
      COPY_LIMITS.stat.label
    )
    expect(Math.max(...cases.map((c) => c.context.length))).toBe(
      COPY_LIMITS.stat.context
    )
    for (const { label: labelCopy, context: contextCopy } of cases) {
      const { container, unmount } = render(
        <div style={{ width: 158 }}>
          <DataCard label={labelCopy} value={1842} context={contextCopy} />
        </div>
      )
      const label = container.querySelector('[data-slot=data-card-label]')!
      const context = container.querySelector('[data-slot=data-card-context]')!
      expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth)
      expect(context.scrollWidth).toBeLessThanOrEqual(context.clientWidth)
      unmount()
    }
  })

  it.each([
    {
      size: 'md' as const,
      width: 292,
      cases: [
        {
          label:
            'Sell-through by each ticket type at every venue this season so far',
          context: 'Ahead of 38 similar shows, 4 weeks'
        },
        {
          label:
            'Sales pace against similar shows in the same week, before show day',
          context: 'GA is 1,210 sold, VIP is 232 sold'
        }
      ]
    },
    {
      size: 'lg' as const,
      width: 328,
      cases: [
        {
          label:
            'Top buyers by postcode, with their orders, tickets and total spend since on sale',
          context: 'Ahead of 38 similar shows, last 4 weeks'
        },
        {
          label:
            'Sell-through by each ticket type at every venue on this tour so far, by state',
          context: 'GA is 1,210 sold and VIP is 232 sold'
        }
      ]
    }
  ])(
    'keeps a $size-length label within two lines and context on one at $width px',
    ({ size, width, cases }) => {
      expect(Math.max(...cases.map((c) => c.label.length))).toBe(
        COPY_LIMITS[size].label
      )
      expect(Math.max(...cases.map((c) => c.context.length))).toBe(
        COPY_LIMITS[size].context
      )
      for (const { label: labelCopy, context: contextCopy } of cases) {
        const { container, unmount } = render(
          <div style={{ width }}>
            <DataCard
              size={size}
              label={labelCopy}
              value={1842}
              context={contextCopy}
            />
          </div>
        )
        const label = container.querySelector('[data-slot=data-card-label]')!
        const context = container.querySelector(
          '[data-slot=data-card-context]'
        )!
        expect(label.scrollHeight).toBeLessThanOrEqual(label.clientHeight)
        expect(context.scrollWidth).toBeLessThanOrEqual(context.clientWidth)
        unmount()
      }
    }
  )

  it('keeps the context line full width when actions are present', () => {
    const { container } = render(
      <div style={{ width: 343 }}>
        <DataCard
          label='Gross revenue'
          value={118400}
          format='compactCurrency'
          context='On last week, before fees'
          actions={<button type='button'>Chart</button>}
        />
      </div>
    )
    const inner = container.querySelector<HTMLElement>(
      '[data-slot=data-card-inner]'
    )!
    const context = container.querySelector<HTMLElement>(
      '[data-slot=data-card-context]'
    )!
    const innerStyle = getComputedStyle(inner)
    const innerContentWidth =
      inner.getBoundingClientRect().width -
      Number.parseFloat(innerStyle.paddingLeft) -
      Number.parseFloat(innerStyle.paddingRight)
    expect(
      Math.abs(context.getBoundingClientRect().width - innerContentWidth)
    ).toBeLessThan(1)
  })

  it('puts controls in a full-width row between the headline and the body', () => {
    const { container } = render(
      <div style={{ width: 343 }}>
        <DataCard
          label='Sales'
          value={1842}
          context='Since on sale'
          actions={<button type='button'>Chart</button>}
          controls={<button type='button'>Cumulative</button>}
        >
          <div style={{ height: 40 }} />
        </DataCard>
      </div>
    )
    const box = (slot: string) =>
      container
        .querySelector<HTMLElement>(`[data-slot=${slot}]`)!
        .getBoundingClientRect()
    const controls = box('data-card-controls')
    expect(controls.top).toBeGreaterThanOrEqual(box('data-card-context').bottom)
    expect(controls.bottom).toBeLessThanOrEqual(box('data-card-body').top)
    expect(
      Math.abs(controls.width - box('data-card-context').width)
    ).toBeLessThan(1)
  })

  it('wraps controls on a narrow card instead of overflowing it', () => {
    const { container } = render(
      <div style={{ width: 200 }}>
        <DataCard
          label='Sales'
          value={1842}
          controls={
            <>
              <button type='button' style={{ width: 120 }}>
                Cumulative
              </button>
              <button type='button' style={{ width: 120 }}>
                Incremental
              </button>
            </>
          }
        />
      </div>
    )
    const row = container.querySelector<HTMLElement>(
      '[data-slot=data-card-controls]'
    )!
    const [first, second] = row.querySelectorAll('button')
    expect(second!.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      first!.getBoundingClientRect().bottom
    )
    expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth)
  })

  it('matches a ready card height while loading', () => {
    const ready = render(
      <div style={{ width: 280 }}>
        <DataCard
          label='Sales pace'
          value={1842}
          context='This week'
          source='Oztix sales'
        >
          <div style={{ height: '32px' }} />
        </DataCard>
      </div>
    )
    const readyHeight = ready.container
      .querySelector('[data-slot=data-card]')!
      .getBoundingClientRect().height
    ready.unmount()

    const loading = render(
      <div style={{ width: 280 }}>
        <DataCard
          label='Sales pace'
          state='loading'
          bodyHeight='32px'
          source='Oztix sales'
        />
      </div>
    )
    const loadingHeight = loading.container
      .querySelector('[data-slot=data-card]')!
      .getBoundingClientRect().height
    loading.unmount()

    expect(Math.abs(readyHeight - loadingHeight)).toBeLessThan(1)
  })

  for (const width of [158, 240])
    it(`keeps an empty or failed stat tile as tall as a loading one at ${width}px`, () => {
      const heightOf = (state: 'loading' | 'empty' | 'error') => {
        const { container, unmount } = render(
          <div style={{ width }}>
            <StatTile label='Tickets sold' value={1842} state={state} />
          </div>
        )
        const height = container
          .querySelector('[data-slot=data-card]')!
          .getBoundingClientRect().height
        unmount()
        return height
      }
      const loading = heightOf('loading')
      expect(heightOf('empty')).toBeLessThanOrEqual(loading)
      expect(heightOf('error')).toBeLessThanOrEqual(loading)
    })

  for (const [size, bodyHeight] of [
    ['sm', '160px'],
    ['md', '220px']
  ] as const)
    it(`keeps an empty or failed ${size} card within its loading height`, () => {
      const measure = (state: 'loading' | 'empty' | 'error') => {
        const { container, unmount } = render(
          <div style={{ width: 343 }}>
            <DataCard
              label='Sales pace'
              size={size}
              state={state}
              bodyHeight={bodyHeight}
              errorAction={<button type='button'>Retry</button>}
            />
          </div>
        )
        const heightOf = (slot: string) =>
          container
            .querySelector(`[data-slot=${slot}]`)
            ?.getBoundingClientRect().height ?? 0
        const sizes = {
          card: heightOf('data-card'),
          body: heightOf('empty-state')
        }
        unmount()
        return sizes
      }
      const loading = measure('loading').card
      for (const state of ['empty', 'error'] as const) {
        const { card, body } = measure(state)
        expect(card).toBeLessThanOrEqual(loading)
        expect(body).toBeGreaterThanOrEqual(Number.parseFloat(bodyHeight))
      }
    })

  it('truncates awkward stat copy on one line', () => {
    const { container } = render(
      <div style={{ width: 158 }}>
        <DataCard
          size='stat'
          label='Tickets sold across every venue'
          value='$1,234,567.89'
          delta={{ value: 12 }}
          context='Onlastweekbeforefeesandcharges'
        />
      </div>
    )
    for (const line of lines(container)) {
      expect(line.getBoundingClientRect().height).toBeLessThanOrEqual(
        Number.parseFloat(getComputedStyle(line).lineHeight) * 1.2
      )
    }
  })

  it('keeps a real, visible border under forced-colors', async () => {
    const { container } = render(
      <div style={{ width: 280 }}>
        <DataCard label='Sales pace' value={1842} context='This week' />
      </div>
    )
    const card = container.querySelector<HTMLElement>('[data-slot=data-card]')!
    const style = getComputedStyle(card)
    expect(style.borderTopWidth).toBe('1px')
    expect(style.borderTopStyle).toBe('solid')

    await commands.forcedColors(true)
    try {
      const forcedStyle = getComputedStyle(card)
      expect(forcedStyle.borderTopWidth).toBe('1px')
      expect(forcedStyle.borderTopStyle).toBe('solid')
    } finally {
      await commands.forcedColors(false)
    }
  })

  it('keeps the meter track, target and sparkline end under forced-colors', async (context) => {
    const { container } = render(
      <div style={{ width: 280 }}>
        <Meter label='Sold' value={1842} max={2400} target={2000} />
        <Sparkline values={[1, 3, 2, 5, 4]} />
        <span data-probe style={{ background: 'Canvas' }} />
      </div>
    )
    const find = (selector: string) =>
      container.querySelector<HTMLElement>(selector)!

    await commands.forcedColors(true)
    try {
      if (!matchMedia('(forced-colors: active)').matches) {
        context.skip()
        return
      }
      const canvas = getComputedStyle(find('[data-probe]')).backgroundColor
      const track = getComputedStyle(find('[data-slot=meter]'))
      expect(track.outlineStyle).toBe('solid')
      expect(track.outlineWidth).toBe('1px')
      expect(track.outlineColor).not.toBe(canvas)
      for (const slot of ['meter-target', 'sparkline-end']) {
        const fill = getComputedStyle(find(`[data-slot=${slot}]`))
        expect(fill.backgroundColor).not.toBe(canvas)
      }
    } finally {
      await commands.forcedColors(false)
    }
  })
})

describe('DataCard label lines', () => {
  it.each([
    ['md', 2],
    ['stat', 1]
  ] as const)('clamps a %s label at %i line(s)', (size, lineCount) => {
    const { container } = render(
      <div style={{ width: 280 }}>
        <DataCard
          size={size}
          label='Tickets sold across every venue on the tour this season, by ticket type'
          value={1842}
        />
      </div>
    )
    const label = container.querySelector<HTMLElement>(
      '[data-slot=data-card-label]'
    )!
    const lineHeight = Number.parseFloat(getComputedStyle(label).lineHeight)
    expect(label.getBoundingClientRect().height).toBeCloseTo(
      lineHeight * lineCount,
      0
    )
  })
})
