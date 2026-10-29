import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll } from 'vitest'

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom has no media queries; nothing matches, as on a narrow screen.
function matchNothing(query: string) {
  return {
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false
  } as unknown as MediaQueryList
}

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver =
      ResizeObserverMock as unknown as typeof ResizeObserver
  }
  if (typeof window.matchMedia === 'undefined') window.matchMedia = matchNothing
})

afterEach(() => {
  cleanup()
})
