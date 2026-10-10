import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, expect } from 'vitest'

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class IntersectionObserverMock {
  readonly root = null
  readonly rootMargin = ''
  readonly thresholds: ReadonlyArray<number> = []
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
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

// jsdom has no layout: these observers never fire and every box measures 0.
// Locking them makes a test that fakes either throw where it stubs, by a
// setter (assignment) or `Cannot redefine property` (vi.stubGlobal, vi.spyOn).
// A spy on one element or on a subclass prototype still gets through.
const NO_LAYOUT =
  'never fires or measures in jsdom. Test it in a *.browser.test.tsx.'

// Not yet moved to browser tests (INNO-1238). Never add to this list.
const FAKES_LAYOUT = [
  'Navigator/Navigator.test.tsx',
  'Navigator/NavigatorPending.test.tsx',
  'Navigator/NavigatorPrimary.test.tsx',
  'Navigator/NavigatorSecondaryPane.test.tsx',
  'Navigator/useSlidingIndicator.test.tsx',
  'Pane/Pane.test.tsx'
]

function descriptorOf(target: object | null, key: string) {
  for (let at = target; at; at = Object.getPrototypeOf(at)) {
    const descriptor = Object.getOwnPropertyDescriptor(at, key)
    if (descriptor) return descriptor
  }
}

function lock(target: object, key: string) {
  if (Object.getOwnPropertyDescriptor(target, key)?.configurable === false)
    return
  const descriptor = descriptorOf(target, key)
  if (!descriptor) return
  const { value } = descriptor
  Object.defineProperty(target, key, {
    configurable: false,
    enumerable: descriptor.enumerable,
    get: descriptor.get ?? (() => value),
    set() {
      throw new TypeError(`${key} ${NO_LAYOUT}`)
    }
  })
}

function installObservers(view: object) {
  Object.assign(view, {
    ResizeObserver: ResizeObserverMock,
    IntersectionObserver: IntersectionObserverMock
  })
}

// getComputedStyle stays unlocked: the jsdom environment deletes it on teardown.
function lockLayout() {
  // Embla reads IntersectionObserver from the document's own window.
  for (const view of new Set([globalThis, document.defaultView!])) {
    lock(view, 'ResizeObserver')
    lock(view, 'IntersectionObserver')
  }
  for (const proto of [Element.prototype, HTMLElement.prototype]) {
    for (const key of [
      'getBoundingClientRect',
      'getClientRects',
      'clientWidth',
      'clientHeight',
      'scrollWidth',
      'scrollHeight'
    ])
      lock(proto, key)
  }
  for (const key of ['offsetWidth', 'offsetHeight', 'offsetLeft', 'offsetTop'])
    lock(HTMLElement.prototype, key)
}

installObservers(globalThis)
installObservers(document.defaultView!)
const testPath = expect.getState().testPath ?? ''
if (!FAKES_LAYOUT.some((file) => testPath.endsWith(`/components/${file}`)))
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
