import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import { DataCard } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
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
      { label: 'Gross ticket revenue', context: 'On last week, 20 wks' },
      { label: 'GA sold vs VIP today', context: 'Ahead, similar shows' },
      { label: 'VIP sold, GA behind', context: 'GA: 1,210 of 1,610' },
      { label: 'Tickets sold', context: 'Similar shows = 100' },
      { label: 'Sell-through', context: 'VIP is 27 pts short' }
    ]
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

  it('keeps md-length label and context on one line at 292px tablet width', () => {
    const cases = [
      {
        label: 'Sell-through by ticket type overall',
        context: 'This show is ahead of 38 similar shows'
      },
      {
        label: 'Sales pace vs similar shows overall',
        context: 'GA is 1,210 sold, VIP is 232 sold'
      }
    ]
    for (const { label: labelCopy, context: contextCopy } of cases) {
      const { container, unmount } = render(
        <div style={{ width: 292 }}>
          <DataCard
            size='md'
            label={labelCopy}
            value={1842}
            context={contextCopy}
          />
        </div>
      )
      const label = container.querySelector('[data-slot=data-card-label]')!
      const context = container.querySelector('[data-slot=data-card-context]')!
      expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth)
      expect(context.scrollWidth).toBeLessThanOrEqual(context.clientWidth)
      unmount()
    }
  })

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

  it('truncates awkward copy on one line', () => {
    const { container } = render(
      <div style={{ width: 158 }}>
        <DataCard
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
})
