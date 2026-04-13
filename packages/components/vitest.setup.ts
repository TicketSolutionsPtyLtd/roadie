import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll } from 'vitest'

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

type MediaListener = (event: MediaQueryListEvent) => void

type MediaListEntry = {
  matches: boolean
  listeners: Set<MediaListener>
}

const mediaLists = new Map<string, MediaListEntry>()

function getMediaList(query: string): MediaListEntry {
  let entry = mediaLists.get(query)
  if (!entry) {
    entry = { matches: false, listeners: new Set() }
    mediaLists.set(query, entry)
  }
  return entry
}

declare global {
  // eslint-disable-next-line no-var
  var __setReducedMotion: ((value: boolean) => void) | undefined
}

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver =
      ResizeObserverMock as unknown as typeof ResizeObserver
  }

  // jsdom reports 0 for every layout property. Embla measures slides during
  // init and never progresses past "not ready" without non-zero dimensions.
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get() {
      return 800
    }
  })
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get() {
      return 600
    }
  })
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return 800
    }
  })
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return 600
    }
  })

  if (typeof window.matchMedia === 'undefined') {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => {
        const entry = getMediaList(query)
        return {
          get matches() {
            return entry.matches
          },
          media: query,
          onchange: null,
          addEventListener: (_type: 'change', listener: MediaListener) =>
            entry.listeners.add(listener),
          removeEventListener: (_type: 'change', listener: MediaListener) =>
            entry.listeners.delete(listener),
          addListener: (listener: MediaListener) =>
            entry.listeners.add(listener),
          removeListener: (listener: MediaListener) =>
            entry.listeners.delete(listener),
          dispatchEvent: () => true
        }
      }
    })
  }

  globalThis.__setReducedMotion = (value: boolean) => {
    const entry = getMediaList('(prefers-reduced-motion: reduce)')
    entry.matches = value
    const event = {
      matches: value,
      media: '(prefers-reduced-motion: reduce)'
    } as MediaQueryListEvent
    entry.listeners.forEach((listener) => listener(event))
  }
})

afterEach(() => {
  cleanup()
  globalThis.__setReducedMotion?.(false)
})
