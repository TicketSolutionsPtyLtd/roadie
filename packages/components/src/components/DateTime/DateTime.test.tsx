import { act, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { hydrateWithoutClock, withoutClock } from '../../utils/testUtils'
import { _tickerState } from '../../utils/ticker'
import { DateTime, type DateTimeProps } from './index'

// Consumers extend and wrap the props, so they must stay one interface.
export interface ExtendedDateTimeProps extends DateTimeProps {
  label?: string
}
export const VenueDateTime = (props: Omit<DateTimeProps, 'timeZone'>) => (
  <DateTime timeZone='Australia/Brisbane' {...props} />
)

const BNE = 'Australia/Brisbane'
// Fri 27 Nov 2026, 7:30pm Brisbane
const at = new Date('2026-11-27T09:30:00Z')

describe('DateTime', () => {
  // One interval between every relative timestamp on the page, not one each,
  // and none at all once the text is a fixed date past the cutoff.
  it('shares one ticker across relative timestamps and starts none otherwise', () => {
    expect(_tickerState().listeners).toBe(0)

    const recent = new Date(Date.now() - 3 * 60_000)
    const { unmount } = render(
      <>
        <DateTime at={recent} timeZone={BNE} relative />
        <DateTime at={recent} timeZone={BNE} relative />
        <DateTime at={recent} timeZone={BNE} />
      </>
    )
    // Two subscribers, one timer; the non-relative one subscribes to nothing.
    expect(_tickerState().listeners).toBe(2)
    expect(_tickerState().running).toBe(true)

    unmount()
    expect(_tickerState().listeners).toBe(0)
    expect(_tickerState().running).toBe(false)
  })

  // The old effect stored the text in state, so a reused row kept the previous
  // moment's words until the effect ran after paint.
  it('never pairs a new moment with the previous one\u2019s relative text', () => {
    const { rerender, container } = render(
      <DateTime
        at={new Date(Date.now() - 3 * 60_000)}
        timeZone={BNE}
        relative
      />
    )
    expect(container.textContent).toMatch(/3 minutes ago|Nov/)

    rerender(
      <DateTime
        at={new Date(Date.now() - 5 * 60 * 60_000)}
        timeZone={BNE}
        relative
      />
    )
    expect(container.textContent).not.toMatch(/3 minutes ago/)
  })

  it('renders a time element with the default style', () => {
    render(<DateTime at={at} timeZone={BNE} />)
    expect(screen.getByText('Fri 27 Nov 2026').tagName).toBe('TIME')
  })

  it('carries a machine value with the zone offset when a time is shown', () => {
    render(<DateTime at={at} timeZone={BNE} timeStyle='medium' />)
    const el = screen.getByText('Fri 27 Nov 2026, 7:30pm')
    expect(el).toHaveAttribute('dateTime', '2026-11-27T19:30:00+10:00')
    // The attribute must identify the same instant, not a floating local time.
    expect(new Date(el.getAttribute('dateTime')!).getTime()).toBe(at.getTime())
  })

  it('uses a zoneless date when no time is shown', () => {
    render(<DateTime at={at} timeZone={BNE} />)
    expect(screen.getByText('Fri 27 Nov 2026')).toHaveAttribute(
      'dateTime',
      '2026-11-27'
    )
  })

  it('renders the same instant differently per venue zone', () => {
    const { rerender } = render(
      <DateTime at={at} timeZone='Australia/Perth' timeStyle='medium' />
    )
    expect(screen.getByText('Fri 27 Nov 2026, 5:30pm')).toBeInTheDocument()
    rerender(<DateTime at={at} timeZone={BNE} timeStyle='medium' />)
    expect(screen.getByText('Fri 27 Nov 2026, 7:30pm')).toBeInTheDocument()
  })

  it('passes through element props', () => {
    render(<DateTime at={at} timeZone={BNE} className='text-subtle' />)
    expect(screen.getByText('Fri 27 Nov 2026')).toHaveClass('text-subtle')
  })

  it('renders nothing rather than "Invalid Date"', () => {
    const { container } = render(
      <DateTime at={new Date('nope')} timeZone={BNE} />
    )
    expect(container).toBeEmptyDOMElement()
  })
})

describe('DateTime relative', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('renders the absolute first, then swaps after mount', async () => {
    vi.setSystemTime(new Date('2026-11-27T09:33:00Z')) // 3 minutes later
    render(<DateTime at={at} timeZone={BNE} relative />)
    // The effect runs on mount; flush it.
    await act(async () => {})
    expect(screen.getByText('3 minutes ago')).toBeInTheDocument()
  })

  it('keeps the absolute reachable in title', async () => {
    vi.setSystemTime(new Date('2026-11-27T09:33:00Z'))
    render(<DateTime at={at} timeZone={BNE} relative />)
    await act(async () => {})
    expect(screen.getByText('3 minutes ago')).toHaveAttribute(
      'title',
      'Fri 27 Nov 2026'
    )
  })

  it('re-renders on a timer so it does not go stale', async () => {
    vi.setSystemTime(new Date('2026-11-27T09:31:00Z'))
    render(<DateTime at={at} timeZone={BNE} relative />)
    await act(async () => {})
    expect(screen.getByText('1 minute ago')).toBeInTheDocument()

    await act(async () => {
      // advanceTimersByTime moves the fake clock too, so stop 30s short.
      vi.setSystemTime(new Date('2026-11-27T09:39:30Z'))
      vi.advanceTimersByTime(30_000)
    })
    expect(screen.getByText('10 minutes ago')).toBeInTheDocument()
  })

  it('drops the title once the text is already absolute', async () => {
    vi.setSystemTime(new Date('2026-12-27T09:30:00Z')) // a month later
    render(<DateTime at={at} timeZone={BNE} relative />)
    await act(async () => {})
    const el = screen.getByText('Fri 27 Nov 2026')
    expect(el).not.toHaveAttribute('title')
  })
})

