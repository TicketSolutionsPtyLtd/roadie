import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { _tickerState } from '../../utils/ticker'
import { Countdown, _snapshot, countdownUrgency } from './index'

const MIN = 60_000
const at = (ms: number) => new Date(Date.now() + ms)

// NumberFlow renders a <style> into the light DOM, so raw textContent is full
// of CSS. Clone, drop the style nodes, then read what a person would see.
function visualText(): string {
  const node = screen
    .getByRole('time')
    .querySelector('[aria-hidden="true"]')!
    .cloneNode(true) as HTMLElement
  node.querySelectorAll('style').forEach((n) => n.remove())
  return node.textContent!.trim()
}

describe('Countdown', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const flush = async () => act(async () => {})

  it('counts minutes coarsely while there is time', async () => {
    render(<Countdown until={at(8 * MIN)} />)
    await flush()
    expect(screen.getByText('8 minutes')).toBeInTheDocument()
  })

  it('abbreviates on request', async () => {
    render(<Countdown until={at(8 * MIN)} durationStyle='short' />)
    await flush()
    expect(screen.getByText('8m')).toBeInTheDocument()
  })

  it('switches to a clock once the deadline is close', async () => {
    render(<Countdown until={at(4 * MIN + 32_000)} />)
    await flush()
    expect(screen.getByRole('time').textContent).toContain('4')
    expect(screen.queryByText(/mins/)).not.toBeInTheDocument()
  })

  it('ticks from the start when the seconds are the point', async () => {
    render(<Countdown until={at(8 * MIN)} seconds='always' />)
    await flush()
    expect(screen.queryByText('8 mins')).not.toBeInTheDocument()
  })

  // Also the singular case: the coarse register words itself the same way
  // Duration and formatDuration do.
  it('stays coarse when asked to', async () => {
    render(<Countdown until={at(30_000)} seconds='never' />)
    await flush()
    expect(screen.getByText('1 minute')).toBeInTheDocument()
  })

  it('renders the expired label once the moment passes', async () => {
    render(<Countdown until={at(-1000)} expiredLabel='Expired' />)
    await flush()
    // Once visibly, once in the live region.
    expect(
      screen.getByRole('time').querySelector('[aria-hidden="true"]')
    ).toHaveTextContent('Expired')
  })

  it('never renders nothing, so a container is not left empty', async () => {
    const { container } = render(<Countdown until={at(-1000)} />)
    await flush()
    expect(container).not.toBeEmptyDOMElement()
    expect(screen.getByRole('time')).toHaveAttribute('dateTime', 'PT0S')
    expect(visualText().replace(/\D/g, '')).toBe('000')
  })

  it('keeps the expired state in the register it was already in', async () => {
    // A countdown that never showed seconds must not suddenly show 0:00.
    const { unmount } = render(<Countdown until={at(-1000)} seconds='never' />)
    await flush()
    expect(visualText()).toBe('0 minutes')
    expect(visualText()).not.toContain(':')
    unmount()

    // One that was ticking keeps its clock.
    render(<Countdown until={at(-1000)} seconds='always' />)
    await flush()
    expect(visualText().replace(/\D/g, '')).toBe('000')
  })

  it('keeps an explicit shape when it expires', async () => {
    render(<Countdown until={at(-1000)} display='segments' />)
    await flush()
    const text = visualText()
    expect(text).toContain('m')
    expect(text).toContain('s')
  })

  it('follows durationStyle into the expired state', async () => {
    render(
      <Countdown until={at(-1000)} seconds='never' durationStyle='short' />
    )
    await flush()
    expect(visualText()).toBe('0m')
  })

  // NaN <= 0 is false, so an unparseable target would otherwise render the live
  // path and a screen reader would hear 'NaN hours remaining'.
  it('treats an unparseable target as expired', async () => {
    const { container } = render(
      <Countdown until={new Date('')} expiredLabel='Expired' />
    )
    await flush()
    expect(visualText()).toBe('Expired')
    expect(container.textContent).not.toMatch(/NaN/)
  })

  // Without an expiredLabel the expired path falls through to the usual shape,
  // and NaN there renders nothing at all: the empty shell the component exists
  // to avoid.
  it('shows a zero, not a blank, for an unparseable target with no label', async () => {
    render(<Countdown until={new Date('')} />)
    await flush()
    expect(visualText()).toBe('0:00')

    // And the coarse register says it in words rather than a clock.
    cleanup()
    render(<Countdown until={new Date('')} seconds='never' />)
    await flush()
    expect(visualText()).toBe('0 minutes')
  })

  it('announces the expiry', async () => {
    render(<Countdown until={at(-1000)} expiredLabel='Expired' />)
    await flush()
    const live = screen.getByRole('time').querySelector('.sr-only')
    expect(live).toHaveTextContent('Expired')
  })

  it('carries an ISO duration as the machine value', async () => {
    render(<Countdown until={at(8 * MIN)} />)
    await flush()
    expect(screen.getByRole('time')).toHaveAttribute('dateTime', 'PT8M')
  })

  it('announces coarsely, never per second', async () => {
    render(<Countdown until={at(8 * MIN)} />)
    await flush()
    expect(screen.getByText('8 minutes remaining')).toHaveClass('sr-only')
  })

  it('keeps digits from reflowing as they change', async () => {
    render(<Countdown until={at(8 * MIN)} />)
    await flush()
    expect(screen.getByRole('time')).toHaveClass('tabular-nums')
  })
})

