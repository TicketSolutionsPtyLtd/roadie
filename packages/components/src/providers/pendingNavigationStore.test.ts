import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  PENDING_CEILING,
  createPendingNavigationStore,
  watchNavigation
} from './pendingNavigationStore'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('the pending navigation store', () => {
  it('reports a click, and stops when the route lands', () => {
    const store = createPendingNavigationStore()
    expect(store.get()).toBeNull()
    store.start()
    expect(store.get()).not.toBeNull()
    store.settle()
    expect(store.get()).toBeNull()
  })

  it('tells its subscribers', () => {
    const store = createPendingNavigationStore()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    store.start()
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    store.settle()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  // useSyncExternalStore reads this every render and loops on a fresh object.
  it('hands out the same wait until it changes', () => {
    const store = createPendingNavigationStore()
    store.start()
    const first = store.get()
    store.start()
    expect(store.get()).toBe(first)
  })

  it('settles nothing when no wait is open', () => {
    const store = createPendingNavigationStore()
    store.settle()
    expect(store.get()).toBeNull()
  })

  it('takes one release per hold, however many times it is called', () => {
    const store = createPendingNavigationStore()
    store.start()
    const first = store.hold()
    const second = store.hold()
    store.settle()
    first()
    first()
    expect(store.get()).not.toBeNull()
    second()
    expect(store.get()).toBeNull()
  })

  it('drops the ceiling with the wait it belonged to', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = createPendingNavigationStore()
    store.start()
    store.settle()
    vi.advanceTimersByTime(PENDING_CEILING * 2)
    expect(warn).not.toHaveBeenCalled()
    expect(store.get()).toBeNull()
  })

  it('gives up on a pane that holds a wait for ever', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = createPendingNavigationStore()
    const release = store.hold()
    vi.advanceTimersByTime(PENDING_CEILING)
    expect(store.get()).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
    release()
    store.start()
    store.settle()
    expect(store.get()).toBeNull()
  })

  it('opens a wait of its own for a hold with nothing in flight', () => {
    const store = createPendingNavigationStore()
    const release = store.hold()
    expect(store.get()).not.toBeNull()
    release()
    expect(store.get()).toBeNull()
  })

  it('stays open past the route while a pane holds it', () => {
    const store = createPendingNavigationStore()
    store.start()
    const release = store.hold()
    store.settle()
    expect(store.get()).not.toBeNull()
    release()
    expect(store.get()).toBeNull()
  })

  it('outlasts a traversal while a pane holds it', () => {
    const store = createPendingNavigationStore()
    const release = store.hold()
    const stop = watchNavigation(store)
    window.dispatchEvent(new Event('popstate'))
    expect(store.get()).not.toBeNull()
    release()
    expect(store.get()).toBeNull()
    stop()
  })

  it('keeps the first click\u2019s clock and restarts the ceiling', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = createPendingNavigationStore()
    store.start()
    const first = store.get()
    vi.advanceTimersByTime(PENDING_CEILING - 1000)
    store.start()
    expect(store.get()?.startedAt).toBe(first?.startedAt)
    vi.advanceTimersByTime(PENDING_CEILING - 1)
    expect(store.get()).not.toBeNull()
    vi.advanceTimersByTime(1)
    expect(store.get()).toBeNull()
  })

  it('gives up at the ceiling and says so once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = createPendingNavigationStore()
    store.start()
    vi.advanceTimersByTime(PENDING_CEILING)
    expect(store.get()).toBeNull()
    store.start()
    vi.advanceTimersByTime(PENDING_CEILING)
    expect(warn).toHaveBeenCalledTimes(1)
  })
})

describe('what the window settles', () => {
  const started = () => {
    const store = createPendingNavigationStore()
    store.start()
    return store
  }

  it('ends on a history traversal', () => {
    const store = started()
    const stop = watchNavigation(store)
    window.dispatchEvent(new Event('popstate'))
    expect(store.get()).toBeNull()
    stop()
  })

  it('ends on a document leaving', () => {
    const store = started()
    const stop = watchNavigation(store)
    window.dispatchEvent(new Event('pagehide'))
    expect(store.get()).toBeNull()
    stop()
  })

  it('ends on a backgrounded tab', () => {
    const store = started()
    const stop = watchNavigation(store)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(store.get()).toBeNull()
    stop()
  })

  it('stops listening when it is torn down', () => {
    const store = started()
    watchNavigation(store)()
    window.dispatchEvent(new Event('popstate'))
    expect(store.get()).not.toBeNull()
  })

  describe('with the Navigation API', () => {
    const navigation = new EventTarget()
    const entryChange = (navigationType: string) => {
      const event = new Event('currententrychange')
      Object.assign(event, { navigationType })
      navigation.dispatchEvent(event)
    }

    beforeEach(() => {
      vi.stubGlobal('navigation', navigation)
    })
    afterEach(() => vi.unstubAllGlobals())

    it('takes a committed URL as the route landing', async () => {
      const store = started()
      const stop = watchNavigation(store)
      entryChange('push')
      await Promise.resolve()
      expect(store.get()).toBeNull()
      stop()
    })

    it('takes a traversal the same way', async () => {
      const store = started()
      const stop = watchNavigation(store)
      entryChange('traverse')
      await Promise.resolve()
      expect(store.get()).toBeNull()
      stop()
    })
  })
})