describe('DateTime render', () => {
  it('renders a time element by default', () => {
    render(<DateTime at={at} timeZone={BNE} />)
    expect(screen.getByText('Fri 27 Nov 2026').tagName).toBe('TIME')
  })

  it('swaps the element via the element form', () => {
    const { container } = render(
      <DateTime at={at} timeZone={BNE} render={<span />} />
    )
    expect(container.querySelector('span')).toHaveTextContent('Fri 27 Nov 2026')
  })

  it('renders an SVG text node for a chart axis, without the attribute', () => {
    const { container } = render(
      <svg>
        <DateTime
          at={at}
          timeZone={BNE}
          dateStyle='short'
          timeStyle='numeric'
          render={({ dateTime: _drop, ...rest }) => <text {...rest} />}
        />
      </svg>
    )
    const node = container.querySelector('text')
    expect(node!.textContent).toBe('27 Nov 19:30')
    expect(node).not.toHaveAttribute('dateTime')
  })
})

describe('DateTime as a range', () => {
  const to = new Date('2026-11-29T12:00:00Z') // Sun 29 Nov

  it('renders one time element per end, each machine-readable', () => {
    const { container } = render(<DateTime at={at} to={to} timeZone={BNE} />)
    const times = [...container.querySelectorAll('time')]
    expect(times).toHaveLength(2)
    expect(times[0]).toHaveAttribute('dateTime', '2026-11-27')
    expect(times[1]).toHaveAttribute('dateTime', '2026-11-29')
  })

  it('joins with the word to, never a dash', () => {
    const { container } = render(<DateTime at={at} to={to} timeZone={BNE} />)
    expect(container.textContent).toBe('Fri 27 to Sun 29 Nov 2026')
    expect(container.textContent).not.toContain('–')
  })

  it('rides the year on the later end, so the ends are not independent', () => {
    const { container } = render(<DateTime at={at} to={to} timeZone={BNE} />)
    const times = [...container.querySelectorAll('time')]
    expect(times[0]).toHaveTextContent('Fri 27')
    expect(times[1]).toHaveTextContent('Sun 29 Nov 2026')
  })

  it('collapses to a single element when both ends are the same day', () => {
    const { container } = render(
      <DateTime at={at} to={new Date('2026-11-27T13:00:00Z')} timeZone={BNE} />
    )
    expect(container.querySelectorAll('time')).toHaveLength(1)
    expect(container.textContent).toBe('Fri 27 Nov 2026')
  })

  it('appends the day count with a middot when asked', () => {
    const { container } = render(
      <DateTime at={at} to={to} timeZone={BNE} showDuration />
    )
    expect(container.textContent).toBe('Fri 27 to Sun 29 Nov 2026 · 3 days')
  })

  it('counts nights, not elapsed hours', () => {
    const { container } = render(
      <DateTime
        at={new Date('2026-11-27T12:00:00Z')}
        to={new Date('2026-11-27T17:00:00Z')}
        timeZone={BNE}
        showDuration
      />
    )
    expect(container.textContent).not.toContain('days')
  })

  it('takes any date style', () => {
    const { container } = render(
      <DateTime at={at} to={to} timeZone={BNE} dateStyle='medium' />
    )
    expect(container.textContent).toBe('27 to 29 Nov 2026')
  })
})