describe('Countdown display shapes', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())
  const flush = async () => act(async () => {})

  it('labels each segment with one letter, whatever the value', async () => {
    // A single letter is a suffix, not a word, so it never inflects. One of
    // everything and many of everything must read the same way.
    const one = 24 * 60 * MIN + 60 * MIN + MIN + 1000
    const { unmount } = render(<Countdown until={at(one)} seconds='always' />)
    await flush()
    expect(visualText()).toBe('1d01h01m01s')
    unmount()

    const many = 3 * 24 * 60 * MIN + 4 * 60 * MIN + 12 * MIN + 33_000
    render(<Countdown until={at(many)} seconds='always' />)
    await flush()
    expect(visualText()).toBe('3d04h12m33s')
  })

  it('breaks a long anticipation wait into days, hours, mins and secs', async () => {
    const threeDays = 3 * 24 * 60 * MIN + 4 * 60 * MIN + 12 * MIN + 33_000
    render(<Countdown until={at(threeDays)} seconds='always' />)
    await flush()
    expect(visualText()).toBe('3d04h12m33s')
  })

  it('drops the days segment once there are none', async () => {
    render(<Countdown until={at(2 * 60 * MIN)} seconds='always' />)
    await flush()
    const text = visualText()
    expect(text).toBe('2h00m00s')
    expect(text).not.toContain('d')
  })

  // The letters are decoration; the spoken value stays in full words.
  it('still announces whole words while the digits show letters', async () => {
    const threeDays = 3 * 24 * 60 * MIN + 4 * 60 * MIN + 12 * MIN + 33_000
    const { container } = render(
      <Countdown until={at(threeDays)} seconds='always' />
    )
    await flush()
    const live = container.querySelector('[aria-live]')
    expect(live?.textContent).toContain('days')
  })

  it('uses a plain clock under an hour', async () => {
    render(<Countdown until={at(4 * MIN + 32_000)} seconds='always' />)
    await flush()
    const text = visualText()
    expect(text).not.toContain('min')
    expect(text).not.toContain('sec')
  })

  it('takes an explicit shape over the automatic one', async () => {
    render(
      <Countdown
        until={at(3 * 24 * 60 * MIN)}
        seconds='always'
        display='clock'
      />
    )
    await flush()
    expect(visualText()).not.toContain('days')
  })

  it('announces days rather than thousands of minutes', async () => {
    render(<Countdown until={at(3 * 24 * 60 * MIN)} seconds='always' />)
    await flush()
    expect(screen.getByText(/3 days remaining/)).toHaveClass('sr-only')
  })
})

