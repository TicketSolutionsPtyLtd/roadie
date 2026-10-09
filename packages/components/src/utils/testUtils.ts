import { type ReactElement, act } from 'react'

import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { type Mock, onTestFinished, vi } from 'vitest'

/**
 * Runs `read` with `new Date()` and `Date.now()` throwing, as a framework that
 * prerenders, like Next's `cacheComponents`, rejects a clock read in render.
 */
export function withoutClock<T>(read: () => T): T {
  const RealDate = Date
  const refuse = () => {
    throw new Error('Read the clock during render')
  }
  class NoClockDate extends RealDate {
    constructor(...args: ConstructorParameters<DateConstructor> | []) {
      if (args.length === 0) refuse()
      super(...(args as ConstructorParameters<DateConstructor>))
    }
    static override now(): number {
      return refuse()
    }
    // A Date made before the guard is still a Date.
    static [Symbol.hasInstance](value: unknown) {
      return value instanceof RealDate
    }
  }
  globalThis.Date = NoClockDate as unknown as DateConstructor
  try {
    return read()
  } finally {
    globalThis.Date = RealDate
  }
}

/** Server-renders `element` without a clock, then hydrates it. */
export async function hydrateWithoutClock(element: ReactElement): Promise<{
  container: HTMLDivElement
  serverHtml: string
  onRecoverableError: Mock
}> {
  const container = document.createElement('div')
  container.innerHTML = withoutClock(() => renderToString(element))
  const serverHtml = container.innerHTML
  document.body.append(container)
  onTestFinished(() => container.remove())
  const onRecoverableError = vi.fn()
  const root = await act(async () =>
    hydrateRoot(container, element, { onRecoverableError })
  )
  onTestFinished(() => act(() => root.unmount()))
  return { container, serverHtml, onRecoverableError }
}