describe('DateTime across midnight', () => {
  const start = new Date('2026-11-28T12:00:00Z') // Sat 28 Nov, 10:00pm BNE
  const end = new Date('2026-11-28T17:00:00Z') // Sun 29 Nov, 3:00am BNE

  it('says the date once and the end as a bare time', () => {
    const { container } = render(
      <DateTime
        at={start}
        to={end}
        timeZone={BNE}
        timeStyle='medium'
        sameNight
      />
    )
    expect(container.textContent).toBe('Sat 28 Nov 2026, 10:00pm to 3:00am')
    expect(container.textContent).not.toContain('29 Nov')
  })

  it('still carries the real end instant in the markup', () => {
    const { container } = render(
      <DateTime
        at={start}
        to={end}
        timeZone={BNE}
        timeStyle='medium'
        sameNight
      />
    )
    const times = [...container.querySelectorAll('time')]
    expect(times).toHaveLength(2)
    expect(times[1]).toHaveAttribute('dateTime', '2026-11-29T03:00:00+10:00')
    // The visible text says 3:00am; the machine value says which 3am.
    expect(new Date(times[1]!.getAttribute('dateTime')!).getTime()).toBe(
      end.getTime()
    )
  })

  it('shows both dates when it is genuinely multi-day', () => {
    const { container } = render(
      <DateTime
        at={start}
        to={new Date('2026-11-30T12:00:00Z')}
        timeZone={BNE}
        timeStyle='medium'
      />
    )
    expect(container.textContent).toContain('Mon 30 Nov')
  })

  it('is ignored without a time, since there is no range to collapse', () => {
    const { container } = render(
      <DateTime at={start} to={end} timeZone={BNE} sameNight />
    )
    // Falls through to the normal range path.
    expect(container.textContent).toContain('29 Nov')
  })
})

describe('DateTime stacked', () => {
  const lines = (time: Element) =>
    [...time.children].map((line) => line.textContent)

  it('puts the time under the date in one element carrying the instant', () => {
    const { container } = render(
      <DateTime at={at} timeZone={BNE} timeStyle='medium' stacked />
    )
    const times = container.querySelectorAll('time')
    expect(times).toHaveLength(1)
    expect(times[0]).toHaveAttribute('dateTime', '2026-11-27T19:30:00+10:00')
    expect(lines(times[0]!)).toEqual(['Fri 27 Nov 2026, ', '7:30pm'])
  })

  it('reads the same as the inline text, not the date run into the time', () => {
    const { container: inline } = render(
      <DateTime at={at} timeZone={BNE} timeStyle='medium' />
    )
    const { container } = render(
      <DateTime at={at} timeZone={BNE} timeStyle='medium' stacked />
    )
    expect(container.textContent).toBe(inline.textContent)
    expect(container.querySelector('.sr-only')).toHaveTextContent(',')
  })

  it('keeps each style meaning what it means inline', () => {
    const { container } = render(
      <DateTime
        at={at}
        timeZone={BNE}
        dateStyle='medium'
        timeStyle='long'
        stacked
      />
    )
    expect(lines(container.querySelector('time')!)).toEqual([
      '27 Nov 2026, ',
      '7:30pm AEST'
    ])
  })

  it('merges a caller’s class with the stacking', () => {
    render(
      <DateTime
        at={at}
        timeZone={BNE}
        timeStyle='medium'
        stacked
        className='text-sm'
      />
    )
    expect(screen.getByText('7:30pm').closest('time')).toHaveClass(
      'grid',
      'text-sm'
    )
  })

  it('says the date once over a time range on one day', () => {
    const { container } = render(
      <DateTime
        at={at}
        to={new Date('2026-11-27T13:00:00Z')}
        timeZone={BNE}
        timeStyle='medium'
        stacked
      />
    )
    const times = [...container.querySelectorAll('time')]
    expect(lines(container.firstElementChild!)).toEqual([
      'Fri 27 Nov 2026, ',
      '7:30pm to 11:00pm'
    ])
    expect(times.map((time) => time.getAttribute('dateTime'))).toEqual([
      '2026-11-27T19:30:00+10:00',
      '2026-11-27T23:00:00+10:00'
    ])
  })

  it('says the date once over one night crossing midnight', () => {
    const { container } = render(
      <DateTime
        at={new Date('2026-11-28T12:00:00Z')}
        to={new Date('2026-11-28T17:00:00Z')}
        timeZone={BNE}
        timeStyle='medium'
        sameNight
        stacked
      />
    )
    expect(lines(container.firstElementChild!)).toEqual([
      'Sat 28 Nov 2026, ',
      '10:00pm to 3:00am'
    ])
    expect(container.querySelectorAll('time')[1]).toHaveAttribute(
      'dateTime',
      '2026-11-29T03:00:00+10:00'
    )
  })

  it('stays inline across days, where one date can’t head both times', () => {
    const to = new Date('2026-11-29T12:00:00Z')
    const { container: inline } = render(
      <DateTime at={at} to={to} timeZone={BNE} timeStyle='medium' />
    )
    const { container } = render(
      <DateTime at={at} to={to} timeZone={BNE} timeStyle='medium' stacked />
    )
    expect(container.innerHTML).toBe(inline.innerHTML)
  })

  it('collapses a range ending at the same time to one stacked moment', () => {
    const { container } = render(
      <DateTime at={at} to={at} timeZone={BNE} timeStyle='medium' stacked />
    )
    expect(container.querySelectorAll('time')).toHaveLength(1)
    expect(container.textContent).toBe('Fri 27 Nov 2026, 7:30pm')
  })

  it('stays a date alone without a time to put under it', () => {
    const { container: inline } = render(<DateTime at={at} timeZone={BNE} />)
    const { container } = render(<DateTime at={at} timeZone={BNE} stacked />)
    expect(container.innerHTML).toBe(inline.innerHTML)
  })

  it('stays one relative phrase, with no date to stack', () => {
    const recent = new Date(Date.now() - 3 * 60_000)
    const { container: inline } = render(
      <DateTime at={recent} timeZone={BNE} timeStyle='short' relative />
    )
    const { container } = render(
      <DateTime at={recent} timeZone={BNE} timeStyle='short' stacked relative />
    )
    expect(container.innerHTML).toBe(inline.innerHTML)
    expect(container.textContent).toBe('3 minutes ago')
  })
})