describe('Countdown performance', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())
  const flush = async () => act(async () => {})

  it('shares one interval across every countdown on the page', async () => {
    const { unmount } = render(
      <>
        <Countdown until={at(8 * MIN)} />
        <Countdown until={at(9 * MIN)} />
        <Countdown until={at(10 * MIN)} />
      </>
    )
    await flush()
    expect(_tickerState()).toEqual({ listeners: 3, running: true })
    unmount()
    expect(_tickerState()).toEqual({ listeners: 0, running: false })
  })

  it('bails out of a render until the displayed value actually changes', () => {
    // The snapshot is what React compares. In the coarse register it must be
    // identical for every tick inside the same minute, or the bail-out is a
    // fiction and we re-render sixty times a minute.
    const target = 8 * MIN
    const values = new Set<number>()
    for (let elapsed = 0; elapsed < 60_000; elapsed += 1000) {
      values.add(_snapshot(target, 'urgent', 5 * MIN, elapsed))
    }
    expect(values.size).toBe(1)

    // Crossing the boundary changes it exactly once.
    // An explicitly coarse countdown shows words that change once a minute, so
    // subscribing per second buys nothing and costs a render on every card.
    const coarse = new Set<number>()
    for (let elapsed = 0; elapsed < 60_000; elapsed += 1000) {
      coarse.add(_snapshot(target, 'always', 5 * MIN, elapsed, 'coarse'))
    }
    expect(coarse.size).toBe(1)

    expect(_snapshot(target, 'urgent', 5 * MIN, 60_000)).not.toBe(
      _snapshot(target, 'urgent', 5 * MIN, 0)
    )
  })

  it('moves every second once it is ticking', () => {
    const target = 4 * MIN
    const values = new Set<number>()
    for (let elapsed = 0; elapsed < 10_000; elapsed += 1000) {
      values.add(_snapshot(target, 'urgent', 5 * MIN, elapsed))
    }
    expect(values.size).toBe(10)
  })

  it('updates the DOM once a minute in the coarse register', async () => {
    render(<Countdown until={at(8 * MIN)} />)
    await flush()
    expect(screen.getByText('8 minutes')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(30_000)
    })
    expect(screen.getByText('8 minutes')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(31_000)
    })
    expect(screen.getByText('7 minutes')).toBeInTheDocument()
  })
})

describe('Countdown layout stability', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())
  const flush = async () => act(async () => {})

  // font-variant-numeric inherits, and it crosses into NumberFlow's shadow DOM,
  // so the root carrying it is what makes every digit tabular. Repeating it on
  // the inner spans would be two places to keep in step for no effect.
  it.each<[string, number, 'urgent' | 'always']>([
    ['clock', 4 * MIN + 32_000, 'urgent'],
    ['segments', 3 * 24 * 60 * MIN, 'always']
  ])(
    'sets tabular-nums once for the %s, on the root',
    async (_: string, ms: number, secs: 'urgent' | 'always') => {
      const { container } = render(<Countdown until={at(ms)} seconds={secs} />)
      await flush()
      expect(screen.getByRole('time')).toHaveClass('tabular-nums')
      expect(container.querySelectorAll('.tabular-nums')).toHaveLength(1)
    }
  )
})

describe('countdownUrgency', () => {
  const M = 60_000
  it('escalates at the thresholds the cart uses', () => {
    expect(countdownUrgency(8 * M)).toBe('success')
    expect(countdownUrgency(4 * M)).toBe('warning')
    expect(countdownUrgency(90_000)).toBe('danger')
    expect(countdownUrgency(0)).toBe('expired')
  })

  it('fails safe on nonsense rather than reading as plenty of time', () => {
    expect(countdownUrgency(NaN)).toBe('expired')
    expect(countdownUrgency(-1)).toBe('expired')
  })

  it('treats an absent value as not yet urgent', () => {
    expect(countdownUrgency(null)).toBe('success')
  })

  it('takes custom thresholds', () => {
    expect(countdownUrgency(8 * M, { warnBelowMs: 10 * M })).toBe('warning')
    expect(
      countdownUrgency(8 * M, { warnBelowMs: 10 * M, dangerBelowMs: 9 * M })
    ).toBe('danger')
  })
})
