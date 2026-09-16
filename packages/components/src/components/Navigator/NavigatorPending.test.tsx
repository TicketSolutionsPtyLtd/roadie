import type { ReactNode } from 'react'

import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Navigator } from '.'
import { RoadieLinkProvider } from '../../providers/RoadieLinkProvider'
import { Pane } from '../Pane'
import { Skeleton } from '../Skeleton'
import {
  StubLink,
  flushViewportMeasurement,
  testBrand,
  withScrollSentinels
} from './testUtils'
import { PENDING_ARM, PENDING_FADE, PENDING_MINIMUM } from './useFramePending'

withScrollSentinels()

const glow = () => document.querySelector('[data-slot="navigator-pending"]')
const frame = () => document.querySelector('[data-slot="navigator"]')!

// Every clock the indicator reads is faked, so these tests can sit on a boundary.
const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

// The minimum, then the fade: the fade is only scheduled once it leaves.
const tickOut = async () => {
  await tick(PENDING_MINIMUM)
  await tick(PENDING_FADE)
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function Shell({
  value = '/a',
  pendingIndicator,
  children
}: {
  value?: string
  pendingIndicator?: boolean
  children: ReactNode
}) {
  return (
    <RoadieLinkProvider Link={StubLink} pendingIndicator={pendingIndicator}>
      <Navigator value={value}>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='/a' href='/a'>
            Alpha
          </Navigator.Item>
          <Navigator.Item value='/b' href='/b'>
            Beta
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>{children}</Navigator.Content>
      </Navigator>
    </RoadieLinkProvider>
  )
}

const twoPanes = (
  <>
    <Pane role='list' depth={0} data-testid='list'>
      List
    </Pane>
    <Pane role='detail' depth={1} current data-testid='detail'>
      Detail
    </Pane>
  </>
)

const renderShell = async (ui: ReactNode) => {
  const result = render(ui)
  await flushViewportMeasurement()
  return result
}

// Both the vertical rail and the phone bar render the item.
const clickBeta = async () => {
  await act(async () => {
    fireEvent.click(screen.getAllByRole('link', { name: 'Beta' })[0]!)
  })
}

describe('the frame while a navigation is pending', () => {
  it('waits out the arm delay before it draws', async () => {
    await renderShell(<Shell>{twoPanes}</Shell>)
    await clickBeta()
    await tick(PENDING_ARM - 1)
    expect(glow()).toBeNull()
    await tick(1)
    expect(glow()).toHaveAttribute('aria-hidden', 'true')
  })

  it('never draws for a navigation that lands first', async () => {
    const { rerender } = await renderShell(<Shell>{twoPanes}</Shell>)
    await clickBeta()
    await tick(PENDING_ARM - 50)
    rerender(<Shell value='/b'>{twoPanes}</Shell>)
    await tick(1000)
    expect(glow()).toBeNull()
  })

  it('stays its minimum once the content lands, then goes', async () => {
    const { rerender } = await renderShell(<Shell>{twoPanes}</Shell>)
    await clickBeta()
    await tick(PENDING_ARM)
    rerender(<Shell value='/b'>{twoPanes}</Shell>)
    await tick(PENDING_MINIMUM - 100)
    expect(frame()).toHaveAttribute('data-pending', 'visible')
    await tick(100)
    expect(frame()).toHaveAttribute('data-pending', 'leaving')
    await tick(PENDING_FADE)
    expect(frame()).not.toHaveAttribute('data-pending')
    expect(glow()).toBeNull()
  })

  it('draws one indicator, whatever the row holds', async () => {
    await renderShell(
      <Shell>
        {twoPanes}
        <Pane role='inspector'>Inspector</Pane>
      </Shell>
    )
    await clickBeta()
    await tick(PENDING_ARM)
    expect(
      document.querySelectorAll('[data-slot="navigator-pending"]')
    ).toHaveLength(1)
  })

  it('marks the frame busy while it draws, and no longer', async () => {
    const { rerender } = await renderShell(<Shell>{twoPanes}</Shell>)
    await clickBeta()
    await tick(PENDING_ARM)
    expect(frame()).toHaveAttribute('aria-busy', 'true')
    rerender(<Shell value='/b'>{twoPanes}</Shell>)
    await tickOut()
    expect(frame()).not.toHaveAttribute('aria-busy')
  })

  it('draws nothing when the provider opts out', async () => {
    await renderShell(<Shell pendingIndicator={false}>{twoPanes}</Shell>)
    await clickBeta()
    await tick(PENDING_ARM + 500)
    expect(glow()).toBeNull()
  })
})

describe('what ends it', () => {
  it('a sibling swapped in under the same destination', async () => {
    const swapped = (
      <>
        <Pane role='list' depth={0}>
          List
        </Pane>
        <Pane key='second' role='detail' depth={1} current>
          Another detail
        </Pane>
      </>
    )
    const { rerender } = await renderShell(<Shell>{twoPanes}</Shell>)
    await clickBeta()
    await tick(PENDING_ARM)
    rerender(<Shell>{swapped}</Shell>)
    await tickOut()
    expect(glow()).toBeNull()
  })

  it('a history traversal', async () => {
    await renderShell(<Shell>{twoPanes}</Shell>)
    await clickBeta()
    await tick(PENDING_ARM)
    act(() => {
      window.dispatchEvent(new Event('popstate'))
    })
    await tickOut()
    expect(glow()).toBeNull()
  })

  it('the ceiling, for a navigation that never lands', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    await renderShell(<Shell>{twoPanes}</Shell>)
    await clickBeta()
    await tick(10_000)
    await tickOut()
    expect(glow()).toBeNull()
  })
})