describe('DateTime on a prerendering server', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-09T00:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it.each([
    ['a date', <DateTime key='a' at={at} timeZone={BNE} />],
    ['a time', <DateTime key='a' at={at} timeZone={BNE} timeStyle='long' />],
    [
      'a range',
      <DateTime
        key='a'
        at={at}
        to={new Date('2026-11-29T09:30:00Z')}
        timeZone={BNE}
        showDuration
      />
    ],
    [
      'one night',
      <DateTime
        key='a'
        at={at}
        to={new Date('2026-11-27T15:00:00Z')}
        timeZone={BNE}
        timeStyle='medium'
        sameNight
      />
    ],
    ['a relative time', <DateTime key='a' at={at} timeZone={BNE} relative />],
    [
      'a standalone date',
      <DateTime key='a' at={at} timeZone={BNE} context='standalone' />
    ]
  ])('renders %s without reading the clock', (_, element) => {
    expect(() => withoutClock(() => renderToString(element))).not.toThrow()
  })

  it('hydrates a list date unchanged', async () => {
    const { container, onRecoverableError } = await hydrateWithoutClock(
      <DateTime at={at} timeZone={BNE} />
    )
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(container).toHaveTextContent('Fri 27 Nov 2026')
  })

  // The server can't know this year, so it keeps the year, never ambiguous.
  it('hydrates a standalone date with its year, then drops this year', async () => {
    const { container, serverHtml, onRecoverableError } =
      await hydrateWithoutClock(
        <DateTime at={at} timeZone={BNE} context='standalone' />
      )
    expect(serverHtml).toContain('Fri 27 Nov 2026')
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(container.textContent).toBe('Fri 27 Nov')
  })

  it('hydrates a standalone range with its year, then drops this year', async () => {
    const { container, serverHtml, onRecoverableError } =
      await hydrateWithoutClock(
        <DateTime
          at={at}
          to={new Date('2026-11-29T09:30:00Z')}
          timeZone={BNE}
          context='standalone'
        />
      )
    expect(serverHtml).toContain('2026')
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(container.textContent).toBe('Fri 27 to Sun 29 Nov')
  })

  it('keeps the year of a standalone date in another year', async () => {
    const { container, onRecoverableError } = await hydrateWithoutClock(
      <DateTime
        at={new Date('2025-11-27T09:30:00Z')}
        timeZone={BNE}
        context='standalone'
      />
    )
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(container.textContent).toBe('Thu 27 Nov 2025')
  })

  it('renders a standalone date on the client without the year at once', () => {
    render(<DateTime at={at} timeZone={BNE} context='standalone' />)
    expect(screen.getByText('Fri 27 Nov')).toBeInTheDocument()
  })
})
