import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll } from 'vitest'

import { lockLayout } from '@oztix/roadie-browser-testing/jsdom'

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
  var __setReducedMotion: ((value: boolean) => void) | undefined
}

// Base UI calls getAnimations() from a timer that can outlive the test.
function keepGetAnimations() {
  if (typeof Element.prototype.getAnimations !== 'function') {
    Element.prototype.getAnimations = () => []
  }
}

// jsdom has no scroll implementation; production always runs in a browser.
function keepScrollTo() {
  if (typeof Element.prototype.scrollTo !== 'function') {
    Element.prototype.scrollTo = () => {}
  }
}

lockLayout()

beforeAll(() => {
  keepGetAnimations()
  keepScrollTo()

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
  keepGetAnimations()
  keepScrollTo()
  globalThis.__setReducedMotion?.(false)
})
