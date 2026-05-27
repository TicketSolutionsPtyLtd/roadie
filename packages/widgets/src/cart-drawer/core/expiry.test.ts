import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createExpiryWatcher } from './expiry'

describe('createExpiryWatcher', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('fires onExpire once when the expiry passes', () => {
    const base = Date.parse('2026-06-15T00:00:00Z')
    let clock = base
    const onExpire = vi.fn()
    const watcher = createExpiryWatcher(
      '2026-06-15T00:00:05Z',
      onExpire,
      1000,
      () => clock
    )
    expect(onExpire).not.toHaveBeenCalled() // 5s left at start

    clock = base + 6000 // now past expiry
    vi.advanceTimersByTime(1000) // one poll
    expect(onExpire).toHaveBeenCalledTimes(1)

    // Subsequent polls must not re-fire (once-latch).
    vi.advanceTimersByTime(3000)
    expect(onExpire).toHaveBeenCalledTimes(1)
    watcher.stop()
  })

  it('fires immediately when already expired', () => {
    const onExpire = vi.fn()
    const now = Date.parse('2026-06-15T01:00:00Z')
    const watcher = createExpiryWatcher(
      '2026-06-15T00:00:00Z',
      onExpire,
      1000,
      () => now
    )
    expect(onExpire).toHaveBeenCalledTimes(1)
    watcher.stop()
  })

  it('stop() halts polling', () => {
    const base = Date.parse('2026-06-15T00:00:00Z')
    let clock = base
    const onExpire = vi.fn()
    const watcher = createExpiryWatcher(
      '2026-06-15T00:00:05Z',
      onExpire,
      1000,
      () => clock
    )
    watcher.stop()
    clock = base + 60000
    vi.advanceTimersByTime(10000)
    expect(onExpire).not.toHaveBeenCalled()
  })
})
