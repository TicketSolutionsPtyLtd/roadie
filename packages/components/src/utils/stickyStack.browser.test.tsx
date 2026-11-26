import { type CSSProperties, type ReactNode, useRef } from 'react'

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { withFrames } from '@oztix/roadie-browser-testing'

import { useStickyPart } from './stickyStack'

const TIMEOUT = { timeout: 30_000 }

afterEach(() => cleanup())

let renders = 0

/** A sticky part; at tier 1 it publishes its height for the tiers above. */
function Part(props: {
  name: string
  tier: number
  stack?: string
  height?: number
  /** Wraps the part in a box of its own, with the hook's owner staying mounted. */
  boxed?: boolean
}) {
  const { name, tier, stack = 'shows', height = 40, boxed = false } = props
  const ref = useRef<HTMLDivElement>(null)
  const top = useStickyPart(ref, {
    tier,
    stack,
    publishOn: tier === 1 ? '[data-stack]' : undefined,
    placement: boxed
  })
  renders++
  const part = (
    <div
      ref={ref}
      data-testid={name}
      style={{ position: 'sticky', top, height }}
    />
  )
  return boxed ? <Box>{part}</Box> : part
}

/** A box that scrolls; as a pane's viewport, under a 64px header. */
function Box({
  pane = false,
  children
}: {
  pane?: boolean
  children: ReactNode
}) {
  const style = {
    overflowY: 'auto',
    height: 300,
    '--pane-header-height': '64px'
  }
  return (
    <div
      data-slot={pane ? 'pane-viewport' : undefined}
      style={style as CSSProperties}
    >
      <div data-stack style={{ height: 2000 }}>
        {children}
      </div>
    </div>
  )
}

const top = (name: string) =>
  parseFloat(getComputedStyle(screen.getByTestId(name)).top)

describe('useStickyPart', () => {
  it.each([
    { pane: true, expected: 64 },
    { pane: false, expected: 0 }
  ])(
    'sticks a first tier under the pane header only in a pane (pane: $pane)',
    TIMEOUT,
    ({ pane, expected }) => {
      render(
        <Box pane={pane}>
          <Part name='toolbar' tier={1} />
        </Box>
      )
      expect(top('toolbar')).toBe(expected)
    }
  )

  it(
    'sticks a part under the lower tier in its box, following its resizes with no render',
    TIMEOUT,
    async () => {
      render(
        <Box pane>
          <Part name='toolbar' tier={1} />
          <Part name='head' tier={2} />
        </Box>
      )
      expect(top('head')).toBe(64 + 40)
      renders = 0
      screen.getByTestId('toolbar').style.height = '100px'
      await withFrames(() => expect.poll(() => top('head')).toBe(64 + 100))
      expect(renders).toBe(0)
    }
  )

  it(
    'leaves out a lower tier in another box, as when the part moves into one',
    TIMEOUT,
    () => {
      const tree = (boxed: boolean) => (
        <Box pane>
          <Part name='toolbar' tier={1} />
          <Part name='head' tier={2} boxed={boxed} />
        </Box>
      )
      const view = render(tree(false))
      expect(top('head')).toBe(64 + 40)
      view.rerender(tree(true))
      expect(top('head')).toBe(0)
    }
  )

  it(
    'keeps two stacks in one box apart, and one’s leaving clears nothing of the other’s',
    TIMEOUT,
    () => {
      const tree = (both: boolean) => (
        <Box pane>
          <Part name='first' tier={1} />
          <Part name='first-head' tier={2} />
          {both && <Part name='second' stack='venues' tier={1} height={90} />}
          {both && <Part name='second-head' stack='venues' tier={2} />}
        </Box>
      )
      const view = render(tree(true))
      expect(top('first-head')).toBe(64 + 40)
      expect(top('second-head')).toBe(64 + 90)
      view.rerender(tree(false))
      expect(top('first-head')).toBe(64 + 40)
    }
  )

  it(
    'hands a tier to the next part when the one holding it goes',
    TIMEOUT,
    () => {
      const tree = (first: boolean) => (
        <Box>
          {first && <Part name='first' tier={1} />}
          <Part name='second' tier={1} height={70} />
          <Part name='head' tier={2} />
        </Box>
      )
      const view = render(tree(true))
      expect(top('head')).toBe(40)
      view.rerender(tree(false))
      expect(top('head')).toBe(70)
    }
  )
})
