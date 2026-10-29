// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { landOn } from './landOn'

type Attached = {
  type: string
  listener: EventListenerOrEventListenerObject | null
  capture: boolean
}

let attached: Attached[]
let target: HTMLElement

const captureOf = (options?: boolean | EventListenerOptions) =>
  typeof options === 'boolean' ? options : Boolean(options?.capture)

const live = () => new Set(attached.map(({ type }) => type))

beforeEach(() => {
  vi.useFakeTimers()
  attached = []
  const add = window.addEventListener.bind(window)
  const remove = window.removeEventListener.bind(window)
  vi.spyOn(window, 'addEventListener').mockImplementation(
    (type, listener, options) => {
      attached.push({ type, listener, capture: captureOf(options) })
      add(type, listener, options)
    }
  )
  vi.spyOn(window, 'removeEventListener').mockImplementation(
    (type, listener, options) => {
      const capture = captureOf(options)
      // Matches removeEventListener: only the same type, listener and capture detach.
      attached = attached.filter(
        (entry) =>
          !(
            entry.type === type &&
            entry.listener === listener &&
            entry.capture === capture
          )
      )
      remove(type, listener, options)
    }
  )
  target = document.createElement('section')
  target.scrollIntoView = vi.fn()
  document.body.append(target)
})

afterEach(() => {
  target.remove()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('landOn', () => {
  it('leaves no timers or window listeners once a landing settles', () => {
    landOn(target, true)
    expect(target.scrollIntoView).toHaveBeenCalledOnce()
    expect(live().has('scroll')).toBe(true)
    expect(live().has('wheel')).toBe(true)

    // Past the quiet spell and the settle loop, short of the 3s cap.
    vi.advanceTimersByTime(2000)

    expect(vi.getTimerCount()).toBe(0)
    expect([...live()]).toEqual([])
  })

  it('keeps waiting while the scroll goes on, until the cap', () => {
    landOn(target, true)
    for (let at = 0; at < 3500; at += 100) {
      if (at === 2900) expect(live().has('scroll')).toBe(true)
      window.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(100)
    }
    expect(live().has('scroll')).toBe(false)

    vi.advanceTimersByTime(2000)

    expect(vi.getTimerCount()).toBe(0)
    expect([...live()]).toEqual([])
  })

  it('hands control back on user input, leaving nothing behind', () => {
    landOn(target, true)
    window.dispatchEvent(new Event('wheel'))
    // Once the quiet spell ends, a landing still in control would start settling.
    vi.advanceTimersByTime(200)

    expect(vi.getTimerCount()).toBe(0)
    expect([...live()]).toEqual([])
  })
})