describe('skeletons', () => {
  const skeletons = (
    <>
      <Pane role='list' depth={0}>
        List
      </Pane>
      <Pane role='detail' depth={1} current>
        <Skeleton />
      </Pane>
    </>
  )

  // A skeleton on screen is not a wait: it is as likely to be a placeholder
  // that never resolves, or a demo of the component itself.
  it('are not a wait of their own', async () => {
    const { rerender } = await renderShell(<Shell>{twoPanes}</Shell>)
    await clickBeta()
    await tick(PENDING_ARM)
    rerender(<Shell value='/b'>{skeletons}</Shell>)
    await tickOut()
    expect(glow()).toBeNull()
  })

  it('keep it up when the loading pane says it is waiting', async () => {
    const held = (
      <>
        <Pane role='list' depth={0}>
          List
        </Pane>
        <Pane role='detail' depth={1} current pending>
          <Skeleton />
        </Pane>
      </>
    )
    const { rerender } = await renderShell(<Shell>{twoPanes}</Shell>)
    await clickBeta()
    await tick(PENDING_ARM)
    rerender(<Shell value='/b'>{held}</Shell>)
    await tick(PENDING_MINIMUM + PENDING_FADE + 1000)
    expect(frame()).toHaveAttribute('data-pending', 'visible')
    rerender(<Shell value='/b'>{twoPanes}</Shell>)
    await tickOut()
    expect(glow()).toBeNull()
  })
})

describe('a pane that says it is loading', () => {
  const inPlace = (pending: boolean) => (
    <Shell>
      <Pane role='list' depth={0}>
        List
      </Pane>
      <Pane
        role='detail'
        depth={1}
        current
        pending={pending}
        data-testid='detail'
      >
        Detail
      </Pane>
    </Shell>
  )

  it('draws the indicator with no navigation at all', async () => {
    const { rerender } = await renderShell(inPlace(false))
    rerender(inPlace(true))
    await tick(PENDING_ARM)
    expect(glow()).not.toBeNull()
    expect(screen.getByTestId('detail')).toHaveAttribute('aria-busy', 'true')
  })

  it('ends it when the pane is done', async () => {
    const { rerender } = await renderShell(inPlace(true))
    await tick(PENDING_ARM)
    expect(glow()).not.toBeNull()
    rerender(inPlace(false))
    await tickOut()
    expect(glow()).toBeNull()
  })
})
