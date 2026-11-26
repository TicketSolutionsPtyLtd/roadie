import { type CSSProperties, type ReactNode, useRef, useState } from 'react'

import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { withFrames } from '@oztix/roadie-browser-testing'

import { Pane } from '../components/Pane'
import {
  stuckInset,
  stuckMoved,
  useStickyPart,
  watchStuck
} from './stickyStack'

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

  it('sticks a part under a lower tier that joins later', TIMEOUT, () => {
    function Later() {
      const [shown, setShown] = useState(false)
      if (shown) return <Part name='toolbar' tier={1} />
      return <button onClick={() => setShown(true)}>Add toolbar</button>
    }
    render(
      <Box pane>
        <Later />
        <Part name='head' tier={2} />
      </Box>
    )
    expect(top('head')).toBe(64)
    act(() => screen.getByRole('button', { name: 'Add toolbar' }).click())
    expect(top('head')).toBe(64 + 40)
  })

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

/** A tier-2 frame holding a part stuck under it and the rows it covers. */
function Frame({
  head = true,
  boxed = false
}: {
  head?: boolean
  boxed?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useStickyPart(ref, { tier: 2, stack: 'shows', placement: boxed })
  const frame = (
    <div ref={ref}>
      {head && <Part name='head' tier={2} height={30} />}
      <div data-testid='rows' style={{ height: 1000 }} />
    </div>
  )
  return boxed ? <Box>{frame}</Box> : frame
}

const rows = () => screen.getByTestId('rows')

describe('stuckInset', () => {
  it.each([
    {
      name: 'the head under the toolbar and the pane header',
      head: true,
      boxed: false,
      expected: 64 + 40 + 30
    },
    {
      name: 'the toolbar without a head',
      head: false,
      boxed: false,
      expected: 64 + 40
    },
    {
      name: 'only the head in a box of its own',
      head: true,
      boxed: true,
      expected: 30
    },
    {
      name: 'nothing in a box of its own without a head',
      head: false,
      boxed: true,
      expected: 0
    }
  ])('measures $name', TIMEOUT, ({ head, boxed, expected }) => {
    render(
      <Box pane>
        <Part name='toolbar' tier={1} />
        <Part name='other' stack='venues' tier={1} height={200} />
        <Frame head={head} boxed={boxed} />
      </Box>
    )
    expect(stuckInset(rows())).toBe(expected)
  })
})

describe('watchStuck', () => {
  it(
    'tells what sits in a box when a part stuck in it moves, and nothing else',
    TIMEOUT,
    () => {
      render(
        <>
          <Box pane>
            <div data-testid='header' />
            <Frame />
          </Box>
          <Box>
            <div data-testid='elsewhere' />
          </Box>
        </>
      )
      const moves: string[] = []
      const stop = [
        watchStuck(rows(), () => moves.push('rows')),
        watchStuck(screen.getByTestId('elsewhere'), () =>
          moves.push('elsewhere')
        )
      ]
      stuckMoved(screen.getByTestId('header'))
      expect(moves).toEqual(['rows'])
      for (const unwatch of stop) unwatch()
      stuckMoved(screen.getByTestId('header'))
      expect(moves).toEqual(['rows'])
    }
  )

  it('tells what sits in a pane when its header resizes', TIMEOUT, async () => {
    render(
      <div style={{ height: 400, display: 'grid' }}>
        <Pane className='h-full'>
          <Pane.Header>
            <div data-testid='grow' style={{ height: 20 }} />
          </Pane.Header>
          <Pane.Body>
            <div data-testid='rows' />
          </Pane.Body>
        </Pane>
      </div>
    )
    let moves = 0
    const unwatch = watchStuck(rows(), () => moves++)
    screen.getByTestId('grow').style.height = '120px'
    await withFrames(() => expect.poll(() => moves).toBeGreaterThan(0))
    unwatch()
  })
})
