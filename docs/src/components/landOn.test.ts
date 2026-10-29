// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { landOn } from './landOn'

let live: Map<string, number>
let target: HTMLElement

beforeEach(() => {
  vi.useFakeTimers()
  live = new Map()
  const add = window.addEventListener.bind(window)
  const remove = window.removeEventListener.bind(window)
  vi.spyOn(window, 'addEventListener').mockImplementation((type, ...rest) => {
    live.set(type, (live.get(type) ?? 0) + 1)
    add(type, ...rest)
  })
  vi.spyOn(window, 'removeEventListener').mockImplementation(
    (type, ...rest) => {
      const count = live.get(type) ?? 0
      if (count > 1) live.set(type, count - 1)
      else live.delete(type)
      remove(type, ...rest)
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
    expect(live.has('scroll')).toBe(true)
    expect(live.has('wheel')).toBe(true)

    // Past the quiet spell and the settle loop, short of the 3s cap.
    vi.advanceTimersByTime(2000)

    expect(vi.getTimerCount()).toBe(0)
    expect([...live.keys()]).toEqual([])
  })

  it('keeps waiting while the scroll goes on, until the cap', () => {
    landOn(target, true)
    for (let at = 0; at < 3500; at += 100) {
      if (at === 2900) expect(live.has('scroll')).toBe(true)
      window.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(100)
    }
    expect(live.has('scroll')).toBe(false)

    vi.advanceTimersByTime(2000)

    expect(vi.getTimerCount()).toBe(0)
    expect([...live.keys()]).toEqual([])
  })

  it('hands control back on user input, leaving nothing behind', () => {
    landOn(target, true)
    window.dispatchEvent(new Event('wheel'))
    // Once the quiet spell ends, a landing still in control would start settling.
    vi.advanceTimersByTime(200)

    expect(vi.getTimerCount()).toBe(0)
    expect([...live.keys()]).toEqual([])
  })
})
