import { afterEach, describe, expect, it, vi } from 'vitest'

import { holdDuringLayoutTransitions } from './transitionHold'

const transition = (
  target: Element,
  type: 'transitionrun' | 'transitionend' | 'transitioncancel',
  propertyName: string
) => {
  const event = new Event(type, { bubbles: true })
  Object.defineProperty(event, 'propertyName', { value: propertyName })
  target.dispatchEvent(event)
}

describe('holdDuringLayoutTransitions', () => {
  const scope = document.createElement('nav')
  const child = scope.appendChild(document.createElement('div'))

  afterEach(() => {
    vi.useRealTimers()
  })

  it('applies at once when nothing is transitioning', () => {
    const apply = vi.fn()
    const hold = holdDuringLayoutTransitions(scope, apply)
    hold.schedule()
    expect(apply).toHaveBeenCalledOnce()
    hold.dispose()
  })

  it('holds through a layout transition and applies once when it ends', () => {
    const apply = vi.fn()
    const hold = holdDuringLayoutTransitions(scope, apply)
    transition(child, 'transitionrun', 'width')
    transition(scope, 'transitionrun', 'padding-bottom')
    hold.schedule()
    hold.schedule()
    transition(child, 'transitionend', 'width')
    expect(apply).not.toHaveBeenCalled()
    transition(scope, 'transitioncancel', 'padding-bottom')
    expect(apply).toHaveBeenCalledOnce()
    hold.dispose()
  })

  it('ignores fades and slides', () => {
    const apply = vi.fn()
    const hold = holdDuringLayoutTransitions(scope, apply)
    transition(child, 'transitionrun', 'opacity')
    transition(child, 'transitionrun', 'translate')
    hold.schedule()
    expect(apply).toHaveBeenCalledOnce()
    hold.dispose()
  })

  it('stops holding when a transition never ends', () => {
    vi.useFakeTimers()
    const apply = vi.fn()
    const hold = holdDuringLayoutTransitions(scope, apply)
    transition(child, 'transitionrun', 'width')
    hold.schedule()
    vi.advanceTimersByTime(1000)
    expect(apply).toHaveBeenCalledOnce()
    hold.schedule()
    expect(apply).toHaveBeenCalledTimes(2)
    hold.dispose()
  })
})
